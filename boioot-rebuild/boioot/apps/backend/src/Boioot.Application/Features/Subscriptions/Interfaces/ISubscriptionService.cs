using Boioot.Application.Features.Subscriptions.DTOs;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Subscriptions.Interfaces;

/// <summary>
/// Subscription lifecycle service — Phase 3A.
/// Read operations: query current state, history, admin listing, plan capabilities.
/// Write operations: assign, change plan, cancel.
/// Does NOT process payments.
/// </summary>
public interface ISubscriptionService
{
    // ── Queries ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the caller's current active subscription with full capability map
    /// (features, limits, policies). Falls back to the Free plan when no active
    /// subscription exists. Returns null when the user has no account.
    /// Also auto-detects and marks expired subscriptions.
    /// </summary>
    Task<CurrentSubscriptionResponse?> GetCurrentAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Returns full plan capabilities (features, limits, policies) for an account.
    /// Used by enforcement layer (Phase 3B). Falls back to Free plan when no active subscription.
    /// Returns null when the account does not exist.
    /// </summary>
    Task<CurrentSubscriptionResponse?> GetCurrentPlanCapabilitiesAsync(Guid accountId, CancellationToken ct = default);

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

    // ── Pure state helpers ────────────────────────────────────────────────────

    /// <summary>
    /// True when the subscription is currently active and not past its end date.
    /// Covers both Active and Trial statuses within their valid periods.
    /// </summary>
    static bool IsActive(Subscription sub)
    {
        var now = DateTime.UtcNow;
        return sub.IsActive
            && sub.Status is SubscriptionStatus.Active or SubscriptionStatus.Trial
            && (sub.EndDate == null || sub.EndDate > now);
    }

    /// <summary>
    /// True when the subscription is in a trial period that has not yet ended.
    /// </summary>
    static bool IsTrial(Subscription sub)
    {
        var now = DateTime.UtcNow;
        return sub.Status == SubscriptionStatus.Trial
            && (sub.TrialEndsAt == null || sub.TrialEndsAt > now);
    }

    /// <summary>
    /// True when the subscription has definitively expired:
    /// status is Expired, or EndDate is in the past, or it's cancelled and period has ended.
    /// </summary>
    static bool IsExpired(Subscription sub)
    {
        var now = DateTime.UtcNow;
        return sub.Status == SubscriptionStatus.Expired
            || (sub.EndDate.HasValue && sub.EndDate < now)
            || (sub.Status == SubscriptionStatus.Cancelled && sub.EndedAt.HasValue && sub.EndedAt < now);
    }
}
