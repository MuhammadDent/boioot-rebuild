namespace Boioot.Domain.Entities;

/// <summary>
/// Normalized pricing entry for a subscription plan.
/// A single plan can have multiple PlanPricing rows (e.g., Monthly + Yearly).
/// This table is the source-of-truth for billing amounts.
/// It does NOT affect PlanLimits, PlanFeatures, or enforcement logic.
/// </summary>
public class PlanPricing : BaseEntity
{
    public Guid PlanId { get; set; }

    /// <summary>Billing cycle: 'Monthly', 'Yearly', or 'OneTime'.</summary>
    public string BillingCycle { get; set; } = "Monthly";

    /// <summary>Price amount in the given currency.</summary>
    public decimal PriceAmount { get; set; } = 0;

    /// <summary>ISO 4217 currency code. Default: SYP.</summary>
    public string CurrencyCode { get; set; } = "SYP";

    /// <summary>When false, this pricing option cannot be subscribed to.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>When false, hidden from the public pricing page.</summary>
    public bool IsPublic { get; set; } = true;

    /// <summary>Optional external payment provider name (e.g., 'stripe', 'paypal').</summary>
    public string? ExternalProvider { get; set; }

    /// <summary>Optional external price ID from the payment provider.</summary>
    public string? ExternalPriceId { get; set; }

    public Plan Plan { get; set; } = null!;
}
