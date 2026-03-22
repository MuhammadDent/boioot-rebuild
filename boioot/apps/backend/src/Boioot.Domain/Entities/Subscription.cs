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

    public Account Account { get; set; } = null!;
    public Plan Plan { get; set; } = null!;
}
