using Boioot.Api.Authorization;
using Boioot.Application.Features.Admin.DTOs;
using Boioot.Application.Features.Admin.Interfaces;
using Boioot.Application.Features.Agencies.DTOs;
using Boioot.Domain.Constants;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

/// <summary>
/// Admin endpoints for managing agency profiles.
///
/// GET  /api/admin/agencies                   — list all Broker/Office users + profiles
/// PUT  /api/admin/agencies/{userId}           — upsert agency profile (visibility / bio / city …)
/// PUT  /api/admin/agencies/{userId}/verification — update verification via the unified system
/// </summary>
[Route("api/admin/agencies")]
[Authorize]
[RequirePermission(Permissions.UsersView)]
public class AdminAgenciesController : BaseController
{
    private readonly BoiootDbContext _ctx;
    private readonly IAdminService   _admin;

    public AdminAgenciesController(BoiootDbContext ctx, IAdminService admin)
    {
        _ctx   = ctx;
        _admin = admin;
    }

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

    // ── GET /api/admin/agencies ───────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? city,
        [FromQuery] string? type,
        [FromQuery] bool?   isVisible,
        [FromQuery] bool?   isFeatured,
        [FromQuery] bool?   isVerified,
        [FromQuery] string? search,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20,
        CancellationToken ct = default)
    {
        await EnsureTableAsync(ct);

        var allowedRoles = new[] { UserRole.Broker, UserRole.Office };

        var query = _ctx.Users
            .Where(u => allowedRoles.Contains(u.Role) && !u.IsDeleted)
            .GroupJoin(_ctx.AgencyProfiles,
                       u  => u.Id.ToString(),
                       ap => ap.UserId,
                       (u, profiles) => new { u, profiles })
            .SelectMany(
                x => x.profiles.DefaultIfEmpty(),
                (x, ap) => new { x.u, ap });

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(x =>
                x.u.FullName.Contains(search) ||
                x.u.Email.Contains(search));

        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(x => x.ap != null && x.ap.City == city);

        if (!string.IsNullOrWhiteSpace(type) && Enum.TryParse<UserRole>(type, true, out var roleEnum))
            query = query.Where(x => x.u.Role == roleEnum);

        if (isVisible.HasValue)
            query = query.Where(x => x.ap != null && x.ap.IsVisible == isVisible.Value);

        if (isFeatured.HasValue)
            query = query.Where(x => x.ap != null && x.ap.IsFeatured == isFeatured.Value);

        // isVerified reads u.IsVerified which is ALWAYS derived from VerificationStatus
        if (isVerified.HasValue)
            query = query.Where(x => x.u.IsVerified == isVerified.Value);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(x => x.u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new AdminAgencyDto(
                x.u.Id.ToString(),
                x.u.FullName,
                x.u.Email,
                x.u.Phone,
                x.u.Role.ToString(),
                x.u.Role == UserRole.Broker ? "وسيط عقاري" : "مكتب عقاري",
                x.ap != null ? x.ap.City    : null,
                x.ap != null ? x.ap.Bio     : null,
                x.ap != null ? (x.ap.LogoUrl ?? x.u.ProfileImageUrl) : x.u.ProfileImageUrl,
                x.ap != null && x.ap.IsVisible,
                // verification — read-only from User entity
                x.u.IsVerified,
                x.u.VerificationStatus.ToString(),
                x.u.VerificationLevel,
                x.u.BusinessVerificationStatus.ToString(),
                x.u.VerificationBadge,
                // agency profile
                x.ap != null && x.ap.IsFeatured,
                x.ap != null ? x.ap.SortOrder : 0,
                x.u.IsActive,
                x.u.CreatedAt,
                _ctx.Properties.Count(p =>
                    p.CreatedByUserId == x.u.Id.ToString() &&
                    p.ModerationStatus == ModerationStatus.Active &&
                    !p.IsDeleted)))
            .ToListAsync(ct);

        return Ok(new AdminAgenciesPagedResult(
            items,
            page,
            pageSize,
            total,
            (int)Math.Ceiling(total / (double)pageSize)));
    }

    // ── PUT /api/admin/agencies/{userId} ─────────────────────────────────────
    // Updates only the agency profile (visibility, bio, city, logo, sort order, featured).
    // Verification is intentionally NOT handled here — use the /verification sub-endpoint.

    [HttpPut("{userId}")]
    [RequirePermission(Permissions.UsersEdit)]
    public async Task<IActionResult> Update(
        string userId,
        [FromBody] UpdateAgencyProfileRequest req,
        CancellationToken ct)
    {
        await EnsureTableAsync(ct);

        if (!Guid.TryParse(userId, out var guid))
            return BadRequest("معرف المستخدم غير صالح");

        var allowedRoles = new[] { UserRole.Broker, UserRole.Office };
        var user = await _ctx.Users
            .FirstOrDefaultAsync(u => u.Id == guid && allowedRoles.Contains(u.Role) && !u.IsDeleted, ct);

        if (user is null)
            return NotFound("المستخدم غير موجود أو ليس وسيطاً أو مكتباً");

        // Upsert AgencyProfile (profile data only — no verification touch)
        var profile = await _ctx.AgencyProfiles.FindAsync(new object[] { userId }, ct);
        if (profile is null)
        {
            profile = new AgencyProfile { UserId = userId };
            _ctx.AgencyProfiles.Add(profile);
        }

        profile.IsVisible  = req.IsVisible;
        profile.IsFeatured = req.IsFeatured;
        profile.Bio        = req.Bio;
        profile.City       = req.City;
        profile.LogoUrl    = req.LogoUrl;
        profile.SortOrder  = req.SortOrder;
        profile.UpdatedAt  = DateTime.UtcNow;

        await _ctx.SaveChangesAsync(ct);

        return Ok(new AdminAgencyDto(
            user.Id.ToString(),
            user.FullName,
            user.Email,
            user.Phone,
            user.Role.ToString(),
            user.Role == UserRole.Broker ? "وسيط عقاري" : "مكتب عقاري",
            profile.City,
            profile.Bio,
            profile.LogoUrl ?? user.ProfileImageUrl,
            profile.IsVisible,
            user.IsVerified,
            user.VerificationStatus.ToString(),
            user.VerificationLevel,
            user.BusinessVerificationStatus.ToString(),
            user.VerificationBadge,
            profile.IsFeatured,
            profile.SortOrder,
            user.IsActive,
            user.CreatedAt,
            await _ctx.Properties.CountAsync(p =>
                p.CreatedByUserId == user.Id.ToString() &&
                p.ModerationStatus == ModerationStatus.Active &&
                !p.IsDeleted, ct)));
    }

    // ── PUT /api/admin/agencies/{userId}/verification ─────────────────────────
    // Routes verification changes through the UNIFIED IAdminService.UpdateUserVerificationAsync.
    // This is the single source of truth — IsVerified is always derived from VerificationStatus.

    [HttpPut("{userId}/verification")]
    [RequirePermission(Permissions.UsersEdit)]
    public async Task<IActionResult> UpdateVerification(
        Guid userId,
        [FromBody] UpdateUserVerificationRequest req,
        CancellationToken ct)
    {
        var adminId = GetUserId();
        var result  = await _admin.UpdateUserVerificationAsync(adminId, userId, req, ct);
        return Ok(result);
    }
}
