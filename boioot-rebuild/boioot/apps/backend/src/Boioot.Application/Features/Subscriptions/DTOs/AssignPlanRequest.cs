using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Subscriptions.DTOs;

public sealed class AssignPlanRequest
{
    [Required]
    public Guid AccountId { get; init; }

    [Required]
    public Guid PlanId { get; init; }

    /// <summary>Optional PlanPricing ID (captures billing cycle + price). Null = Free/no pricing.</summary>
    public Guid? PricingId { get; init; }

    /// <summary>Admin note about why this plan is being assigned.</summary>
    [MaxLength(500)]
    public string? Notes { get; init; }
}
