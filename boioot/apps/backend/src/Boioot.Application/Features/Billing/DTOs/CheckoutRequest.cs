using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Billing.DTOs;

public sealed class CheckoutRequest
{
    /// <summary>The PlanPricing ID the user wants to subscribe to.</summary>
    [Required]
    public Guid PricingId { get; init; }

    /// <summary>
    /// Optional provider override: "stripe" or "internal".
    /// Only honoured when the plan's BillingMode is "Hybrid".
    /// Ignored for InternalOnly and StripeOnly plans — the plan governs the provider.
    /// </summary>
    public string? Provider { get; init; }
}
