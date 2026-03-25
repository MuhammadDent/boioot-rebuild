using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Subscriptions.DTOs;

public sealed class ChangePlanRequest
{
    [Required]
    public Guid PlanId { get; init; }

    /// <summary>Optional PlanPricing ID for the billing cycle choice.</summary>
    public Guid? PricingId { get; init; }

    [MaxLength(500)]
    public string? Notes { get; init; }
}
