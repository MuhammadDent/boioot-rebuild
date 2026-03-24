using Boioot.Application.Exceptions;
using Boioot.Application.Features.Subscriptions;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Subscriptions;

public class PlanEntitlementService : IPlanEntitlementService
{
    private readonly BoiootDbContext _db;
    private readonly ILogger<PlanEntitlementService> _logger;

    public PlanEntitlementService(BoiootDbContext db, ILogger<PlanEntitlementService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── Active subscription filter predicate ──────────────────────────────
    private static bool IsActiveFilter(Domain.Entities.Subscription s) =>
        s.IsActive &&
        (s.Status == SubscriptionStatus.Trial || s.Status == SubscriptionStatus.Active) &&
        (s.EndDate == null || s.EndDate > DateTime.UtcNow);

    // ── Resolve the active PlanId for an account ──────────────────────────
    private Task<Guid?> GetActivePlanIdAsync(Guid accountId, CancellationToken ct) =>
        _db.Subscriptions
            .Where(s => s.AccountId == accountId
                     && s.IsActive
                     && (s.Status == SubscriptionStatus.Trial ||
                         s.Status == SubscriptionStatus.Active)
                     && (s.EndDate == null || s.EndDate > DateTime.UtcNow))
            .OrderByDescending(s => s.StartDate)
            .Select(s => (Guid?)s.PlanId)
            .FirstOrDefaultAsync(ct);

    // ── FIX 5: Detect expired subscription and throw dedicated error ──────
    // Call at the start of every Can*Async method that resolves a limit.
    // If there is NO active subscription but there IS a past/expired one,
    // throw SUBSCRIPTION_EXPIRED instead of the generic "limit reached".
    private async Task ThrowIfSubscriptionExpiredAsync(Guid accountId, CancellationToken ct)
    {
        var activePlanId = await GetActivePlanIdAsync(accountId, ct);
        if (activePlanId.HasValue) return; // active → nothing to check

        var hasExpired = await _db.Subscriptions
            .AnyAsync(s => s.AccountId == accountId
                        && (s.Status == SubscriptionStatus.Expired
                         || s.Status == SubscriptionStatus.Cancelled
                         || (!s.IsActive && s.Status != SubscriptionStatus.Trial)
                         || (s.EndDate != null && s.EndDate <= DateTime.UtcNow)), ct);

        if (hasExpired)
            throw new PlanLimitException(
                limitKey:        "subscription",
                message:         "لقد انتهت صلاحية اشتراكك. يرجى تجديد الاشتراك للمتابعة.",
                upgradeRequired: true,
                errorCode:       "SUBSCRIPTION_EXPIRED");
    }

    // ── HasFeatureAsync ───────────────────────────────────────────────────
    // FIX 4: No longer swallows exceptions. DB errors surface as 500.
    public async Task<bool> HasFeatureAsync(Guid accountId, string featureKey, CancellationToken ct = default)
    {
        try
        {
            var isEnabled = await _db.Subscriptions
                .Where(s => s.AccountId == accountId
                         && s.IsActive
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
            _logger.LogError(ex,
                "DB error checking feature '{Key}' for account {AccountId}", featureKey, accountId);
            throw new BoiootException(
                "حدث خطأ أثناء التحقق من صلاحيات الخطة. يرجى المحاولة مرة أخرى.", 500);
        }
    }

    // ── GetLimitAsync ─────────────────────────────────────────────────────
    // FIX 4: No longer swallows exceptions. DB errors surface as 500.
    // Returns null when no active subscription or limit is not configured.
    public async Task<decimal> GetLimitAsync(Guid accountId, string limitKey, CancellationToken ct = default)
    {
        try
        {
            var value = await _db.Subscriptions
                .Where(s => s.AccountId == accountId
                         && s.IsActive
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

            return value ?? 0m;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "DB error getting limit '{Key}' for account {AccountId}", limitKey, accountId);
            throw new BoiootException(
                "حدث خطأ أثناء التحقق من حدود الخطة. يرجى المحاولة مرة أخرى.", 500);
        }
    }

    // ── CanCreatePropertyAsync ────────────────────────────────────────────
    public async Task<bool> CanCreatePropertyAsync(Guid accountId, CancellationToken ct = default)
    {
        // FIX 5: Throw SUBSCRIPTION_EXPIRED before returning a generic "limit=0"
        await ThrowIfSubscriptionExpiredAsync(accountId, ct);

        var limit = await GetLimitAsync(accountId, SubscriptionKeys.MaxActiveListings, ct);

        if (limit == -1) return true;   // unlimited
        if (limit == 0)  return false;  // plan has no listing access

        var activeCount = await _db.Properties
            .Where(p => p.AccountId == accountId
                     && p.IsDeleted == false
                     && (p.Status == PropertyStatus.Available ||
                         p.Status == PropertyStatus.Inactive))
            .CountAsync(ct);

        return activeCount < (int)limit;
    }

    // ── CanAddAgentAsync ──────────────────────────────────────────────────
    // FIX 1: Count agents via Agents table + company ownership path.
    // AgentManagementService creates User+Agent only (no AccountUser row),
    // so counting AccountUsers would always return 0 → limit never enforced.
    public async Task<bool> CanAddAgentAsync(Guid accountId, CancellationToken ct = default)
    {
        // FIX 5: Throw SUBSCRIPTION_EXPIRED before returning a generic "limit=0"
        await ThrowIfSubscriptionExpiredAsync(accountId, ct);

        var limit = await GetLimitAsync(accountId, SubscriptionKeys.MaxAgents, ct);

        if (limit == -1) return true;   // unlimited
        if (limit == 0)  return false;  // plan has no agent access

        // Resolve company IDs that belong to users of this account
        // Path: accountId → AccountUsers (get userIds) → Agents → companyIds
        var userIds = await _db.AccountUsers
            .Where(au => au.AccountId == accountId && au.IsActive)
            .Select(au => au.UserId)
            .ToListAsync(ct);

        if (!userIds.Any()) return (int)limit > 0;

        var companyIds = await _db.Set<Domain.Entities.Agent>()
            .Where(a => userIds.Contains(a.UserId) && a.CompanyId != null)
            .Select(a => a.CompanyId!.Value)
            .Distinct()
            .ToListAsync(ct);

        if (!companyIds.Any()) return (int)limit > 0;

        // Count only active users with Agent role belonging to those companies
        var agentCount = await (
            from a in _db.Set<Domain.Entities.Agent>()
            join u in _db.Users on a.UserId equals u.Id
            where a.CompanyId != null
               && companyIds.Contains(a.CompanyId!.Value)
               && u.Role == UserRole.Agent
               && u.IsActive
            select a.Id
        ).CountAsync(ct);

        return agentCount < (int)limit;
    }

    // ── CanUploadVideoAsync ───────────────────────────────────────────────
    public async Task<bool> CanUploadVideoAsync(Guid accountId, CancellationToken ct = default)
    {
        await ThrowIfSubscriptionExpiredAsync(accountId, ct);
        return await HasFeatureAsync(accountId, SubscriptionKeys.VideoUpload, ct);
    }

    // ── GetImageLimitAsync ────────────────────────────────────────────────
    // Returns max images allowed per listing for the account's active plan.
    // -1 = unlimited, 0 = not defined / no active subscription.
    public async Task<int> GetImageLimitAsync(Guid accountId, CancellationToken ct = default)
    {
        var value = await GetLimitAsync(accountId, SubscriptionKeys.MaxImagesPerListing, ct);
        return (int)value;
    }

    // ── CanCreateProjectAsync ─────────────────────────────────────────────
    // FIX 2: Removed "if (!companyIds.Any()) return true" bypass.
    //         An account with no linked companies counts 0 projects;
    //         0 < limit still evaluates correctly without bypassing the check.
    public async Task<bool> CanCreateProjectAsync(Guid accountId, CancellationToken ct = default)
    {
        // FIX 5: Throw SUBSCRIPTION_EXPIRED before returning a generic "limit=0"
        await ThrowIfSubscriptionExpiredAsync(accountId, ct);

        // 1. Feature gate: project_management must be enabled on the plan
        var hasFeature = await HasFeatureAsync(accountId, SubscriptionKeys.ProjectManagement, ct);
        if (!hasFeature) return false;

        // 2. Limit gate: max_projects
        var limit = await GetLimitAsync(accountId, SubscriptionKeys.MaxProjects, ct);

        if (limit == -1) return true;   // unlimited
        if (limit == 0)  return false;  // plan has no project access

        // 3. Count current projects via company ownership path
        var userIds = await _db.AccountUsers
            .Where(au => au.AccountId == accountId && au.IsActive)
            .Select(au => au.UserId)
            .ToListAsync(ct);

        var companyIds = await _db.Set<Domain.Entities.Agent>()
            .Where(a => userIds.Contains(a.UserId) && a.CompanyId != null)
            .Select(a => a.CompanyId!.Value)
            .Distinct()
            .ToListAsync(ct);

        // FIX 2: No early return — let count fall through (0 < limit = allowed)
        var projectCount = companyIds.Count == 0
            ? 0
            : await _db.Projects
                .Where(p => companyIds.Contains(p.CompanyId))
                .CountAsync(ct);

        return projectCount < (int)limit;
    }
}
