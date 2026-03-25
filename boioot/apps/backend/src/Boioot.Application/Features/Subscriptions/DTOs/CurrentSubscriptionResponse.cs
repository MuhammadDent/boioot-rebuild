namespace Boioot.Application.Features.Subscriptions.DTOs;

/// <summary>
/// Represents the caller's currently active subscription,
/// including resolved plan entitlements for frontend feature-gating.
/// Phase 3A: full lifecycle dates + dynamic capability maps (features, limits, policies).
/// </summary>
public sealed class CurrentSubscriptionResponse
{
    public Guid   SubscriptionId { get; init; }
    public Guid   PlanId         { get; init; }
    public string PlanName       { get; init; } = string.Empty;
    public string? PlanCode      { get; init; }
    public string? AudienceType  { get; init; }
    public string? Tier          { get; init; }

    /// <summary>The PlanPricing row in use. Null when defaulting to Free (no subscription).</summary>
    public Guid?  PricingId    { get; init; }

    public string BillingCycle { get; init; } = "Monthly";
    public decimal PriceAmount { get; init; }
    public string CurrencyCode { get; init; } = "SYP";

    /// <summary>Ordinal used for upgrade/downgrade comparison.</summary>
    public int    Rank         { get; init; }

    /// <summary>Subscription status string, or "Free" when no subscription exists.</summary>
    public string Status       { get; init; } = "Free";

    public bool   IsActive     { get; init; }
    public bool   AutoRenew    { get; init; }

    // ── Lifecycle dates ─────────────────────────────────────────────────────
    public DateTime  StartDate           { get; init; }
    public DateTime? EndDate             { get; init; }
    public DateTime? TrialEndsAt         { get; init; }
    public DateTime? CurrentPeriodStart  { get; init; }
    public DateTime? CurrentPeriodEnd    { get; init; }
    public DateTime? CanceledAt          { get; init; }
    public DateTime? EndedAt             { get; init; }

    // ── Computed state helpers (derived from dates + status) ────────────────
    /// <summary>True if the subscription is currently in an active trial period.</summary>
    public bool IsTrial   { get; init; }
    /// <summary>True if the subscription has expired (EndDate passed or status = Expired).</summary>
    public bool IsExpired { get; init; }
    /// <summary>True if the subscription is cancelled.</summary>
    public bool IsCanceled { get; init; }

    // ── Backward-compat named entitlements (kept for existing consumers) ────
    public bool HasAnalyticsDashboard  { get; init; }
    public bool HasVideoUpload         { get; init; }
    public bool HasFeaturedListings    { get; init; }
    public bool HasWhatsappContact     { get; init; }
    public bool HasVerifiedBadge       { get; init; }
    public bool HasHomepageExposure    { get; init; }
    public bool HasProjectManagement   { get; init; }

    /// <summary>Max active listings. -1 = unlimited, 0 = not available.</summary>
    public int MaxActiveListings   { get; init; }
    /// <summary>Max images per listing. -1 = unlimited, 0 = not defined.</summary>
    public int MaxImagesPerListing { get; init; }
    /// <summary>Max agents. -1 = unlimited, 0 = not available.</summary>
    public int MaxAgents           { get; init; }
    /// <summary>Max featured slots. -1 = unlimited, 0 = none.</summary>
    public int MaxFeaturedSlots    { get; init; }

    // ── Dynamic capability maps (Phase 3A — full resolution for Phase 3B enforcement) ──

    /// <summary>All boolean feature flags for this plan. key → enabled.</summary>
    public Dictionary<string, bool> Features { get; init; } = [];

    /// <summary>All numeric limits for this plan. key → value (-1 = unlimited).</summary>
    public Dictionary<string, int> Limits { get; init; } = [];

    /// <summary>
    /// Access policies for non-default features.
    /// key → policy string.
    /// "open"       = enabled by the plan automatically (not shown here — default).
    /// "admin_only" = can only be granted by admin, not self-serviceable.
    /// Only features with non-open policies appear in this map.
    /// </summary>
    public Dictionary<string, string> Policies { get; init; } = [];
}
