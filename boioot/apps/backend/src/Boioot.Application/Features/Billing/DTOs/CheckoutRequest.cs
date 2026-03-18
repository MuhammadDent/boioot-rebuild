using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Billing.DTOs;

public sealed class CheckoutRequest
{
    /// <summary>The PlanPricing ID the user wants to subscribe to.</summary>
    [Required]
    public Guid PricingId { get; init; }
}
