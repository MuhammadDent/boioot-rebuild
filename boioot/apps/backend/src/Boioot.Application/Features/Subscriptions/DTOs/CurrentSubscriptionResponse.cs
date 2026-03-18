namespace Boioot.Application.Features.Subscriptions.DTOs;

/// <summary>
/// Represents the caller's currently active subscription.
/// When the user has no subscription, defaults to the Free plan.
/// </summary>
public sealed class CurrentSubscriptionResponse
{
    public Guid   PlanId       { get; init; }
    public string PlanName     { get; init; } = string.Empty;

    /// <summary>The PlanPricing row in use. Null when defaulting to Free (no subscription).</summary>
    public Guid?  PricingId    { get; init; }

    public string BillingCycle { get; init; } = "Monthly";
    public decimal PriceAmount { get; init; }
    public string CurrencyCode { get; init; } = "SYP";

    /// <summary>Ordinal used for upgrade/downgrade comparison.</summary>
    public int    Rank         { get; init; }

    /// <summary>Subscription status string, or "Free" when no subscription exists.</summary>
    public string Status       { get; init; } = "Free";
}
