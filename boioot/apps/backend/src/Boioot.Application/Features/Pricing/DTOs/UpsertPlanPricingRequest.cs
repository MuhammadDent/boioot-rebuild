using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Pricing.DTOs;

public record UpsertPlanPricingRequest(
    [Required] string BillingCycle,
    [Required][Range(0, double.MaxValue)] decimal PriceAmount,
    [Required] string CurrencyCode,
    bool IsActive,
    bool IsPublic,
    string? ExternalProvider,
    string? ExternalPriceId
);
