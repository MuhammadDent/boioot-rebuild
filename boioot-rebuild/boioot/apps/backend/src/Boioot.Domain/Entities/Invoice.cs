using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

/// <summary>
/// Represents a billing invoice created when a user initiates a subscription upgrade.
/// Tracks payment status through the manual bank-transfer flow.
/// Designed to be provider-agnostic — the ProviderName column records which
/// billing provider (e.g., "internal", "stripe") issued this invoice.
/// </summary>
public class Invoice : BaseEntity
{
    public Guid UserId { get; set; }

    public Guid PlanPricingId { get; set; }

    /// <summary>Denormalized from PlanPricing at creation time for historical accuracy.</summary>
    public decimal Amount { get; set; }

    /// <summary>ISO 4217 currency code. E.g., "SYP".</summary>
    public string Currency { get; set; } = "SYP";

    public InvoiceStatus Status { get; set; } = InvoiceStatus.Pending;

    /// <summary>Billing provider that issued this invoice: "internal", "stripe", etc.</summary>
    public string ProviderName { get; set; } = "internal";

    /// <summary>Optional external reference from the payment provider (e.g., Stripe Checkout Session ID).</summary>
    public string? ExternalRef { get; set; }

    /// <summary>
    /// Stripe hosted checkout URL. Populated only for Stripe-provider invoices.
    /// Stored so users can resume checkout if they navigate away.
    /// </summary>
    public string? StripeSessionUrl { get; set; }

    /// <summary>Admin note when confirming or rejecting the payment.</summary>
    public string? AdminNote { get; set; }

    /// <summary>
    /// When this invoice can no longer be acted upon.
    /// Null for invoices created before expiry was introduced (treated as non-expiring).
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>Admin who confirmed the payment (audit trail).</summary>
    public Guid? ApprovedBy { get; set; }

    /// <summary>When the payment was confirmed by an admin.</summary>
    public DateTime? ApprovedAt { get; set; }

    /// <summary>Admin who rejected the payment (audit trail).</summary>
    public Guid? RejectedBy { get; set; }

    /// <summary>When the payment was rejected by an admin.</summary>
    public DateTime? RejectedAt { get; set; }

    public User User { get; set; } = null!;
    public PlanPricing PlanPricing { get; set; } = null!;
    public PaymentProof? PaymentProof { get; set; }
}
