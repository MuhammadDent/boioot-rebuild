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
    /// Amount is locked from PlanPricing at creation time.
    /// </summary>
    Task<PaymentRequestResponse> CreateAsync(
        Guid userId, CreatePaymentRequestDto dto, CancellationToken ct = default);

    /// <summary>
    /// Customer uploads a receipt image for a pending/awaiting-payment request.
    /// Transitions status: Pending/AwaitingPayment → ReceiptUploaded.
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
    /// Only allowed while Status ∈ { Pending, AwaitingPayment }.
    /// </summary>
    Task<PaymentRequestResponse> CancelAsync(
        Guid requestId, Guid userId, CancellationToken ct = default);

    // ── Admin operations ──────────────────────────────────────────────────

    /// <summary>Paginated list of all payment requests with optional filters.</summary>
    Task<PagedResult<PaymentRequestResponse>> GetAllAsync(
        PaymentRequestFilter filter, int page, int pageSize, CancellationToken ct = default);

    /// <summary>Admin fetches any request by Id (no ownership restriction).</summary>
    Task<PaymentRequestResponse> AdminGetByIdAsync(
        Guid requestId, CancellationToken ct = default);

    /// <summary>
    /// Admin marks request as UnderReview.
    /// Useful signal to customer that their submission was seen.
    /// </summary>
    Task<PaymentRequestResponse> MarkUnderReviewAsync(
        Guid requestId, Guid adminUserId, CancellationToken ct = default);

    /// <summary>
    /// Admin approves the payment request — confirms money was received.
    /// Status → Approved. Subscription is NOT yet activated at this point.
    /// </summary>
    Task<PaymentRequestResponse> ApproveAsync(
        Guid requestId, Guid adminUserId, ReviewPaymentRequestDto dto, CancellationToken ct = default);

    /// <summary>
    /// Admin rejects the payment request (bad receipt, fraud, etc.).
    /// Status → Rejected. Note is required.
    /// </summary>
    Task<PaymentRequestResponse> RejectAsync(
        Guid requestId, Guid adminUserId, ReviewPaymentRequestDto dto, CancellationToken ct = default);

    /// <summary>
    /// Activates the subscription for the account tied to the payment request.
    /// Creates a new Subscription record, sets Status → Activated.
    /// Can only be called after Approve.
    /// </summary>
    Task<PaymentRequestResponse> ActivateSubscriptionAsync(
        Guid requestId, Guid adminUserId, CancellationToken ct = default);
}
