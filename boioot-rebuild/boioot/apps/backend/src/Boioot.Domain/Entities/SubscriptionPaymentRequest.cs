using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

/// <summary>
/// Represents a customer's intent to subscribe to a plan via a specific payment method.
///
/// Architecture contract:
///   SubscriptionPlan        — what is being offered (pricing, features)
///   AccountSubscription     — the active entitlement after payment
///   SubscriptionPaymentRequest — the payment event / checkout lifecycle
///
/// Manual flow:  Pending → AwaitingPayment → ReceiptUploaded → UnderReview → Approved → Activated
/// Online flow:  Pending → Paid → Activated   (future: auto-confirmed by gateway webhook)
/// </summary>
public class SubscriptionPaymentRequest : BaseEntity
{
    // ── Who and what ──────────────────────────────────────────────────────

    public Guid AccountId { get; set; }

    /// <summary>The user who initiated the request (account admin/owner).</summary>
    public Guid UserId { get; set; }

    public Guid RequestedPlanId { get; set; }

    /// <summary>Specific PlanPricing row — captures billing cycle + locked amount.</summary>
    public Guid? RequestedPricingId { get; set; }

    /// <summary>"Monthly" | "Yearly" — fallback when RequestedPricingId is null.</summary>
    public string BillingCycle { get; set; } = "Monthly";

    // ── Payment details ───────────────────────────────────────────────────

    /// <summary>Amount locked at request time (in case pricing changes later).</summary>
    public decimal Amount { get; set; }

    public string Currency { get; set; } = "USD";

    /// <summary>
    /// String key from PaymentMethodKeys:
    /// "bank_transfer" | "cash_to_sales_rep" | "receipt_upload" | "online_gateway" | "other_manual"
    /// </summary>
    public string PaymentMethod { get; set; } = string.Empty;

    /// <summary>
    /// "manual" | "online" | "hybrid" — derived from PaymentMethod at creation time.
    /// Stored to allow future filtering/routing without re-deriving.
    /// </summary>
    public string PaymentFlowType { get; set; } = "manual";

    // ── Customer-supplied data ────────────────────────────────────────────

    public string? ReceiptImageUrl  { get; set; }
    public string? ReceiptFileName  { get; set; }
    public string? CustomerNote     { get; set; }

    /// <summary>Free-text name of the sales rep (for cash_to_sales_rep flow).</summary>
    public string? SalesRepresentativeName { get; set; }

    /// <summary>Future: FK to a SalesRepresentatives table.</summary>
    public Guid? SalesRepresentativeId { get; set; }

    // ── Status and review ─────────────────────────────────────────────────

    public PaymentRequestStatus Status { get; set; } = PaymentRequestStatus.Pending;

    public Guid?   ReviewedByUserId        { get; set; }
    public string? ReviewNote              { get; set; }

    /// <summary>For online gateways: session ID, transaction ID, etc.</summary>
    public string? ExternalPaymentReference { get; set; }

    // ── Timestamps ────────────────────────────────────────────────────────

    public DateTime? ReviewedAt  { get; set; }
    public DateTime? ActivatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // ── Navigation properties ─────────────────────────────────────────────

    public Account? Account { get; set; }
    public Plan?    Plan    { get; set; }
}
