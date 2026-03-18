namespace Boioot.Application.Features.Billing.Interfaces;

/// <summary>
/// Pluggable billing backend.
/// Implementations: InternalBillingProvider (bank transfer) → later: StripeBillingProvider.
/// </summary>
public interface IBillingProvider
{
    /// <summary>Machine-readable name: "internal", "stripe", etc.</summary>
    string ProviderName { get; }

    /// <summary>
    /// Creates a payment record in the provider's system.
    /// For internal: creates an Invoice row and returns its ID.
    /// For Stripe: creates a Checkout Session and returns the redirect URL.
    /// </summary>
    Task<BillingProviderResult> CreatePaymentAsync(
        BillingPaymentRequest request,
        CancellationToken ct = default);

    /// <summary>
    /// Marks the payment as confirmed/paid.
    /// For internal: called by admin action.
    /// For Stripe: called after webhook verification.
    /// </summary>
    Task ConfirmPaymentAsync(Guid invoiceId, string? adminNote, Guid adminId, CancellationToken ct = default);

    /// <summary>
    /// Marks the payment as failed/rejected.
    /// </summary>
    Task RejectPaymentAsync(Guid invoiceId, string? adminNote, Guid adminId, CancellationToken ct = default);
}

/// <summary>Input to IBillingProvider.CreatePaymentAsync.</summary>
public sealed record BillingPaymentRequest(
    Guid      UserId,
    Guid      PlanPricingId,
    decimal   Amount,
    string    Currency,
    string    PlanName,
    string    BillingCycle,
    DateTime  ExpiresAt
);

/// <summary>Output from IBillingProvider.CreatePaymentAsync.</summary>
public sealed record BillingProviderResult(
    Guid    InvoiceId,
    string  ProviderName,

    /// <summary>
    /// For Stripe: the hosted checkout URL.
    /// For internal: null — user stays on the page and uploads proof.
    /// </summary>
    string? SessionUrl = null
);
