namespace Boioot.Application.Features.Pricing.DTOs;

public record PlanPricingResponse(
    Guid Id,
    Guid PlanId,
    string BillingCycle,
    decimal PriceAmount,
    string CurrencyCode,
    bool IsActive,
    bool IsPublic,
    string? ExternalProvider,
    string? ExternalPriceId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
