using Boioot.Application.Exceptions;
using Boioot.Application.Features.Subscriptions;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Subscriptions;

/// <summary>
/// User-centric enforcement facade — Phase 3B.
/// Resolves userId → accountId via IAccountResolver, then delegates to IPlanEntitlementService.
/// This is the primary entry-point for all cross-cutting plan enforcement.
///
/// Design principles:
/// - "Fail-open" when the user has no account (no subscription = public/free access).
/// - All enforcement uses the existing exception types so the global error handler handles them.
/// - All blocks are logged at Warning level for audit and monitoring.
/// </summary>
public sealed class CurrentUserCapabilitiesService : ICurrentUserCapabilities
{
    private readonly IAccountResolver        _resolver;
    private readonly IPlanEntitlementService _entitlement;
    private readonly ILogger<CurrentUserCapabilitiesService> _logger;

    public CurrentUserCapabilitiesService(
        IAccountResolver        resolver,
        IPlanEntitlementService entitlement,
        ILogger<CurrentUserCapabilitiesService> logger)
    {
        _resolver    = resolver;
        _entitlement = entitlement;
        _logger      = logger;
    }

    // ── HasFeatureAsync ───────────────────────────────────────────────────

    public async Task<bool> HasFeatureAsync(
        Guid userId, string featureKey, CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct);
        if (!accountId.HasValue)
            return false;

        return await _entitlement.HasFeatureAsync(accountId.Value, featureKey, ct);
    }

    // ── CanUseFeatureAsync ────────────────────────────────────────────────

    /// <summary>
    /// Checks BOTH:
    ///   1. Is the feature enabled on the plan?
    ///   2. Is the access policy non-restrictive (not "admin_only")?
    /// Returns false for admin_only features — user cannot self-enable, requires admin grant.
    /// </summary>
    public async Task<bool> CanUseFeatureAsync(
        Guid userId, string featureKey, CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct);
        if (!accountId.HasValue)
            return false;

        // 1. Check access policy first (fast rejection for admin_only features)
        var policy = await _entitlement.GetFeaturePolicyAsync(accountId.Value, featureKey, ct);
        if (!string.IsNullOrEmpty(policy)
            && policy.Equals(SubscriptionKeys.PolicyAdminOnly, StringComparison.OrdinalIgnoreCase))
        {
            return false; // admin_only → user cannot self-activate
        }

        // 2. Check plan enablement
        return await _entitlement.HasFeatureAsync(accountId.Value, featureKey, ct);
    }

    // ── GetLimitAsync ─────────────────────────────────────────────────────

    public async Task<int> GetLimitAsync(
        Guid userId, string limitKey, CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct);
        if (!accountId.HasValue)
            return 0;

        var value = await _entitlement.GetLimitAsync(accountId.Value, limitKey, ct);
        return (int)value;
    }

    // ── IsLimitReachedAsync ───────────────────────────────────────────────

    public async Task<bool> IsLimitReachedAsync(
        Guid userId, string limitKey, int currentUsage, CancellationToken ct = default)
    {
        var limit = await GetLimitAsync(userId, limitKey, ct);
        if (limit == -1) return false; // unlimited
        if (limit == 0)  return true;  // feature not available at all
        return currentUsage >= limit;
    }

    // ── AssertFeatureAsync ────────────────────────────────────────────────

    public async Task AssertFeatureAsync(
        Guid userId, string featureKey, string userMessage, CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct);
        if (!accountId.HasValue)
        {
            // No account = free/public tier — check if feature is available on free plan.
            // Delegating to entitlement with a zero Guid will return false safely.
            _logger.LogWarning(
                "[Enforcement] FeatureBlocked — no account for userId={UserId}, feature='{Key}'",
                userId, featureKey);
            throw new PlanFeatureDisabledException(featureKey, userMessage);
        }

        await _entitlement.EnsureFeatureEnabledAsync(accountId.Value, featureKey, userMessage, ct);
    }

    // ── AssertLimitAsync ──────────────────────────────────────────────────

    public async Task AssertLimitAsync(
        Guid userId, string limitKey, int currentUsage, string userMessage, CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct);
        if (!accountId.HasValue)
        {
            _logger.LogWarning(
                "[Enforcement] LimitExceeded — no account for userId={UserId}, limit='{Key}' (usage={Usage})",
                userId, limitKey, currentUsage);
            throw new PlanLimitException(limitKey, userMessage);
        }

        await _entitlement.EnsureWithinLimitAsync(
            accountId.Value, limitKey, currentUsage, requestedValue: 1, userMessage, ct);
    }

    // ── AssertPolicyAsync ─────────────────────────────────────────────────

    public async Task AssertPolicyAsync(
        Guid userId, string featureKey, string userMessage, CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct);
        if (!accountId.HasValue)
            return; // No account = no policy to enforce.

        await _entitlement.EnsurePolicyAllowedAsync(accountId.Value, featureKey, userMessage, ct);
    }
}
