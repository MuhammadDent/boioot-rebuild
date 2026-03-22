using Boioot.Application.Features.SubscriptionPayments.DTOs;
using Boioot.Application.Features.SubscriptionPayments.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Admin/staff endpoints for reviewing and activating subscription payment requests.
/// All routes require the Admin role.
/// </summary>
[Route("api/admin/payment-requests")]
[Authorize(Policy = "AdminOnly")]
public class AdminSubscriptionPaymentController : BaseController
{
    private readonly ISubscriptionPaymentService _service;

    public AdminSubscriptionPaymentController(ISubscriptionPaymentService service)
    {
        _service = service;
    }

    /// <summary>
    /// GET /api/admin/payment-requests?status=&amp;paymentMethod=&amp;planId=&amp;page=1&amp;pageSize=20
    /// Paginated list with optional filters.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string?  status          = null,
        [FromQuery] string?  paymentMethod   = null,
        [FromQuery] string?  paymentFlowType = null,
        [FromQuery] Guid?    accountId       = null,
        [FromQuery] Guid?    planId          = null,
        [FromQuery] DateTime? fromDate       = null,
        [FromQuery] DateTime? toDate         = null,
        [FromQuery] int      page            = 1,
        [FromQuery] int      pageSize        = 20,
        CancellationToken ct = default)
    {
        var filter = new PaymentRequestFilter
        {
            Status          = status,
            PaymentMethod   = paymentMethod,
            PaymentFlowType = paymentFlowType,
            AccountId       = accountId,
            PlanId          = planId,
            FromDate        = fromDate,
            ToDate          = toDate,
        };

        var result = await _service.GetAllAsync(filter, page, pageSize, ct);
        return Ok(result);
    }

    /// <summary>
    /// GET /api/admin/payment-requests/{id}
    /// Full detail for a single payment request (no ownership restriction).
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.AdminGetByIdAsync(id, ct);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/admin/payment-requests/{id}/under-review
    /// Signals to the customer that an admin is reviewing their submission.
    /// Transitions: Pending | AwaitingPayment | ReceiptUploaded → UnderReview.
    /// </summary>
    [HttpPost("{id:guid}/under-review")]
    public async Task<IActionResult> MarkUnderReview(Guid id, CancellationToken ct)
    {
        var result = await _service.MarkUnderReviewAsync(id, GetUserId(), ct);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/admin/payment-requests/{id}/approve
    /// Admin confirms payment was received.
    /// Status → Approved. Subscription is NOT yet activated at this step.
    /// Call /activate to activate the subscription.
    /// </summary>
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(
        Guid id,
        [FromBody] ReviewPaymentRequestDto dto,
        CancellationToken ct)
    {
        var result = await _service.ApproveAsync(id, GetUserId(), dto, ct);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/admin/payment-requests/{id}/reject
    /// Admin rejects the request. Requires a rejection note.
    /// </summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(
        Guid id,
        [FromBody] ReviewPaymentRequestDto dto,
        CancellationToken ct)
    {
        var result = await _service.RejectAsync(id, GetUserId(), dto, ct);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/admin/payment-requests/{id}/activate
    /// Activates the subscription for the account.
    /// Deactivates any existing active subscription, creates new Subscription record.
    /// Can only be called after the request is Approved.
    /// </summary>
    [HttpPost("{id:guid}/activate")]
    public async Task<IActionResult> Activate(Guid id, CancellationToken ct)
    {
        var result = await _service.ActivateSubscriptionAsync(id, GetUserId(), ct);
        return Ok(result);
    }
}
