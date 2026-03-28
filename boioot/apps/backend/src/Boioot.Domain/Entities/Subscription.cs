using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Subscription : BaseEntity
{
    public Guid AccountId { get; set; }

    public Guid PlanId { get; set; }

    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Trial;

    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public string? PaymentRef { get; set; }

    /// <summary>
    /// The specific PlanPricing row the user subscribed to (captures billing cycle + amount).
    /// Nullable for legacy rows created before this column existed.
    /// </summary>
    public Guid? PricingId { get; set; }

    /// <summary>Explicit active flag. Set to false when cancelling/expiring without changing Status.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Whether the subscription should auto-renew at end of billing cycle.</summary>
    public bool AutoRenew { get; set; } = true;

    // ── Phase 3A lifecycle fields ─────────────────────────────────────────────

    /// <summary>UTC end of any free trial period. Null when no trial applies.</summary>
    public DateTime? TrialEndsAt { get; set; }

    /// <summary>Start of the current billing cycle (UTC). Null for free/trial-only subs.</summary>
    public DateTime? CurrentPeriodStart { get; set; }

    /// <summary>End of the current billing cycle (UTC). Null for free/open-ended subs.</summary>
    public DateTime? CurrentPeriodEnd { get; set; }

    /// <summary>When the subscription was cancelled (UTC). Null if not cancelled.</summary>
    public DateTime? CanceledAt { get; set; }

    /// <summary>When the subscription definitively ended (UTC). Null while still active.</summary>
    public DateTime? EndedAt { get; set; }

    /// <summary>Reserved for future payment gateway: e.g. "stripe", "paypal". Null = manual.</summary>
    public string? ExternalProvider { get; set; }

    /// <summary>External subscription reference ID from the payment gateway.</summary>
    public string? ExternalSubscriptionId { get; set; }

    // ── Consumption Tracking ──────────────────────────────────────────────────

    /// <summary>
    /// Number of listings created/published under this subscription.
    /// Used for plans with ConsumptionPolicy = "listing_quota" or "expire_by_whichever_comes_first".
    /// Incremented on each listing creation. Compared against Plan.ListingLimit to detect exhaustion.
    /// </summary>
    public int ListingQuotaUsed { get; set; } = 0;

    // ── Navigation ────────────────────────────────────────────────────────────

    public Account Account { get; set; } = null!;
    public Plan Plan { get; set; } = null!;
    public ICollection<SubscriptionHistory> History { get; set; } = [];
}
