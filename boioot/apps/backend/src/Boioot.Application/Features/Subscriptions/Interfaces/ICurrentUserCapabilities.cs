namespace Boioot.Application.Features.Subscriptions.Interfaces;

/// <summary>
/// User-centric enforcement facade.
/// All methods accept a <paramref name="userId"/> (the authenticated user's ID) and resolve
/// the linked account internally.  This is the primary entry-point for controller-level
/// and service-level enforcement across the platform.
///
/// Contrast with <see cref="IPlanEntitlementService"/> which is account-centric and lower-level.
/// </summary>
public interface ICurrentUserCapabilities
{
    // ── Feature queries ───────────────────────────────────────────────────

    /// <summary>
    /// Returns true when the user's active plan has this feature enabled.
    /// Returns false when the user has no account or the feature is disabled.
    /// Does NOT check access policy — call <see cref="CanUseFeatureAsync"/> for combined check.
    /// </summary>
    Task<bool> HasFeatureAsync(Guid userId, string featureKey, CancellationToken ct = default);

    /// <summary>
    /// Returns true when the user CAN use this feature:
    ///   1. The plan has the feature enabled, AND
    ///   2. The feature's access policy is not "admin_only".
    /// Use this for gating UI elements or read-access endpoints.
    /// </summary>
    Task<bool> CanUseFeatureAsync(Guid userId, string featureKey, CancellationToken ct = default);

    // ── Limit queries ─────────────────────────────────────────────────────

    /// <summary>
    /// Returns the numeric limit for this key on the user's active plan.
    /// 0  = blocked / not available.
    /// -1 = unlimited.
    /// </summary>
    Task<int> GetLimitAsync(Guid userId, string limitKey, CancellationToken ct = default);

    /// <summary>
    /// Returns true when <paramref name="currentUsage"/> + 1 would exceed the plan limit.
    /// Always returns false when the limit is -1 (unlimited).
    /// </summary>
    Task<bool> IsLimitReachedAsync(Guid userId, string limitKey, int currentUsage, CancellationToken ct = default);

    // ── Enforcement (throwing) ────────────────────────────────────────────

    /// <summary>
    /// Throws <see cref="Boioot.Application.Exceptions.PlanFeatureDisabledException"/> (HTTP 403)
    /// if the user's plan does not have this feature enabled.
    /// Includes auto-expiry detection: throws SUBSCRIPTION_EXPIRED if the plan has lapsed.
    /// </summary>
    Task AssertFeatureAsync(Guid userId, string featureKey, string userMessage, CancellationToken ct = default);

    /// <summary>
    /// Throws <see cref="Boioot.Application.Exceptions.PlanLimitException"/> (HTTP 403)
    /// if <paramref name="currentUsage"/> + 1 would exceed the plan limit for <paramref name="limitKey"/>.
    /// Always passes when the limit is -1 (unlimited).
    /// </summary>
    Task AssertLimitAsync(Guid userId, string limitKey, int currentUsage, string userMessage, CancellationToken ct = default);

    /// <summary>
    /// Throws <see cref="Boioot.Application.Exceptions.PolicyDeniedException"/> (HTTP 403)
    /// if the feature's AccessPolicy is "admin_only".
    /// Call this before allowing any user-initiated action on policy-gated features.
    /// </summary>
    Task AssertPolicyAsync(Guid userId, string featureKey, string userMessage, CancellationToken ct = default);
}
