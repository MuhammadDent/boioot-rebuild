using Boioot.Application.Exceptions;
using Boioot.Application.Features.Billing.Interfaces;
using Boioot.Application.Features.Billing.Settings;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;
using BoiootInvoice = Boioot.Domain.Entities.Invoice;

namespace Boioot.Infrastructure.Features.Billing;

/// <summary>
/// Stripe billing provider.
/// Creates Stripe Checkout Sessions and manages invoice state for Stripe payments.
/// Subscription activation happens in BillingService after confirmation —
/// this class is responsible only for Stripe API calls and Invoice row mutations.
/// </summary>
public sealed class StripeBillingProvider : IBillingProvider
{
    public string ProviderName => "stripe";

    private readonly BoiootDbContext _db;
    private readonly StripeOptions   _options;

    public StripeBillingProvider(BoiootDbContext db, IOptions<StripeOptions> options)
    {
        _db      = db;
        _options = options.Value;
    }

    /// <summary>
    /// Creates a Stripe Checkout Session and inserts a corresponding Invoice row.
    /// The Invoice is saved immediately so it can be returned to the user.
    /// ExternalRef holds the Stripe session ID; StripeSessionUrl holds the redirect URL.
    /// </summary>
    public async Task<BillingProviderResult> CreatePaymentAsync(
        BillingPaymentRequest request,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.SecretKey))
            throw new BoiootException(
                "Stripe is not configured on this server. Please use bank transfer.", 503);

        StripeConfiguration.ApiKey = _options.SecretKey;

        // Convert SYP amount to smallest currency unit.
        // Stripe requires amounts in the smallest unit (e.g., cents for USD).
        // For zero-decimal currencies such as SYP, pass the amount as-is.
        var stripeAmount = (long)request.Amount;

        var sessionOptions = new SessionCreateOptions
        {
            PaymentMethodTypes = ["card"],
            LineItems =
            [
                new SessionLineItemOptions
                {
                    PriceData = new SessionLineItemPriceDataOptions
                    {
                        Currency    = request.Currency.ToLowerInvariant(),
                        UnitAmount  = stripeAmount,
                        ProductData = new SessionLineItemPriceDataProductDataOptions
                        {
                            Name        = $"Boioot — {request.PlanName} ({request.BillingCycle})",
                            Description = $"اشتراك في خطة {request.PlanName} — دورة {request.BillingCycle}",
                        },
                    },
                    Quantity = 1,
                },
            ],
            Mode       = "payment",
            SuccessUrl = _options.SuccessUrl,
            CancelUrl  = _options.CancelUrl,
            Metadata   = new Dictionary<string, string>
            {
                ["userId"]        = request.UserId.ToString(),
                ["pricingId"]     = request.PlanPricingId.ToString(),
                ["billingCycle"]  = request.BillingCycle,
            },
        };

        var service  = new SessionService();
        var session  = await service.CreateAsync(sessionOptions, cancellationToken: ct);

        // Persist invoice row immediately — links our Invoice to the Stripe session
        var invoice = new BoiootInvoice
        {
            UserId           = request.UserId,
            PlanPricingId    = request.PlanPricingId,
            Amount           = request.Amount,
            Currency         = request.Currency,
            Status           = InvoiceStatus.Pending,
            ProviderName     = ProviderName,
            ExternalRef      = session.Id,
            StripeSessionUrl = session.Url,
            ExpiresAt        = request.ExpiresAt,
        };

        _db.Invoices.Add(invoice);
        await _db.SaveChangesAsync(ct);

        return new BillingProviderResult(
            InvoiceId:   invoice.Id,
            ProviderName: ProviderName,
            SessionUrl:   session.Url);
    }

    /// <summary>
    /// Marks the invoice as Paid. Called by the Stripe webhook flow (or by an admin manually).
    /// Does NOT call SaveChanges — BillingService saves after activating the subscription.
    /// </summary>
    public async Task ConfirmPaymentAsync(
        Guid invoiceId, string? adminNote, Guid adminId, CancellationToken ct = default)
    {
        var invoice = await _db.Invoices.FindAsync([invoiceId], ct)
            ?? throw new BoiootException("الفاتورة غير موجودة", 404);

        if (invoice.Status != InvoiceStatus.Pending)
            throw new BoiootException("يمكن تأكيد الفواتير المعلقة فقط", 400);

        invoice.Status     = InvoiceStatus.Paid;
        invoice.AdminNote  = adminNote;
        invoice.ApprovedBy = adminId;
        invoice.ApprovedAt = DateTime.UtcNow;
    }

    /// <summary>Marks the invoice as Failed and saves immediately.</summary>
    public async Task RejectPaymentAsync(
        Guid invoiceId, string? adminNote, Guid adminId, CancellationToken ct = default)
    {
        var invoice = await _db.Invoices.FindAsync([invoiceId], ct)
            ?? throw new BoiootException("الفاتورة غير موجودة", 404);

        if (invoice.Status != InvoiceStatus.Pending)
            throw new BoiootException("يمكن رفض الفواتير المعلقة فقط", 400);

        invoice.Status     = InvoiceStatus.Failed;
        invoice.AdminNote  = adminNote;
        invoice.RejectedBy = adminId;
        invoice.RejectedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
    }
}
