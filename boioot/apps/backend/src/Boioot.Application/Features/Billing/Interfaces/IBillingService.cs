using Boioot.Application.Features.Billing.DTOs;

namespace Boioot.Application.Features.Billing.Interfaces;

/// <summary>
/// Application-level billing service.
/// Orchestrates between the billing provider, invoice storage, and subscription activation.
/// </summary>
public interface IBillingService
{
    // ── User-facing ──────────────────────────────────────────────────────────

    /// <summary>
    /// Creates an invoice for the requested pricing and returns its details.
    /// This is the "confirm" action from the upgrade modal.
    /// </summary>
    Task<InvoiceResponse> CreateCheckoutAsync(
        Guid userId,
        CheckoutRequest request,
        CancellationToken ct = default);

    /// <summary>Returns all invoices belonging to the caller.</summary>
    Task<List<InvoiceResponse>> GetUserInvoicesAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Attaches a payment proof (image URL + optional notes) to an invoice.
    /// The invoice must be Pending and belong to the caller.
    /// </summary>
    Task<InvoiceResponse> SubmitPaymentProofAsync(
        Guid userId,
        Guid invoiceId,
        SubmitProofRequest request,
        CancellationToken ct = default);

    // ── Admin ─────────────────────────────────────────────────────────────────

    /// <summary>Returns all invoices, optionally filtered by status.</summary>
    Task<List<InvoiceResponse>> GetAdminInvoicesAsync(
        string? status,
        CancellationToken ct = default);

    /// <summary>
    /// Confirms payment: sets Invoice.Status = Paid, activates the subscription.
    /// </summary>
    Task<InvoiceResponse> AdminConfirmPaymentAsync(
        Guid invoiceId,
        AdminReviewRequest request,
        CancellationToken ct = default);

    /// <summary>Rejects payment: sets Invoice.Status = Failed.</summary>
    Task<InvoiceResponse> AdminRejectPaymentAsync(
        Guid invoiceId,
        AdminReviewRequest request,
        CancellationToken ct = default);
}
