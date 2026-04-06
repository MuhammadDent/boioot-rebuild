using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.SubscriptionPayments.DTOs;

public class CreatePaymentRequestDto
{
    [Required]
    public Guid PlanId { get; set; }

    /// <summary>Optional — locks a specific PlanPricing row (billing cycle + amount).</summary>
    public Guid? PricingId { get; set; }

    /// <summary>"Monthly" | "Yearly". Used when PricingId is null.</summary>
    public string BillingCycle { get; set; } = "Monthly";

    /// <summary>
    /// Payment method key from PaymentMethodKeys:
    /// "bank_transfer" | "cash_to_sales_rep" | "receipt_upload" | "online_gateway" | "other_manual"
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string PaymentMethod { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? CustomerNote { get; set; }

    /// <summary>For cash_to_sales_rep: name of the representative the customer paid.</summary>
    [MaxLength(200)]
    public string? SalesRepresentativeName { get; set; }
}
