using Boioot.Application.Common.Models;
using Boioot.Application.Features.SubscriptionPayments.DTOs;

namespace Boioot.Application.Features.SubscriptionPayments.Interfaces;

/// <summary>
/// Manages the full lifecycle of subscription payment requests:
/// customer creation → receipt upload → admin review → approval → activation.
/// </summary>
public interface ISubscriptionPaymentService
{
    // ── Customer operations ───────────────────────────────────────────────

    /// <summary>
    /// Customer selects a plan + payment method → creates a PaymentRequest.
    /// Blocks if an active request already exists for the same account.
    /// Amount is locked from PlanPricing at creation time — must be > 0.
    /// </summary>
    Task<PaymentRequestResponse> CreateAsync(
        Guid userId, CreatePaymentRequestDto dto, CancellationToken ct = default);

    /// <summary>
    /// Customer uploads a receipt image.
    /// Allowed only when Status ∈ { Pending, AwaitingPayment }.
    /// Transitions status → ReceiptUploaded.
    /// </summary>
    Task<PaymentRequestResponse> UploadReceiptAsync(
        Guid requestId, Guid userId, UploadReceiptDto dto, CancellationToken ct = default);

    /// <summary>Returns a specific payment request — customer can only see their own.</summary>
    Task<PaymentRequestResponse> GetByIdAsync(
        Guid requestId, Guid userId, CancellationToken ct = default);

    /// <summary>Returns all payment requests for the calling user's account.</summary>
    Task<List<PaymentRequestResponse>> GetMyRequestsAsync(
        Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Customer cancels their own pending request.
    /// Allowed when Status ∈ { Pending, AwaitingPayment, ReceiptUploaded }.
    /// </summary>
    Task<PaymentRequestResponse> CancelAsync(
        Guid requestId, Guid userId, CancellationToken ct = default);

    // ── Admin operations ──────────────────────────────────────────────────

    /// <summary>
    /// Paginated list of all payment requests with optional filters.
    /// Returns 400 if an invalid status string is provided.
    /// </summary>
    Task<PagedResult<PaymentRequestResponse>> GetAllAsync(
        PaymentRequestFilter filter, int page, int pageSize, CancellationToken ct = default);

    /// <summary>Admin fetches any request by Id (no ownership restriction).</summary>
    Task<PaymentRequestResponse> AdminGetByIdAsync(
        Guid requestId, CancellationToken ct = default);

    /// <summary>
    /// Admin marks request as UnderReview.
    /// Allowed: Pending, AwaitingPayment, ReceiptUploaded.
    /// </summary>
    Task<PaymentRequestResponse> MarkUnderReviewAsync(
        Guid requestId, Guid adminUserId, CancellationToken ct = default);

    /// <summary>
    /// Admin approves the payment — confirms money was received.
    /// Allowed: Pending, AwaitingPayment, ReceiptUploaded, UnderReview.
    /// Blocked: Rejected, Cancelled, Approved, Activated.
    /// </summary>
    Task<PaymentRequestResponse> ApproveAsync(
        Guid requestId, Guid adminUserId, ReviewPaymentRequestDto dto, CancellationToken ct = default);

    /// <summary>
    /// Admin rejects the request. Note is required.
    /// Blocked: Approved, Activated, Cancelled.
    /// </summary>
    Task<PaymentRequestResponse> RejectAsync(
        Guid requestId, Guid adminUserId, ReviewPaymentRequestDto dto, CancellationToken ct = default);

    /// <summary>
    /// Admin administratively cancels a request.
    /// Allowed in any non-terminal state (not Activated, not already Cancelled).
    /// Semantically distinct from Reject — used for operational/admin reasons.
    /// </summary>
    Task<PaymentRequestResponse> AdminCancelAsync(
        Guid requestId, Guid adminUserId, string? note, CancellationToken ct = default);

    /// <summary>
    /// Activates the subscription for the account tied to the payment request.
    /// Runs inside a DB transaction. Idempotency-safe: rejects if already activated.
    /// Can only be called after Approve.
    /// </summary>
    Task<PaymentRequestResponse> ActivateSubscriptionAsync(
        Guid requestId, Guid adminUserId, CancellationToken ct = default);
}
