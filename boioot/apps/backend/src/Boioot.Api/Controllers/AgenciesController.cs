using Boioot.Application.Features.Agencies.DTOs;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

/// <summary>
/// Public endpoints — no authentication required except POST /{id}/ratings.
///
/// GET /api/agencies          — paged list of active Broker/Office users (with AgencyProfile merged if exists)
/// GET /api/agencies/cities   — distinct cities of active Broker/Office users (from profiles, ignoring IsVisible)
/// GET /api/agencies/{id}     — single agency detail (accessible if user is active, profile optional)
/// GET /api/agencies/{id}/ratings  — paginated ratings for an agency
/// POST /api/agencies/{id}/ratings — create or update the caller's rating (auth required)
///
/// Visibility rules:
///   - A user appears if IsActive + not deleted AND (no AgencyProfile OR AgencyProfile.IsVisible == true)
///   - Admin can hide a user by setting AgencyProfile.IsVisible = false via PUT /api/admin/agencies/{id}
///
/// Verification badge rules (point 5):
///   - isVerified is ALWAYS derived from User.VerificationStatus
///     (true when VerificationStatus == Verified || PartiallyVerified)
///   - The badge label is auto-generated from role (Office→"مكتب موثوق" / Broker→"وسيط موثوق")
///     or overridden by the admin-set VerificationBadge text.
/// </summary>
[Route("api/agencies")]
public class AgenciesController : BaseController
{
    private readonly BoiootDbContext _ctx;

    public AgenciesController(BoiootDbContext ctx) => _ctx = ctx;

    // ── Ensure tables exist (idempotent) ─────────────────────────────────────

    private Task EnsureTableAsync(CancellationToken ct) =>
        _ctx.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""AgencyProfiles"" (
                ""UserId""        TEXT    NOT NULL,
                ""BusinessName""  TEXT,
                ""Bio""           TEXT,
                ""City""          TEXT,
                ""Province""      TEXT,
                ""LogoUrl""       TEXT,
                ""ContactNumber"" TEXT,
                ""WhatsappLink""  TEXT,
                ""Address""       TEXT,
                ""WebsiteUrl""    TEXT,
                ""IsVisible""     BOOLEAN NOT NULL DEFAULT false,
                ""IsFeatured""    BOOLEAN NOT NULL DEFAULT false,
                ""SortOrder""     INTEGER NOT NULL DEFAULT 0,
                ""UpdatedAt""     TIMESTAMP WITH TIME ZONE,
                CONSTRAINT ""PK_AgencyProfiles"" PRIMARY KEY (""UserId"")
            );
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""BusinessName""  TEXT;
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""Province""      TEXT;
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""ContactNumber"" TEXT;
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""WhatsappLink""  TEXT;
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""Address""       TEXT;
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""WebsiteUrl""    TEXT;
        ", ct);

    private Task EnsureRatingsTableAsync(CancellationToken ct) =>
        _ctx.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""AgencyRatings"" (
                ""Id""         UUID    NOT NULL DEFAULT gen_random_uuid(),
                ""AgencyId""   TEXT    NOT NULL,
                ""ReviewerId"" TEXT    NOT NULL,
                ""Rating""     INTEGER NOT NULL CHECK (""Rating"" BETWEEN 1 AND 5),
                ""Comment""    TEXT,
                ""CreatedAt""  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                ""UpdatedAt""  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                CONSTRAINT ""PK_AgencyRatings"" PRIMARY KEY (""Id""),
                CONSTRAINT ""UQ_AgencyRatings_Agency_Reviewer"" UNIQUE (""AgencyId"", ""ReviewerId"")
            );", ct);

    // ── Helper: batch-fetch rating aggregates for a set of agency IDs ─────────

    private async Task<Dictionary<string, (decimal avg, int count)>> GetRatingAggregatesAsync(
        List<string> agencyIds, CancellationToken ct)
    {
        var result = new Dictionary<string, (decimal avg, int count)>();
        if (agencyIds.Count == 0) return result;

        var conn = _ctx.Database.GetDbConnection();
        var shouldClose = conn.State != System.Data.ConnectionState.Open;
        if (shouldClose) await conn.OpenAsync(ct);
        try
        {
            using var cmd = conn.CreateCommand();
            var inClause = string.Join(", ",
                agencyIds.Select(id => $"'{id.Replace("'", "''")}'"));
            cmd.CommandText = $@"
                SELECT ""AgencyId"",
                       ROUND(AVG(""Rating"")::numeric, 1),
                       COUNT(*)::int
                FROM   ""AgencyRatings""
                WHERE  ""AgencyId"" IN ({inClause})
                GROUP  BY ""AgencyId""";

            using var reader = await cmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
            {
                var agencyId = reader.GetString(0);
                var avg      = reader.IsDBNull(1) ? 0m : reader.GetDecimal(1);
                var count    = reader.GetInt32(2);
                result[agencyId] = (avg, count);
            }
            return result;
        }
        finally
        {
            if (shouldClose) await conn.CloseAsync();
        }
    }

    // ── GET /api/agencies/cities ──────────────────────────────────────────────
    // Literal route takes precedence over {id} parameterised route.
    // Returns distinct cities from AgencyProfiles of active Broker/Office users.
    // IsVisible is intentionally NOT filtered here — all profile cities appear
    // so the dropdown is populated even for temporarily-hidden profiles.

    [HttpGet("cities")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAgencyCities(CancellationToken ct)
    {
        await EnsureTableAsync(ct);

        var allowedRoles = new[] { UserRole.Broker, UserRole.Office };

        // Get cities from AgencyProfiles joined to active Broker/Office users.
        // No IsVisible filter — any profile with a city contributes to the list.
        var usedCities = await _ctx.Users
            .Where(u => allowedRoles.Contains(u.Role) && u.IsActive && !u.IsDeleted)
            .Join(_ctx.AgencyProfiles,
                  u  => u.Id.ToString(),
                  ap => ap.UserId,
                  (u, ap) => ap)
            .Where(ap => ap.City != null && ap.City != "")
            .Select(ap => ap.City!)
            .Distinct()
            .ToListAsync(ct);

        var locationMap = await _ctx.LocationCities
            .Where(lc => lc.IsActive && usedCities.Contains(lc.Name))
            .Select(lc => new { lc.Name, lc.Province })
            .ToListAsync(ct);

        var items = usedCities
            .Select(city => new AgencyCityItem(
                city,
                locationMap.FirstOrDefault(lc => lc.Name == city)?.Province ?? ""))
            .OrderBy(x => x.Province)
            .ThenBy(x => x.City)
            .ToList();

        return Ok(items);
    }

    // ── GET /api/agencies ─────────────────────────────────────────────────────
    // Returns all active Broker/Office users.
    // AgencyProfile is LEFT JOIN — users without a profile are included.
    // A user is hidden only if they HAVE a profile with IsVisible=false
    // (admin explicitly hid them). Users without any profile default to visible.

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? city,
        [FromQuery] string? province,
        [FromQuery] string? type,
        [FromQuery] bool?   isVerified,
        [FromQuery] bool?   isFeatured,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 12,
        CancellationToken ct = default)
    {
        await EnsureTableAsync(ct);
        await EnsureRatingsTableAsync(ct);

        // Pre-load province cities when province is given but city is not
        List<string>? provinceCities = null;
        if (string.IsNullOrWhiteSpace(city) && !string.IsNullOrWhiteSpace(province))
        {
            provinceCities = await _ctx.LocationCities
                .Where(lc => lc.Province == province && lc.IsActive)
                .Select(lc => lc.Name)
                .ToListAsync(ct);
        }

        var allowedRoles = new[] { UserRole.Broker, UserRole.Office, UserRole.CompanyOwner };

        // LEFT JOIN: include users even if they have no AgencyProfile
        var query = _ctx.Users
            .Where(u => allowedRoles.Contains(u.Role) && u.IsActive && !u.IsDeleted)
            .GroupJoin(_ctx.AgencyProfiles,
                       u  => u.Id.ToString(),
                       ap => ap.UserId,
                       (u, profiles) => new { u, profiles })
            .SelectMany(
                x => x.profiles.DefaultIfEmpty(),
                (x, ap) => new { x.u, ap })
            // Visible if: no profile at all, OR profile.IsVisible = true
            .Where(x => x.ap == null || x.ap.IsVisible);

        // City / province filter — only applies when a profile exists
        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(x => x.ap != null && x.ap.City == city);
        else if (!string.IsNullOrWhiteSpace(province))
        {
            // Primary: match cities that belong to the province (via LocationCities lookup).
            // Fallback: match AgencyProfile.Province directly — covers profiles where only
            // Province is filled in (City is null) or where LocationCities has no matching row.
            if (provinceCities != null && provinceCities.Count > 0)
                query = query.Where(x =>
                    x.ap != null &&
                    (provinceCities.Contains(x.ap.City!) || x.ap.Province == province));
            else
                query = query.Where(x => x.ap != null && x.ap.Province == province);
        }

        if (!string.IsNullOrWhiteSpace(type))
        {
            if (Enum.TryParse<UserRole>(type, true, out var roleEnum))
                query = query.Where(x => x.u.Role == roleEnum);
        }

        // isVerified is derived from VerificationStatus (never an independent flag)
        if (isVerified.HasValue)
            query = query.Where(x => x.u.IsVerified == isVerified.Value);

        // isFeatured: users without profile are never featured
        if (isFeatured.HasValue)
        {
            if (isFeatured.Value)
                query = query.Where(x => x.ap != null && x.ap.IsFeatured);
            else
                query = query.Where(x => x.ap == null || !x.ap.IsFeatured);
        }

        var total = await query.CountAsync(ct);

        // Step 1: intermediate projection (no ratings yet)
        // Null-safe: ap may be null (user without profile)
        var rawItems = await query
            .OrderBy(x => x.ap != null ? x.ap.SortOrder : 999)
            .ThenByDescending(x => x.ap != null && x.ap.IsFeatured)
            .ThenBy(x => x.u.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                Id                 = x.u.Id.ToString(),
                x.u.FullName,
                Role               = x.u.Role.ToString(),
                RoleLabel          = x.u.Role == UserRole.Broker ? "وسيط عقاري" : "مكتب عقاري",
                City               = x.ap != null ? x.ap.City     : null,
                Province           = x.ap != null ? x.ap.Province  : null,
                Bio                = x.ap != null ? x.ap.Bio      : null,
                // Logo is always the user's profile photo — no separate logoUrl
                LogoUrl            = x.u.ProfileImageUrl,
                // isVerified is ALWAYS derived from VerificationStatus (ApplyVerificationCore)
                x.u.IsVerified,
                VerificationStatus = x.u.VerificationStatus.ToString(),
                x.u.VerificationBadge,
                IsFeatured         = x.ap != null && x.ap.IsFeatured,
                SortOrder          = x.ap != null ? x.ap.SortOrder : 999,
                ListingCount       = _ctx.Properties.Count(p =>
                    p.CreatedByUserId == x.u.Id.ToString() &&
                    p.ModerationStatus == ModerationStatus.Active &&
                    !p.IsDeleted),
            })
            .ToListAsync(ct);

        // Step 2: batch ratings lookup
        var agencyIds  = rawItems.Select(i => i.Id).ToList();
        var ratingsMap = await GetRatingAggregatesAsync(agencyIds, ct);

        // Step 3: build final DTOs
        var items = rawItems.Select(x =>
        {
            var (avg, count) = ratingsMap.GetValueOrDefault(x.Id, (0m, 0));
            return new AgencyListItemDto(
                x.Id, x.FullName, x.Role, x.RoleLabel,
                x.City, x.Province, x.Bio, x.LogoUrl,
                x.IsVerified, x.VerificationStatus, x.VerificationBadge,
                x.IsFeatured, x.SortOrder, x.ListingCount,
                avg, count);
        }).ToList();

        return Ok(new AgenciesPagedResult(
            items, page, pageSize, total,
            (int)Math.Ceiling(total / (double)pageSize)));
    }

    // ── GET /api/agencies/{id} ────────────────────────────────────────────────
    // Accessible if user is active Broker/Office AND (no profile OR profile.IsVisible=true).

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        await EnsureTableAsync(ct);
        await EnsureRatingsTableAsync(ct);

        if (!Guid.TryParse(id, out var guid))
            return NotFound();

        var allowedRoles = new[] { UserRole.Broker, UserRole.Office, UserRole.CompanyOwner };

        // LEFT JOIN: accessible even without a profile
        var raw = await _ctx.Users
            .Where(u => u.Id == guid && allowedRoles.Contains(u.Role) && u.IsActive && !u.IsDeleted)
            .GroupJoin(_ctx.AgencyProfiles,
                       u  => u.Id.ToString(),
                       ap => ap.UserId,
                       (u, profiles) => new { u, profiles })
            .SelectMany(
                x => x.profiles.DefaultIfEmpty(),
                (x, ap) => new { x.u, ap })
            // Hidden only if profile explicitly sets IsVisible=false
            .Where(x => x.ap == null || x.ap.IsVisible)
            .Select(x => new
            {
                Id                 = x.u.Id.ToString(),
                x.u.FullName,
                Role               = x.u.Role.ToString(),
                RoleLabel          = x.u.Role == UserRole.Broker ? "وسيط عقاري" : "مكتب عقاري",
                City               = x.ap != null ? x.ap.City     : null,
                Province           = x.ap != null ? x.ap.Province  : null,
                Bio                = x.ap != null ? x.ap.Bio      : null,
                // Logo is always the user's profile photo — no separate logoUrl
                LogoUrl            = x.u.ProfileImageUrl,
                x.u.Phone,
                x.u.IsVerified,
                VerificationStatus = x.u.VerificationStatus.ToString(),
                x.u.VerificationLevel,
                x.u.VerificationBadge,
                IsFeatured         = x.ap != null && x.ap.IsFeatured,
                ListingCount       = _ctx.Properties.Count(p =>
                    p.CreatedByUserId == x.u.Id.ToString() &&
                    p.ModerationStatus == ModerationStatus.Active &&
                    !p.IsDeleted),
                x.u.CreatedAt,
            })
            .FirstOrDefaultAsync(ct);

        if (raw is null) return NotFound();

        var ratingsMap = await GetRatingAggregatesAsync([raw.Id], ct);
        var (avg, count) = ratingsMap.GetValueOrDefault(raw.Id, (0m, 0));

        return Ok(new AgencyDetailDto(
            raw.Id, raw.FullName, raw.Role, raw.RoleLabel,
            raw.City, raw.Province, raw.Bio, raw.LogoUrl, raw.Phone,
            raw.IsVerified, raw.VerificationStatus, raw.VerificationLevel, raw.VerificationBadge,
            raw.IsFeatured, raw.ListingCount, raw.CreatedAt,
            avg, count));
    }

    // ── GET /api/agencies/{id}/ratings ────────────────────────────────────────

    [HttpGet("{id}/ratings")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRatings(
        string id,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        await EnsureRatingsTableAsync(ct);

        if (!Guid.TryParse(id, out _)) return NotFound();

        var conn       = _ctx.Database.GetDbConnection();
        var shouldClose = conn.State != System.Data.ConnectionState.Open;
        if (shouldClose) await conn.OpenAsync(ct);
        try
        {
            var safeId = id.Replace("'", "''");

            // Total count + average
            int     total = 0;
            decimal avg   = 0m;
            using (var countCmd = conn.CreateCommand())
            {
                countCmd.CommandText = $@"
                    SELECT COUNT(*)::int, ROUND(AVG(""Rating"")::numeric, 1)
                    FROM ""AgencyRatings""
                    WHERE ""AgencyId"" = '{safeId}'";
                using var cr = await countCmd.ExecuteReaderAsync(ct);
                if (await cr.ReadAsync(ct))
                {
                    total = cr.GetInt32(0);
                    avg   = cr.IsDBNull(1) ? 0m : cr.GetDecimal(1);
                }
            }

            // Paginated ratings with reviewer name
            var offset = (page - 1) * pageSize;
            var items  = new List<AgencyRatingDto>();
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = $@"
                    SELECT ar.""Id""::text,
                           ar.""ReviewerId"",
                           COALESCE(u.""FullName"", 'مستخدم') AS ""ReviewerName"",
                           ar.""Rating"",
                           ar.""Comment"",
                           ar.""CreatedAt""
                    FROM   ""AgencyRatings"" ar
                    LEFT JOIN ""Users"" u
                           ON u.""Id""::text = ar.""ReviewerId"" AND NOT u.""IsDeleted""
                    WHERE  ar.""AgencyId"" = '{safeId}'
                    ORDER  BY ar.""CreatedAt"" DESC
                    LIMIT  {pageSize} OFFSET {offset}";

                using var r = await cmd.ExecuteReaderAsync(ct);
                while (await r.ReadAsync(ct))
                {
                    items.Add(new AgencyRatingDto(
                        r.GetString(0),
                        r.GetString(1),
                        r.GetString(2),
                        r.GetInt32(3),
                        r.IsDBNull(4) ? null : r.GetString(4),
                        r.GetDateTime(5)));
                }
            }

            return Ok(new AgencyRatingsPagedResult(
                items, page, pageSize, total, avg, total));
        }
        finally
        {
            if (shouldClose) await conn.CloseAsync();
        }
    }

    // ── POST /api/agencies/{id}/ratings ───────────────────────────────────────
    // Upsert — creates a new rating or updates the caller's existing one.

    [HttpPost("{id}/ratings")]
    [Authorize]
    public async Task<IActionResult> UpsertRating(
        string id,
        [FromBody] CreateAgencyRatingRequest req,
        CancellationToken ct = default)
    {
        await EnsureRatingsTableAsync(ct);

        if (!Guid.TryParse(id, out _))
            return NotFound(new { error = "لم يُعثر على المكتب/الوسيط" });

        if (req.Rating < 1 || req.Rating > 5)
            return BadRequest(new { error = "التقييم يجب أن يكون بين 1 و5 نجوم" });

        var reviewerId = GetUserId().ToString();

        if (reviewerId == id)
            return BadRequest(new { error = "لا يمكنك تقييم ملفك الشخصي" });

        var allowedRoles = new[] { UserRole.Broker, UserRole.Office };
        var agencyExists = await _ctx.Users.AnyAsync(u =>
            u.Id.ToString() == id &&
            allowedRoles.Contains(u.Role) &&
            u.IsActive && !u.IsDeleted, ct);

        if (!agencyExists)
            return NotFound(new { error = "لم يُعثر على المكتب/الوسيط" });

        var conn       = _ctx.Database.GetDbConnection();
        var shouldClose = conn.State != System.Data.ConnectionState.Open;
        if (shouldClose) await conn.OpenAsync(ct);
        try
        {
            using var cmd       = conn.CreateCommand();
            var safeId          = id.Replace("'", "''");
            var safeReviewerId  = reviewerId.Replace("'", "''");
            var commentSql      = req.Comment is null
                ? "NULL"
                : $"'{req.Comment.Replace("'", "''")}'";

            cmd.CommandText = $@"
                INSERT INTO ""AgencyRatings""
                    (""AgencyId"", ""ReviewerId"", ""Rating"", ""Comment"", ""CreatedAt"", ""UpdatedAt"")
                VALUES
                    ('{safeId}', '{safeReviewerId}', {req.Rating}, {commentSql}, NOW(), NOW())
                ON CONFLICT (""AgencyId"", ""ReviewerId"") DO UPDATE
                    SET ""Rating""    = {req.Rating},
                        ""Comment""   = {commentSql},
                        ""UpdatedAt"" = NOW()
                RETURNING ""Id""::text, ""Rating"", ""Comment"", ""CreatedAt""";

            using var reader = await cmd.ExecuteReaderAsync(ct);
            if (await reader.ReadAsync(ct))
            {
                return Ok(new
                {
                    id        = reader.GetString(0),
                    rating    = reader.GetInt32(1),
                    comment   = reader.IsDBNull(2) ? null : reader.GetString(2),
                    createdAt = reader.GetDateTime(3),
                });
            }

            return StatusCode(500, new { error = "حدث خطأ أثناء حفظ التقييم" });
        }
        finally
        {
            if (shouldClose) await conn.CloseAsync();
        }
    }
}
