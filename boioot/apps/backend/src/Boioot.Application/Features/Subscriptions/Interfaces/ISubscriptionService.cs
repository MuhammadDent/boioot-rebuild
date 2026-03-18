using Boioot.Application.Features.Subscriptions.DTOs;

namespace Boioot.Application.Features.Subscriptions.Interfaces;

/// <summary>
/// Handles subscription state queries and upgrade-intent evaluation.
/// Does NOT process payments or mutate subscription rows.
/// </summary>
public interface ISubscriptionService
{
    /// <summary>
    /// Returns the caller's current active subscription.
    /// Falls back to the Free plan when no active subscription exists.
    /// Returns null when the user has no account.
    /// </summary>
    Task<CurrentSubscriptionResponse?> GetCurrentAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Evaluates whether moving to <paramref name="request.PricingId"/> is an upgrade,
    /// downgrade, or cycle change. Does NOT commit any changes.
    /// </summary>
    Task<UpgradeIntentResponse> GetUpgradeIntentAsync(
        Guid userId,
        UpgradeIntentRequest request,
        CancellationToken ct = default);
}
