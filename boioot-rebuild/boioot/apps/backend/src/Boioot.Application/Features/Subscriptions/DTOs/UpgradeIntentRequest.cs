using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Subscriptions.DTOs;

public sealed class UpgradeIntentRequest
{
    /// <summary>The PlanPricing ID the user wants to move to.</summary>
    [Required]
    public Guid PricingId { get; init; }
}
