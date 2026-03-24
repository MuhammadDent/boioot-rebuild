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

    // ── Detect expired subscription and throw dedicated error ─────────────
    private async Task ThrowIfSubscriptionExpiredAsync(Guid accountId, CancellationToken ct)
    {
        var activePlanId = await GetActivePlanIdAsync(accountId, ct);
        if (activePlanId.HasValue) return;

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

    // ── EnsureFeatureEnabledAsync ─────────────────────────────────────────
    public async Task EnsureFeatureEnabledAsync(
        Guid   accountId,
        string featureKey,
        string userMessage,
        CancellationToken ct = default)
    {
        await ThrowIfSubscriptionExpiredAsync(accountId, ct);

        var enabled = await HasFeatureAsync(accountId, featureKey, ct);
        if (!enabled)
            throw new PlanFeatureDisabledException(featureKey, userMessage);
    }

    // ── EnsureWithinLimitAsync ────────────────────────────────────────────
    public async Task EnsureWithinLimitAsync(
        Guid   accountId,
        string limitKey,
        int    currentValue,
        int    requestedValue,
        string userMessage,
        CancellationToken ct = default)
    {
        await ThrowIfSubscriptionExpiredAsync(accountId, ct);

        var limit = await GetLimitAsync(accountId, limitKey, ct);

        if (limit == -1) return; // unlimited — always allowed

        if (limit == 0)
            throw new PlanLimitException(
                limitKey:        limitKey,
                message:         userMessage,
                upgradeRequired: true);

        if (currentValue + requestedValue > (int)limit)
            throw new PlanLimitException(
                limitKey:        limitKey,
                message:         userMessage,
                upgradeRequired: true);
    }

    // ── CanCreatePropertyAsync ────────────────────────────────────────────
    public async Task<bool> CanCreatePropertyAsync(Guid accountId, CancellationToken ct = default)
    {
        await ThrowIfSubscriptionExpiredAsync(accountId, ct);

        var limit = await GetLimitAsync(accountId, SubscriptionKeys.MaxActiveListings, ct);

        if (limit == -1) return true;
        if (limit == 0)  return false;

        var activeCount = await _db.Properties
            .Where(p => p.AccountId == accountId
                     && p.IsDeleted == false
                     && (p.Status == PropertyStatus.Available ||
                         p.Status == PropertyStatus.Inactive))
            .CountAsync(ct);

        return activeCount < (int)limit;
    }

    // ── CanAddAgentAsync ──────────────────────────────────────────────────
    public async Task<bool> CanAddAgentAsync(Guid accountId, CancellationToken ct = default)
    {
        await ThrowIfSubscriptionExpiredAsync(accountId, ct);

        var limit = await GetLimitAsync(accountId, SubscriptionKeys.MaxAgents, ct);

        if (limit == -1) return true;
        if (limit == 0)  return false;

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
    public async Task<int> GetImageLimitAsync(Guid accountId, CancellationToken ct = default)
    {
        var value = await GetLimitAsync(accountId, SubscriptionKeys.MaxImagesPerListing, ct);
        return (int)value;
    }

    // ── GetVideoLimitAsync ────────────────────────────────────────────────
    /// <summary>
    /// Returns the max videos per listing for the active plan.
    /// 0 = blocked (video_upload feature disabled or limit=0).
    /// -1 = unlimited.
    /// </summary>
    public async Task<int> GetVideoLimitAsync(Guid accountId, CancellationToken ct = default)
    {
        // Primary gate: video_upload feature must be enabled
        var canVideo = await HasFeatureAsync(accountId, SubscriptionKeys.VideoUpload, ct);
        if (!canVideo) return 0;

        // Secondary gate: numeric limit
        var value = await GetLimitAsync(accountId, SubscriptionKeys.MaxVideosPerListing, ct);
        return (int)value;
    }

    // ── CanUseChatAsync ───────────────────────────────────────────────────
    public async Task<bool> CanUseChatAsync(Guid accountId, CancellationToken ct = default)
    {
        await ThrowIfSubscriptionExpiredAsync(accountId, ct);
        return await HasFeatureAsync(accountId, SubscriptionKeys.InternalChat, ct);
    }

    // ── CanUseAnalyticsAsync ──────────────────────────────────────────────
    public async Task<bool> CanUseAnalyticsAsync(Guid accountId, CancellationToken ct = default)
    {
        await ThrowIfSubscriptionExpiredAsync(accountId, ct);
        return await HasFeatureAsync(accountId, SubscriptionKeys.AnalyticsDashboard, ct);
    }

    // ── CanCreateProjectAsync ─────────────────────────────────────────────
    public async Task<bool> CanCreateProjectAsync(Guid accountId, CancellationToken ct = default)
    {
        await ThrowIfSubscriptionExpiredAsync(accountId, ct);

        var hasFeature = await HasFeatureAsync(accountId, SubscriptionKeys.ProjectManagement, ct);
        if (!hasFeature) return false;

        var limit = await GetLimitAsync(accountId, SubscriptionKeys.MaxProjects, ct);

        if (limit == -1) return true;
        if (limit == 0)  return false;

        var userIds = await _db.AccountUsers
            .Where(au => au.AccountId == accountId && au.IsActive)
            .Select(au => au.UserId)
            .ToListAsync(ct);

        var companyIds = await _db.Set<Domain.Entities.Agent>()
            .Where(a => userIds.Contains(a.UserId) && a.CompanyId != null)
            .Select(a => a.CompanyId!.Value)
            .Distinct()
            .ToListAsync(ct);

        var projectCount = companyIds.Count == 0
            ? 0
            : await _db.Projects
                .Where(p => companyIds.Contains(p.CompanyId))
                .CountAsync(ct);

        return projectCount < (int)limit;
    }
}
