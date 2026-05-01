using Boioot.Application.Features.Matching.DTOs;
using Boioot.Application.Features.Matching.Interfaces;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Matching;

/// <summary>
/// Reads a user's matching feature entitlements from their active matching subscription.
/// Looks only at subscriptions where Plan.ProductArea = "matching" — listing plans are ignored.
/// </summary>
public class MatchingPlanAccessService : IMatchingPlanAccessService
{
    private readonly BoiootDbContext _db;

    public MatchingPlanAccessService(BoiootDbContext db)
    {
        _db = db;
    }

    public async Task<MatchingUserFeaturesDto> GetFeaturesAsync(Guid userId, CancellationToken ct = default)
    {
        var result = new MatchingUserFeaturesDto();

        // ── 1. Find user's account ────────────────────────────────────────────
        var accountId = await _db.AccountUsers
            .AsNoTracking()
            .Where(au => au.UserId == userId && au.IsActive)
            .Select(au => (Guid?)au.AccountId)
            .FirstOrDefaultAsync(ct);

        if (accountId is null)
            return result; // no account → safe defaults

        // ── 2. Find active matching subscription ─────────────────────────────
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

        result.HasMatchingSubscription = true;

        // ── 3. Read feature flags ─────────────────────────────────────────────
        foreach (var pf in sub.Plan.PlanFeatures.Where(f => f.IsEnabled))
        {
            switch (pf.FeatureDefinition?.Key)
            {
                case "lead_notifications":    result.LeadNotifications    = true; break;
                case "instant_notifications": result.InstantNotifications = true; break;
                case "full_match_access":     result.FullMatchAccess      = true; break;
            }
        }

        // ── 4. Read monthly_lead_unlocks limit ────────────────────────────────
        var unlockLimit = sub.Plan.PlanLimits
            .FirstOrDefault(pl => pl.LimitDefinition?.Key == "monthly_lead_unlocks");

        result.MonthlyLeadUnlocks = (int)(unlockLimit?.Value ?? 0);

        return result;
    }
}
