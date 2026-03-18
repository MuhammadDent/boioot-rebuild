namespace Boioot.Application.Features.Pricing.DTOs;

/// <summary>
/// Full public pricing card for one plan.
/// Returned by GET /api/public/pricing — no auth required.
/// </summary>
public record PublicPricingItem(
    Guid PlanId,
    string PlanName,
    string? Description,
    string? ApplicableAccountType,
    List<PublicPricingEntry> Pricing,
    List<PublicLimitItem> Limits,
    List<PublicFeatureItem> Features
);

/// <summary>Single pricing tier (e.g., Monthly or Yearly).</summary>
public record PublicPricingEntry(
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
