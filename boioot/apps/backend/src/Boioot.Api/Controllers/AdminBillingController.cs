using Boioot.Application.Features.Billing.DTOs;
using Boioot.Application.Features.Billing.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Admin billing endpoints: list all invoices, confirm or reject payments.
/// Confirming a payment automatically activates the user's subscription.
/// </summary>
[Authorize(Roles = "Admin")]
[Route("api/admin/billing")]
public class AdminBillingController : BaseController
{
    private readonly IBillingService      _billing;
    private readonly INotificationService _notifications;

    public AdminBillingController(IBillingService billing, INotificationService notifications)
    {
        _billing       = billing;
        _notifications = notifications;
    }

    /// <summary>
    /// Returns all invoices, optionally filtered by status.
    /// Query param: ?status=Pending|Paid|Failed|Cancelled
    /// </summary>
    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices(
        [FromQuery] string? status,
        CancellationToken ct)
    {
        var invoices = await _billing.GetAdminInvoicesAsync(status, ct);
        return Ok(invoices);
    }

    /// <summary>
    /// Confirms a pending invoice as paid.
    /// Automatically creates/updates the user's active subscription.
    /// </summary>
    [HttpPost("invoices/{invoiceId:guid}/confirm")]
    public async Task<IActionResult> ConfirmPayment(
        Guid invoiceId,
        [FromBody] AdminReviewRequest request,
        CancellationToken ct)
    {
        var invoice = await _billing.AdminConfirmPaymentAsync(invoiceId, request, GetUserId(), ct);
        await _notifications.NotifyInvoiceApproved(invoice.UserId, invoice.Id, ct);
        return Ok(invoice);
    }

    /// <summary>Rejects a pending invoice and marks it as Failed.</summary>
    [HttpPost("invoices/{invoiceId:guid}/reject")]
    public async Task<IActionResult> RejectPayment(
        Guid invoiceId,
        [FromBody] AdminReviewRequest request,
        CancellationToken ct)
    {
        var invoice = await _billing.AdminRejectPaymentAsync(invoiceId, request, GetUserId(), ct);
        await _notifications.NotifyInvoiceRejected(invoice.UserId, invoice.Id, ct);
        return Ok(invoice);
    }
}
