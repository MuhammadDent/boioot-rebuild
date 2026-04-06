namespace Boioot.Application.Features.Pricing.DTOs;

/// <summary>
/// Full public pricing card for one plan.
/// Returned by GET /api/public/pricing — no auth required.
/// </summary>
public record PublicPricingItem(
    Guid PlanId,
    string PlanName,
    /// <summary>Primary Arabic display name — use this in UI instead of PlanName.</summary>
    string? DisplayNameAr,
    /// <summary>seeker | owner | broker | office | company</summary>
    string? AudienceType,
    /// <summary>free | basic | advanced | enterprise</summary>
    string? Tier,
    string? Description,
    string? ApplicableAccountType,
    /// <summary>Ordinal rank for upgrade/downgrade comparison (higher = more advanced).</summary>
    int Rank,
    /// <summary>Sort order on the public pricing page. Lower = appears first.</summary>
    int DisplayOrder,
    /// <summary>When true, this plan is highlighted as recommended.</summary>
    bool IsRecommended,
    /// <summary>Groups plans on the pricing page: "Individual" | "Business" | null.</summary>
    string? PlanCategory,
    List<PublicPricingEntry> Pricing,
    List<PublicLimitItem> Limits,
    List<PublicFeatureItem> Features
);

/// <summary>Single pricing tier (e.g., Monthly or Yearly).</summary>
public record PublicPricingEntry(
    /// <summary>The PlanPricing row ID — used for upgrade intent calls.</summary>
    Guid PricingId,
    string BillingCycle,
    decimal PriceAmount,
    string CurrencyCode
);

/// <summary>Limit value exposed publicly.</summary>
public record PublicLimitItem(
    string Key,
    string Name,
    decimal Value,
    string? Unit
);

/// <summary>Feature toggle exposed publicly.</summary>
public record PublicFeatureItem(
    string Key,
    string Name,
    bool IsEnabled,
    string? FeatureGroup
);
