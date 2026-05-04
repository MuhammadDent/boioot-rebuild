using Boioot.Application.Features.Agencies.DTOs;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

/// <summary>
/// Public endpoints — no authentication required except POST /{id}/ratings.
/// GET /api/agencies          — paged list of visible Broker / Office profiles
/// GET /api/agencies/cities   — distinct cities used by visible agencies (for hierarchical filter)
/// GET /api/agencies/{id}     — single agency detail
/// GET /api/agencies/{id}/ratings  — paginated ratings for an agency
/// POST /api/agencies/{id}/ratings — create or update the caller's rating (auth required)
///
/// IsVerified on each result is ALWAYS derived from User.VerificationStatus
/// (true when VerificationStatus is Verified or PartiallyVerified).
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
                ""UserId""     TEXT    NOT NULL,
                ""Bio""        TEXT,
                ""City""       TEXT,
                ""LogoUrl""    TEXT,
                ""IsVisible""  BOOLEAN NOT NULL DEFAULT false,
                ""IsFeatured"" BOOLEAN NOT NULL DEFAULT false,
                ""SortOrder""  INTEGER NOT NULL DEFAULT 0,
                ""UpdatedAt""  TIMESTAMP WITH TIME ZONE,
                CONSTRAINT ""PK_AgencyProfiles"" PRIMARY KEY (""UserId"")
            );", ct);

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

    [HttpGet("cities")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAgencyCities(CancellationToken ct)
    {
        await EnsureTableAsync(ct);

        var allowedRoles = new[] { UserRole.Broker, UserRole.Office };

        var usedCities = await _ctx.Users
            .Where(u => allowedRoles.Contains(u.Role) && u.IsActive && !u.IsDeleted)
            .Join(_ctx.AgencyProfiles,
                  u  => u.Id.ToString(),
                  ap => ap.UserId,
                  (u, ap) => ap)
            .Where(ap => ap.IsVisible && ap.City != null && ap.City != "")
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

        var allowedRoles = new[] { UserRole.Broker, UserRole.Office };

        var query = _ctx.Users
            .Where(u => allowedRoles.Contains(u.Role) && u.IsActive && !u.IsDeleted)
            .Join(_ctx.AgencyProfiles,
                  u  => u.Id.ToString(),
                  ap => ap.UserId,
                  (u, ap) => new { u, ap })
            .Where(x => x.ap.IsVisible);

        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(x => x.ap.City == city);
        else if (provinceCities is not null && provinceCities.Count > 0)
            query = query.Where(x => provinceCities.Contains(x.ap.City!));

        if (!string.IsNullOrWhiteSpace(type))
        {
            if (Enum.TryParse<UserRole>(type, true, out var roleEnum))
                query = query.Where(x => x.u.Role == roleEnum);
        }

        // isVerified reads u.IsVerified which is derived from VerificationStatus
        if (isVerified.HasValue)
            query = query.Where(x => x.u.IsVerified == isVerified.Value);

        if (isFeatured.HasValue)
            query = query.Where(x => x.ap.IsFeatured == isFeatured.Value);

        var total = await query.CountAsync(ct);

        // Step 1: intermediate projection (no ratings yet)
        var rawItems = await query
            .OrderBy(x => x.ap.SortOrder)
            .ThenByDescending(x => x.ap.IsFeatured)
            .ThenBy(x => x.u.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                Id                 = x.u.Id.ToString(),
                x.u.FullName,
                Role               = x.u.Role.ToString(),
                RoleLabel          = x.u.Role == UserRole.Broker ? "وسيط عقاري" : "مكتب عقاري",
                x.ap.City,
                x.ap.Bio,
                LogoUrl            = x.ap.LogoUrl ?? x.u.ProfileImageUrl,
                x.u.IsVerified,
                VerificationStatus = x.u.VerificationStatus.ToString(),
                x.u.VerificationBadge,
                x.ap.IsFeatured,
                x.ap.SortOrder,
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
                x.City, x.Bio, x.LogoUrl,
                x.IsVerified, x.VerificationStatus, x.VerificationBadge,
                x.IsFeatured, x.SortOrder, x.ListingCount,
                avg, count);
        }).ToList();

        return Ok(new AgenciesPagedResult(
            items, page, pageSize, total,
            (int)Math.Ceiling(total / (double)pageSize)));
    }

    // ── GET /api/agencies/{id} ────────────────────────────────────────────────

    [HttpGet("{id}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        await EnsureTableAsync(ct);
        await EnsureRatingsTableAsync(ct);

        if (!Guid.TryParse(id, out var guid))
            return NotFound();

        var allowedRoles = new[] { UserRole.Broker, UserRole.Office };

        var raw = await _ctx.Users
            .Where(u => u.Id == guid && allowedRoles.Contains(u.Role) && u.IsActive && !u.IsDeleted)
            .Join(_ctx.AgencyProfiles,
                  u  => u.Id.ToString(),
                  ap => ap.UserId,
                  (u, ap) => new { u, ap })
            .Where(x => x.ap.IsVisible)
            .Select(x => new
            {
                Id                 = x.u.Id.ToString(),
                x.u.FullName,
                Role               = x.u.Role.ToString(),
                RoleLabel          = x.u.Role == UserRole.Broker ? "وسيط عقاري" : "مكتب عقاري",
                x.ap.City,
                x.ap.Bio,
                LogoUrl            = x.ap.LogoUrl ?? x.u.ProfileImageUrl,
                x.u.Phone,
                x.u.IsVerified,
                VerificationStatus = x.u.VerificationStatus.ToString(),
                x.u.VerificationLevel,
                x.u.VerificationBadge,
                x.ap.IsFeatured,
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
            raw.City, raw.Bio, raw.LogoUrl, raw.Phone,
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
