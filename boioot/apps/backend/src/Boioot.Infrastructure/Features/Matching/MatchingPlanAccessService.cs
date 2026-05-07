using Boioot.Application.Features.Matching.DTOs;
using Boioot.Application.Features.Matching.Interfaces;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Matching;

/// <summary>
/// Resolves a user's matching feature entitlements.
///
/// Phase 1 — Free professional access:
///   Users with a professional role (Broker, Agent, CompanyOwner, Office) receive
///   full matching access automatically. No subscription check is performed.
///
/// Future phases — Optional premium add-ons:
///   If a user has an active matching subscription (ProductArea = "matching"),
///   additional premium features (e.g. priority routing, analytics) will be enabled.
///   The DB structure for matching plans already exists and is preserved for this purpose.
/// </summary>
public class MatchingPlanAccessService : IMatchingPlanAccessService
{
    private static readonly HashSet<UserRole> ProfessionalRoles = new()
    {
        UserRole.Broker,
        UserRole.Agent,
        UserRole.CompanyOwner,
        UserRole.Office,
    };

    private readonly BoiootDbContext _db;

    public MatchingPlanAccessService(BoiootDbContext db)
    {
        _db = db;
    }

    public async Task<MatchingUserFeaturesDto> GetFeaturesAsync(Guid userId, CancellationToken ct = default)
    {
        var result = new MatchingUserFeaturesDto();

        // ── 1. Resolve user role ──────────────────────────────────────────────
        var userRole = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == userId && u.IsActive && !u.IsDeleted)
            .Select(u => (UserRole?)u.Role)
            .FirstOrDefaultAsync(ct);

        if (userRole is null)
            return result; // user not found → safe defaults (no access)

        // ── 2. Grant full access to professional accounts (Phase 1 — free) ────
        if (ProfessionalRoles.Contains(userRole.Value))
        {
            result.HasProfessionalAccess  = true;
            result.LeadNotifications      = true;
            result.InstantNotifications   = true;
            result.FullMatchAccess        = true;
            result.MonthlyLeadUnlocks     = -1; // unlimited
            return result;
        }

        // ── 3. Non-professional users: check for optional matching subscription ─
        // This path is currently only reached for seekers/owners who are not
        // professional accounts. In practice the matching UI is not exposed to them,
        // but the backend handles it gracefully.
        //
        // Future: premium matching add-ons (e.g. CRM access, priority routing)
        // for professional accounts will be read from subscriptions here.
        var accountId = await _db.AccountUsers
            .AsNoTracking()
            .Where(au => au.UserId == userId && au.IsActive)
            .Select(au => (Guid?)au.AccountId)
            .FirstOrDefaultAsync(ct);

        if (accountId is null)
            return result; // no account → safe defaults

        var sub = await _db.Subscriptions
            .AsNoTracking()
            .Include(s => s.Plan)
                .ThenInclude(p => p.PlanFeatures)
                    .ThenInclude(pf => pf.FeatureDefinition)
            .Include(s => s.Plan)
                .ThenInclude(p => p.PlanLimits)
                    .ThenInclude(pl => pl.LimitDefinition)
            .Where(s => s.AccountId == accountId
                     && s.IsActive
                     && s.Plan.ProductArea == "matching")
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (sub is null)
            return result; // no matching subscription → safe defaults

        // Legacy: grant features from matching subscription (future premium path)
        result.HasProfessionalAccess = true;

        foreach (var pf in sub.Plan.PlanFeatures.Where(f => f.IsEnabled))
        {
            switch (pf.FeatureDefinition?.Key)
            {
                case "lead_notifications":    result.LeadNotifications    = true; break;
                case "instant_notifications": result.InstantNotifications = true; break;
                case "full_match_access":     result.FullMatchAccess      = true; break;
            }
        }

        var unlockLimit = sub.Plan.PlanLimits
            .FirstOrDefault(pl => pl.LimitDefinition?.Key == "monthly_lead_unlocks");
        result.MonthlyLeadUnlocks = (int)(unlockLimit?.Value ?? 0);

        return result;
    }
}
