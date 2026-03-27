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

    Task<PaymentRequestResponse> CreateAsync(
        Guid userId, CreatePaymentRequestDto dto, CancellationToken ct = default);

    Task<PaymentRequestResponse> UploadReceiptAsync(
        Guid requestId, Guid userId, UploadReceiptDto dto, CancellationToken ct = default);

    Task<PaymentRequestResponse> GetByIdAsync(
        Guid requestId, Guid userId, CancellationToken ct = default);

    Task<List<PaymentRequestResponse>> GetMyRequestsAsync(
        Guid userId, CancellationToken ct = default);

    Task<PaymentRequestResponse> CancelAsync(
        Guid requestId, Guid userId, CancellationToken ct = default);

    // ── Admin operations ──────────────────────────────────────────────────

    Task<PagedResult<PaymentRequestResponse>> GetAllAsync(
        PaymentRequestFilter filter, int page, int pageSize, CancellationToken ct = default);

    Task<PaymentRequestResponse> AdminGetByIdAsync(
        Guid requestId, CancellationToken ct = default);

    Task<PaymentRequestResponse> MarkUnderReviewAsync(
        Guid requestId, Guid adminUserId, CancellationToken ct = default);

    Task<PaymentRequestResponse> ApproveAsync(
        Guid requestId, Guid adminUserId, ReviewPaymentRequestDto dto, CancellationToken ct = default);

    Task<PaymentRequestResponse> RejectAsync(
        Guid requestId, Guid adminUserId, ReviewPaymentRequestDto dto, CancellationToken ct = default);

    Task<PaymentRequestResponse> AdminCancelAsync(
        Guid requestId, Guid adminUserId, string? note, CancellationToken ct = default);

    Task<PaymentRequestResponse> ActivateSubscriptionAsync(
        Guid requestId, Guid adminUserId, CancellationToken ct = default);

    /// <summary>
    /// Admin sends a structured notification to the request owner.
    /// Optionally also sends an email. Logs the action in SubscriptionRequestActions.
    /// Decision: "approved" | "rejected" | "missing_info"
    /// </summary>
    Task<NotifyUserResult> NotifyUserAsync(
        Guid requestId, Guid adminUserId, NotifyUserDto dto, CancellationToken ct = default);

    // ── Free plan shortcut ────────────────────────────────────────────────

    Task<FreePlanActivationResponse> ActivateFreeAsync(
        Guid userId, Guid planId, CancellationToken ct = default);
}
