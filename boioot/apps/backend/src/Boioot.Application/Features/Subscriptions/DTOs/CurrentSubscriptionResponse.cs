namespace Boioot.Application.Features.Subscriptions.DTOs;

/// <summary>
/// Represents the caller's currently active subscription,
/// including resolved plan entitlements for frontend feature-gating.
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

    // ── Feature entitlements ────────────────────────────────────────────────
    /// <summary>True if the plan includes the analytics dashboard feature.</summary>
    public bool HasAnalyticsDashboard  { get; init; }

    /// <summary>True if the plan allows video upload on listings.</summary>
    public bool HasVideoUpload         { get; init; }

    /// <summary>True if the plan allows featured/promoted listings.</summary>
    public bool HasFeaturedListings    { get; init; }

    /// <summary>True if the plan includes the WhatsApp contact button.</summary>
    public bool HasWhatsappContact     { get; init; }

    /// <summary>True if the plan includes the verified badge.</summary>
    public bool HasVerifiedBadge       { get; init; }

    /// <summary>True if the plan includes homepage exposure.</summary>
    public bool HasHomepageExposure    { get; init; }

    /// <summary>True if the plan includes project management.</summary>
    public bool HasProjectManagement   { get; init; }

    // ── Limit entitlements ──────────────────────────────────────────────────
    /// <summary>Max active listings. -1 = unlimited, 0 = not available.</summary>
    public int MaxActiveListings   { get; init; }

    /// <summary>Max images per listing. -1 = unlimited, 0 = not defined.</summary>
    public int MaxImagesPerListing { get; init; }

    /// <summary>Max agents. -1 = unlimited, 0 = not available.</summary>
    public int MaxAgents           { get; init; }

    /// <summary>Max featured slots. -1 = unlimited, 0 = none.</summary>
    public int MaxFeaturedSlots    { get; init; }
}
