namespace Boioot.Application.Features.Subscriptions.Interfaces;

/// <summary>
/// Account-centric entitlement service.
/// All methods take <see cref="Guid" accountId"/> — use <see cref="ICurrentUserCapabilities"/>
/// for the user-centric facade that resolves accountId automatically.
/// </summary>
public interface IPlanEntitlementService
{
    /// <summary>
    /// Returns true if the account's active plan has the specified feature enabled.
    /// Returns false if no active subscription, feature not found, or feature is disabled.
    /// </summary>
    Task<bool> HasFeatureAsync(Guid accountId, string featureKey, CancellationToken ct = default);

    /// <summary>
    /// Returns the numeric limit value for the account's active plan.
    /// Returns 0 if no active subscription or limit not defined.
    /// Returns -1 if the limit is unlimited.
    /// </summary>
    Task<decimal> GetLimitAsync(Guid accountId, string limitKey, CancellationToken ct = default);

    /// <summary>
    /// Throws <see cref="Boioot.Application.Exceptions.PlanFeatureDisabledException"/>
    /// if the feature is not enabled on the account's active plan.
    /// Throws <see cref="Boioot.Application.Exceptions.PlanLimitException"/> with
    /// SUBSCRIPTION_EXPIRED if the account's subscription has lapsed.
    /// </summary>
    Task EnsureFeatureEnabledAsync(Guid accountId, string featureKey, string userMessage, CancellationToken ct = default);

    /// <summary>
    /// Throws <see cref="Boioot.Application.Exceptions.PlanLimitException"/>
    /// if adding <paramref name="requestedValue"/> to <paramref name="currentValue"/>
    /// would exceed the plan's limit for <paramref name="limitKey"/>.
    /// </summary>
    Task EnsureWithinLimitAsync(Guid accountId, string limitKey, int currentValue, int requestedValue, string userMessage, CancellationToken ct = default);

    /// <summary>
    /// Returns true if the account can create a new property listing.
    /// Uses the "max_active_listings" limit key.
    /// </summary>
    Task<bool> CanCreatePropertyAsync(Guid accountId, CancellationToken ct = default);

    /// <summary>
    /// Returns true if the account can add a new agent member.
    /// Uses the "max_agents" limit key.
    /// </summary>
    Task<bool> CanAddAgentAsync(Guid accountId, CancellationToken ct = default);

    /// <summary>
    /// Returns true if the account can create a new project.
    /// Requires the "project_management" feature AND checks "max_projects" limit.
    /// </summary>
    Task<bool> CanCreateProjectAsync(Guid accountId, CancellationToken ct = default);

    /// <summary>
    /// Returns true if the account's plan allows video upload for listings.
    /// Uses the "video_upload" feature key.
    /// </summary>
    Task<bool> CanUploadVideoAsync(Guid accountId, CancellationToken ct = default);

    /// <summary>
    /// Returns the maximum number of images allowed per listing.
    /// Returns 0 if no active subscription or limit not defined.
    /// Returns -1 if unlimited.
    /// </summary>
    Task<int> GetImageLimitAsync(Guid accountId, CancellationToken ct = default);

    /// <summary>
    /// Returns the maximum number of videos allowed per listing.
    /// Returns 0 if blocked (video_upload feature disabled or limit=0).
    /// Returns -1 if unlimited.
    /// </summary>
    Task<int> GetVideoLimitAsync(Guid accountId, CancellationToken ct = default);

    /// <summary>
    /// Returns true if the account's plan allows using the internal chat / messaging feature.
    /// Uses the "internal_chat" feature key.
    /// </summary>
    Task<bool> CanUseChatAsync(Guid accountId, CancellationToken ct = default);

    /// <summary>
    /// Returns true if the account's plan includes access to the analytics dashboard.
    /// Uses the "analytics_dashboard" feature key.
    /// </summary>
    Task<bool> CanUseAnalyticsAsync(Guid accountId, CancellationToken ct = default);

    // ── Policy enforcement ────────────────────────────────────────────────

    /// <summary>
    /// Returns the access policy for a feature: "open", "admin_only", "self_service", or null (= "open").
    /// "open"       = subscription plan enables it — anyone on the right plan can use it.
    /// "admin_only" = only admin can grant this feature; user cannot self-enable.
    /// "self_service" = user can toggle within their plan.
    /// </summary>
    Task<string?> GetFeaturePolicyAsync(Guid accountId, string featureKey, CancellationToken ct = default);

    /// <summary>
    /// Throws <see cref="Boioot.Application.Exceptions.PolicyDeniedException"/>
    /// if the feature's AccessPolicy is "admin_only".
    /// Call this before allowing any user-initiated action on policy-gated features.
    /// </summary>
    Task EnsurePolicyAllowedAsync(Guid accountId, string featureKey, string userMessage, CancellationToken ct = default);
}
