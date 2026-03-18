using Boioot.Application.Features.Billing.DTOs;
using Boioot.Application.Features.Billing.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// User-facing billing endpoints: create invoices, list invoices, submit payment proof.
/// </summary>
[Authorize(Policy = "AdminOrCompanyOwnerOrAgent")]
[Route("api/dashboard/billing")]
public class DashboardBillingController : BaseController
{
    private readonly IBillingService _billing;

    public DashboardBillingController(IBillingService billing)
    {
        _billing = billing;
    }

    /// <summary>
    /// Creates an invoice for the requested plan pricing.
    /// Replaces the "upgrade-intent" confirm step with an actual pending invoice.
    /// </summary>
    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout(
        [FromBody] CheckoutRequest request,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var invoice = await _billing.CreateCheckoutAsync(GetUserId(), request, ct);
        return CreatedAtAction(nameof(GetInvoices), null, invoice);
    }

    /// <summary>Returns all invoices belonging to the authenticated user.</summary>
    [HttpGet("invoices")]
    public async Task<IActionResult> GetInvoices(CancellationToken ct)
    {
        var invoices = await _billing.GetUserInvoicesAsync(GetUserId(), ct);
        return Ok(invoices);
    }

    /// <summary>
    /// Attaches a payment proof image to an invoice.
    /// The invoice must be Pending and belong to the caller.
    /// </summary>
    [HttpPost("invoices/{invoiceId:guid}/proof")]
    public async Task<IActionResult> SubmitProof(
        Guid invoiceId,
        [FromBody] SubmitProofRequest request,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var invoice = await _billing.SubmitPaymentProofAsync(GetUserId(), invoiceId, request, ct);
        return Ok(invoice);
    }
}
