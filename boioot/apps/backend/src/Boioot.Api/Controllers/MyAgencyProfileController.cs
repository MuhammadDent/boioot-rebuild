using Boioot.Application.Features.Agencies.DTOs;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

/// <summary>
/// Self-service agency profile management (owner only).
///
/// GET  /api/my/agency-profile   — get the caller's own AgencyProfile
/// PUT  /api/my/agency-profile   — upsert the caller's own AgencyProfile (user-editable fields only)
///
/// Admin-only fields (IsVisible, IsFeatured, SortOrder, verification*) are
/// NEVER writable from this controller — use PUT /api/admin/agencies/{id}.
/// </summary>
[Route("api/my/agency-profile")]
[Authorize]
public class MyAgencyProfileController : BaseController
{
    private readonly BoiootDbContext _ctx;

    public MyAgencyProfileController(BoiootDbContext ctx) => _ctx = ctx;

    // ── Ensure columns exist (idempotent) ────────────────────────────────────

    private Task EnsureColumnsAsync(CancellationToken ct) =>
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
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""BusinessName""                TEXT;
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""Province""                    TEXT;
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""ContactNumber""               TEXT;
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""WhatsappLink""                TEXT;
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""Address""                     TEXT;
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""WebsiteUrl""                  TEXT;
            ALTER TABLE ""AgencyProfiles"" ADD COLUMN IF NOT EXISTS ""CommercialRegistrationNumber"" TEXT;
        ", ct);

    // ── Verify caller is Broker or Office ─────────────────────────────────────

    private static readonly UserRole[] AllowedRoles = [UserRole.Broker, UserRole.Office];

    // ── GET /api/my/agency-profile ───────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        await EnsureColumnsAsync(ct);

        var userId = GetUserId();

        var user = await _ctx.Users
            .FirstOrDefaultAsync(u => u.Id == userId && AllowedRoles.Contains(u.Role) && !u.IsDeleted, ct);

        if (user is null)
            return Forbid();

        var profile = await _ctx.AgencyProfiles.FindAsync(new object[] { userId.ToString() }, ct);

        if (profile is null)
        {
            // Return empty-but-valid response so the frontend can render the empty form
            return Ok(new MyAgencyProfileDto(
                null, null, null, null, null, null, null, null,
                false, false,
                user.VerificationStatus.ToString(),
                user.VerificationBadge,
                user.IsVerified));
        }

        return Ok(new MyAgencyProfileDto(
            profile.Bio,
            profile.City,
            profile.Province,
            profile.ContactNumber,
            profile.WhatsappLink,
            profile.Address,
            profile.WebsiteUrl,
            profile.CommercialRegistrationNumber,
            profile.IsVisible,
            profile.IsFeatured,
            user.VerificationStatus.ToString(),
            user.VerificationBadge,
            user.IsVerified));
    }

    // ── PUT /api/my/agency-profile ───────────────────────────────────────────
    // Upsert — creates profile on first save, updates on subsequent saves.
    // NEVER touches IsVisible / IsFeatured / SortOrder / verification fields.

    [HttpPut]
    public async Task<IActionResult> Upsert(
        [FromBody] UpsertMyAgencyProfileRequest req,
        CancellationToken ct)
    {
        await EnsureColumnsAsync(ct);

        var userId = GetUserId();

        var user = await _ctx.Users
            .FirstOrDefaultAsync(u => u.Id == userId && AllowedRoles.Contains(u.Role) && !u.IsDeleted, ct);

        if (user is null)
            return Forbid();

        var userIdStr = userId.ToString();
        var profile   = await _ctx.AgencyProfiles.FindAsync(new object[] { userIdStr }, ct);

        if (profile is null)
        {
            profile = new AgencyProfile
            {
                UserId    = userIdStr,
                IsVisible  = false,   // admin must enable
                IsFeatured = false,
                SortOrder  = 0,
            };
            _ctx.AgencyProfiles.Add(profile);
        }

        // User-editable fields only (BusinessName and LogoUrl excluded — use FullName and ProfileImageUrl)
        profile.Bio                           = req.Bio?.Trim();
        profile.City                          = req.City?.Trim();
        profile.Province                      = req.Province?.Trim();
        profile.ContactNumber                 = req.ContactNumber?.Trim();
        profile.WhatsappLink                  = req.WhatsappLink?.Trim();
        profile.Address                       = req.Address?.Trim();
        profile.WebsiteUrl                    = req.WebsiteUrl?.Trim();
        profile.CommercialRegistrationNumber  = req.CommercialRegistrationNumber?.Trim();
        profile.UpdatedAt                     = DateTime.UtcNow;

        await _ctx.SaveChangesAsync(ct);

        return Ok(new MyAgencyProfileDto(
            profile.Bio,
            profile.City,
            profile.Province,
            profile.ContactNumber,
            profile.WhatsappLink,
            profile.Address,
            profile.WebsiteUrl,
            profile.CommercialRegistrationNumber,
            profile.IsVisible,
            profile.IsFeatured,
            user.VerificationStatus.ToString(),
            user.VerificationBadge,
            user.IsVerified));
    }
}
