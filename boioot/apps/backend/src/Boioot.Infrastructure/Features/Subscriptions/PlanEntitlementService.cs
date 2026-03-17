using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Subscriptions;

public class PlanEntitlementService : IPlanEntitlementService
{
    // Stable limit/feature keys — must match what is seeded in LimitDefinitions/FeatureDefinitions
    public const string KeyMaxActiveListings = "max_active_listings";
    public const string KeyMaxAgents         = "max_agents";

    private readonly BoiootDbContext _db;
    private readonly ILogger<PlanEntitlementService> _logger;

    public PlanEntitlementService(BoiootDbContext db, ILogger<PlanEntitlementService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── Core: resolve the active SubscriptionPlanId for an account ────────
    private async Task<Guid?> GetActivePlanIdAsync(Guid accountId, CancellationToken ct)
    {
        return await _db.Subscriptions
            .Where(s => s.AccountId == accountId
                     && (s.Status == SubscriptionStatus.Trial ||
                         s.Status == SubscriptionStatus.Active)
                     && (s.EndDate == null || s.EndDate > DateTime.UtcNow))
            .OrderByDescending(s => s.StartDate)
            .Select(s => (Guid?)s.PlanId)
            .FirstOrDefaultAsync(ct);
    }

    // ── HasFeatureAsync ───────────────────────────────────────────────────
    public async Task<bool> HasFeatureAsync(Guid accountId, string featureKey, CancellationToken ct = default)
    {
        try
        {
            // Single query: Subscriptions → PlanFeatures → FeatureDefinitions
            var isEnabled = await _db.Subscriptions
                .Where(s => s.AccountId == accountId
                         && (s.Status == SubscriptionStatus.Trial ||
                             s.Status == SubscriptionStatus.Active)
                         && (s.EndDate == null || s.EndDate > DateTime.UtcNow))
                .OrderByDescending(s => s.StartDate)
                .Take(1)
                .Join(_db.PlanFeatures,
                    s  => s.PlanId,
                    pf => pf.SubscriptionPlanId,
                    (s, pf) => pf)
                .Join(_db.FeatureDefinitions,
                    pf => pf.FeatureDefinitionId,
                    fd => fd.Id,
                    (pf, fd) => new { pf.IsEnabled, fd.Key, fd.IsActive })
                .Where(x => x.Key == featureKey && x.IsActive)
                .Select(x => (bool?)x.IsEnabled)
                .FirstOrDefaultAsync(ct);

            return isEnabled ?? false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking feature '{Key}' for account {AccountId}", featureKey, accountId);
            return false;
        }
    }

    // ── GetLimitAsync ─────────────────────────────────────────────────────
    public async Task<decimal> GetLimitAsync(Guid accountId, string limitKey, CancellationToken ct = default)
    {
        try
        {
            // Single query: Subscriptions → PlanLimits → LimitDefinitions
            var value = await _db.Subscriptions
                .Where(s => s.AccountId == accountId
                         && (s.Status == SubscriptionStatus.Trial ||
                             s.Status == SubscriptionStatus.Active)
                         && (s.EndDate == null || s.EndDate > DateTime.UtcNow))
                .OrderByDescending(s => s.StartDate)
                .Take(1)
                .Join(_db.PlanLimits,
                    s  => s.PlanId,
                    pl => pl.SubscriptionPlanId,
                    (s, pl) => pl)
                .Join(_db.LimitDefinitions,
                    pl => pl.LimitDefinitionId,
                    ld => ld.Id,
                    (pl, ld) => new { pl.Value, ld.Key, ld.IsActive })
                .Where(x => x.Key == limitKey && x.IsActive)
                .Select(x => (decimal?)x.Value)
                .FirstOrDefaultAsync(ct);

            // null = no subscription or limit not configured → safest default is 0
            return value ?? 0m;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting limit '{Key}' for account {AccountId}", limitKey, accountId);
            return 0m;
        }
    }

    // ── CanCreatePropertyAsync ────────────────────────────────────────────
    public async Task<bool> CanCreatePropertyAsync(Guid accountId, CancellationToken ct = default)
    {
        var limit = await GetLimitAsync(accountId, KeyMaxActiveListings, ct);

        if (limit == -1) return true;   // unlimited
        if (limit == 0)  return false;  // no access

        var activeCount = await _db.Properties
            .Where(p => p.AccountId == accountId && !p.IsDeleted)
            .CountAsync(ct);

        return activeCount < (int)limit;
    }

    // ── CanAddAgentAsync ──────────────────────────────────────────────────
    public async Task<bool> CanAddAgentAsync(Guid accountId, CancellationToken ct = default)
    {
        var limit = await GetLimitAsync(accountId, KeyMaxAgents, ct);

        if (limit == -1) return true;   // unlimited
        if (limit == 0)  return false;  // no access

        var agentCount = await _db.AccountUsers
            .Where(au => au.AccountId == accountId
                      && au.OrganizationUserRole == OrganizationUserRole.Agent
                      && au.IsActive)
            .CountAsync(ct);

        return agentCount < (int)limit;
    }
}
