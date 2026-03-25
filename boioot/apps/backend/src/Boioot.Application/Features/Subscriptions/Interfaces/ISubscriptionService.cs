using Boioot.Application.Features.Subscriptions.DTOs;

namespace Boioot.Application.Features.Subscriptions.Interfaces;

/// <summary>
/// Subscription lifecycle service.
/// Read operations: query current state, history, admin listing.
/// Write operations: assign, change plan, cancel.
/// Does NOT process payments.
/// </summary>
public interface ISubscriptionService
{
    // ── Queries ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the caller's current active subscription with full capability map.
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

    /// <summary>Returns the subscription change history for the caller's account.</summary>
    Task<List<SubscriptionHistoryDto>> GetHistoryAsync(Guid userId, CancellationToken ct = default);

    // ── Mutations ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Admin: assign a plan directly to an account.
    /// Creates or replaces the active subscription. Records a history event.
    /// </summary>
    Task<CurrentSubscriptionResponse> AssignPlanAsync(
        Guid adminUserId,
        AssignPlanRequest request,
        CancellationToken ct = default);

    /// <summary>
    /// User: change to a different plan (upgrade or downgrade).
    /// Updates the existing subscription. Records a history event.
    /// </summary>
    Task<CurrentSubscriptionResponse> ChangePlanAsync(
        Guid userId,
        ChangePlanRequest request,
        CancellationToken ct = default);

    /// <summary>
    /// Cancel the caller's current subscription.
    /// Sets CanceledAt, status to Cancelled, IsActive to false. Records a history event.
    /// </summary>
    Task<CurrentSubscriptionResponse> CancelAsync(
        Guid userId,
        CancelSubscriptionRequest request,
        CancellationToken ct = default);

    // ── Admin queries ─────────────────────────────────────────────────────────

    /// <summary>Returns all subscriptions for the admin panel (paginated).</summary>
    Task<List<AdminSubscriptionDto>> GetAllSubscriptionsAsync(
        int page, int pageSize, string? statusFilter, CancellationToken ct = default);

    /// <summary>Returns the subscription history for a given account (admin view).</summary>
    Task<List<SubscriptionHistoryDto>> GetHistoryByAccountAsync(
        Guid accountId, CancellationToken ct = default);
}
