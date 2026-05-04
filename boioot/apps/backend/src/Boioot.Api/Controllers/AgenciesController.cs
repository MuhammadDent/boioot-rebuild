using Boioot.Application.Features.Agencies.DTOs;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

/// <summary>
/// Public endpoints — no authentication required.
/// GET /api/agencies       — paged list of visible Broker / Office profiles
/// GET /api/agencies/{id}  — single agency detail
///
/// IsVerified on each result is ALWAYS derived from User.VerificationStatus
/// (true when VerificationStatus is Verified or PartiallyVerified).
/// </summary>
[Route("api/agencies")]
public class AgenciesController : BaseController
{
    private readonly BoiootDbContext _ctx;

    public AgenciesController(BoiootDbContext ctx) => _ctx = ctx;

    // ── Ensure table exists (idempotent) ─────────────────────────────────────

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

    // ── GET /api/agencies ─────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? city,
        [FromQuery] string? type,
        [FromQuery] bool?   isVerified,
        [FromQuery] bool?   isFeatured,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 12,
        CancellationToken ct = default)
    {
        await EnsureTableAsync(ct);

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

        var items = await query
            .OrderBy(x => x.ap.SortOrder)
            .ThenByDescending(x => x.ap.IsFeatured)
            .ThenBy(x => x.u.FullName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new AgencyListItemDto(
                x.u.Id.ToString(),
                x.u.FullName,
                x.u.Role.ToString(),
                x.u.Role == UserRole.Broker ? "وسيط عقاري" : "مكتب عقاري",
                x.ap.City,
                x.ap.Bio,
                x.ap.LogoUrl ?? x.u.ProfileImageUrl,
                x.u.IsVerified,
                x.u.VerificationStatus.ToString(),
                x.u.VerificationBadge,
                x.ap.IsFeatured,
                x.ap.SortOrder,
                _ctx.Properties.Count(p =>
                    p.CreatedByUserId == x.u.Id.ToString() &&
                    p.ModerationStatus == ModerationStatus.Active &&
                    !p.IsDeleted)))
            .ToListAsync(ct);

        return Ok(new AgenciesPagedResult(
            items,
            page,
            pageSize,
            total,
            (int)Math.Ceiling(total / (double)pageSize)));
    }

    // ── GET /api/agencies/{id} ────────────────────────────────────────────────

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        await EnsureTableAsync(ct);

        if (!Guid.TryParse(id, out var guid))
            return NotFound();

        var allowedRoles = new[] { UserRole.Broker, UserRole.Office };

        var result = await _ctx.Users
            .Where(u => u.Id == guid && allowedRoles.Contains(u.Role) && u.IsActive && !u.IsDeleted)
            .Join(_ctx.AgencyProfiles,
                  u  => u.Id.ToString(),
                  ap => ap.UserId,
                  (u, ap) => new { u, ap })
            .Where(x => x.ap.IsVisible)
            .Select(x => new AgencyDetailDto(
                x.u.Id.ToString(),
                x.u.FullName,
                x.u.Role.ToString(),
                x.u.Role == UserRole.Broker ? "وسيط عقاري" : "مكتب عقاري",
                x.ap.City,
                x.ap.Bio,
                x.ap.LogoUrl ?? x.u.ProfileImageUrl,
                x.u.Phone,
                x.u.IsVerified,
                x.u.VerificationStatus.ToString(),
                x.u.VerificationLevel,
                x.u.VerificationBadge,
                x.ap.IsFeatured,
                _ctx.Properties.Count(p =>
                    p.CreatedByUserId == x.u.Id.ToString() &&
                    p.ModerationStatus == ModerationStatus.Active &&
                    !p.IsDeleted),
                x.u.CreatedAt))
            .FirstOrDefaultAsync(ct);

        if (result is null) return NotFound();
        return Ok(result);
    }
}
