using Boioot.Application.Features.SubscriptionPayments.DTOs;
using Boioot.Application.Features.SubscriptionPayments.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Customer-facing subscription payment endpoints.
/// All routes require authentication; customers can only access their own requests.
/// </summary>
[Route("api/payment-requests")]
[Authorize]
public class SubscriptionPaymentController : BaseController
{
    private readonly ISubscriptionPaymentService _service;

    public SubscriptionPaymentController(ISubscriptionPaymentService service)
    {
        _service = service;
    }

    /// <summary>
    /// POST /api/payment-requests
    /// Customer selects a plan + payment method → creates a payment request.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreatePaymentRequestDto dto,
        CancellationToken ct)
    {
        var result = await _service.CreateAsync(GetUserId(), dto, ct);
        return StatusCode(201, result);
    }

    /// <summary>
    /// GET /api/payment-requests
    /// Returns all payment requests for the authenticated user's account.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetMyRequests(CancellationToken ct)
    {
        var result = await _service.GetMyRequestsAsync(GetUserId(), ct);
        return Ok(result);
    }

    /// <summary>
    /// GET /api/payment-requests/{id}
    /// Returns a specific payment request owned by the calling user.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetByIdAsync(id, GetUserId(), ct);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/payment-requests/{id}/receipt
    /// Customer uploads a receipt image for a pending payment request.
    /// Transitions: Pending | AwaitingPayment → ReceiptUploaded.
    /// </summary>
    [HttpPost("{id:guid}/receipt")]
    public async Task<IActionResult> UploadReceipt(
        Guid id,
        [FromBody] UploadReceiptDto dto,
        CancellationToken ct)
    {
        var result = await _service.UploadReceiptAsync(id, GetUserId(), dto, ct);
        return Ok(result);
    }

    /// <summary>
    /// POST /api/payment-requests/{id}/cancel
    /// Customer cancels their own pending request.
    /// Only allowed while Status ∈ { Pending, AwaitingPayment }.
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _service.CancelAsync(id, GetUserId(), ct);
        return Ok(result);
    }
}
