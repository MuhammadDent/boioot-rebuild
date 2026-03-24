namespace Boioot.Application.Features.Subscriptions.Interfaces;

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
}
