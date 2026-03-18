using Boioot.Application.Features.Billing.Interfaces;
using Boioot.Application.Exceptions;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Billing;

/// <summary>
/// Bank-transfer / manual payment provider.
/// Creates invoices and tracks status — no external API calls.
/// When Stripe is added, implement IBillingProvider separately and swap via DI.
/// </summary>
public sealed class InternalBillingProvider : IBillingProvider
{
    public string ProviderName => "internal";

    private readonly BoiootDbContext _db;

    public InternalBillingProvider(BoiootDbContext db)
    {
        _db = db;
    }

    /// <summary>Creates an Invoice row and saves it immediately.</summary>
    public async Task<BillingProviderResult> CreatePaymentAsync(
        BillingPaymentRequest request,
        CancellationToken ct = default)
    {
        var invoice = new Invoice
        {
            UserId        = request.UserId,
            PlanPricingId = request.PlanPricingId,
            Amount        = request.Amount,
            Currency      = request.Currency,
            Status        = InvoiceStatus.Pending,
            ProviderName  = ProviderName,
        };

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync(ct);

        return new BillingProviderResult(invoice.Id, ProviderName, SessionUrl: null);
    }

    /// <summary>
    /// Sets Invoice.Status = Paid. Does NOT call SaveChanges —
    /// the caller (BillingService) saves after activating the subscription.
    /// </summary>
    public async Task ConfirmPaymentAsync(
        Guid invoiceId, string? adminNote, CancellationToken ct = default)
    {
        var invoice = await _db.Invoices.FindAsync([invoiceId], ct)
            ?? throw new BoiootException("الفاتورة غير موجودة", 404);

        if (invoice.Status != InvoiceStatus.Pending)
            throw new BoiootException("يمكن تأكيد الفواتير المعلقة فقط", 400);

        invoice.Status    = InvoiceStatus.Paid;
        invoice.AdminNote = adminNote;
    }

    /// <summary>Sets Invoice.Status = Failed and saves immediately.</summary>
    public async Task RejectPaymentAsync(
        Guid invoiceId, string? adminNote, CancellationToken ct = default)
    {
        var invoice = await _db.Invoices.FindAsync([invoiceId], ct)
            ?? throw new BoiootException("الفاتورة غير موجودة", 404);

        if (invoice.Status != InvoiceStatus.Pending)
            throw new BoiootException("يمكن رفض الفواتير المعلقة فقط", 400);

        invoice.Status    = InvoiceStatus.Failed;
        invoice.AdminNote = adminNote;

        await _db.SaveChangesAsync(ct);
    }
}
