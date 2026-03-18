using Boioot.Application.Exceptions;
using Boioot.Application.Features.Billing.DTOs;
using Boioot.Application.Features.Billing.Interfaces;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Billing;

/// <summary>
/// Orchestrates billing: invoice creation, proof submission, admin confirmation,
/// and subscription activation after payment is confirmed.
/// </summary>
public sealed class BillingService : IBillingService
{
    private readonly BoiootDbContext  _db;
    private readonly IBillingProvider _provider;
    private readonly IAccountResolver _accountResolver;

    public BillingService(
        BoiootDbContext  db,
        IBillingProvider provider,
        IAccountResolver accountResolver)
    {
        _db              = db;
        _provider        = provider;
        _accountResolver = accountResolver;
    }

    // ── User-facing ───────────────────────────────────────────────────────────

    public async Task<InvoiceResponse> CreateCheckoutAsync(
        Guid userId, CheckoutRequest request, CancellationToken ct = default)
    {
        var pricing = await _db.PlanPricings
            .AsNoTracking()
            .Include(p => p.Plan)
            .FirstOrDefaultAsync(p => p.Id == request.PricingId && p.IsActive, ct)
            ?? throw new BoiootException("خيار التسعير غير موجود أو غير نشط", 404);

        if (pricing.Plan.Id == new Guid("00000001-0000-0000-0000-000000000000"))
            throw new BoiootException("الباقة المجانية لا تتطلب دفعاً", 400);

        if (await HasPendingInvoiceAsync(userId, ct))
            throw new BoiootException(
                "لديك فاتورة معلقة بالفعل. يرجى إتمام الدفع أو إلغاؤها قبل إنشاء فاتورة جديدة.", 409);

        var result = await _provider.CreatePaymentAsync(
            new BillingPaymentRequest(
                UserId:        userId,
                PlanPricingId: request.PricingId,
                Amount:        pricing.PriceAmount,
                Currency:      pricing.CurrencyCode,
                PlanName:      pricing.Plan.Name,
                BillingCycle:  pricing.BillingCycle,
                ExpiresAt:     DateTime.UtcNow.AddHours(48)),
            ct);

        return await LoadInvoiceResponseAsync(result.InvoiceId, ct);
    }

    public async Task<List<InvoiceResponse>> GetUserInvoicesAsync(
        Guid userId, CancellationToken ct = default)
    {
        var invoices = await _db.Invoices
            .AsNoTracking()
            .Include(i => i.PlanPricing).ThenInclude(pp => pp.Plan)
            .Include(i => i.User)
            .Include(i => i.PaymentProof)
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(ct);

        return invoices.Select(ToResponse).ToList();
    }

    public async Task<InvoiceResponse> SubmitPaymentProofAsync(
        Guid userId, Guid invoiceId, SubmitProofRequest request, CancellationToken ct = default)
    {
        var invoice = await _db.Invoices
            .Include(i => i.PlanPricing).ThenInclude(pp => pp.Plan)
            .Include(i => i.User)
            .Include(i => i.PaymentProof)
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.UserId == userId, ct)
            ?? throw new BoiootException("الفاتورة غير موجودة", 404);

        if (invoice.Status != InvoiceStatus.Pending)
            throw new BoiootException("لا يمكن إرفاق إيصال لفاتورة غير معلقة", 400);

        if (IsExpired(invoice))
        {
            invoice.Status = InvoiceStatus.Expired;
            await _db.SaveChangesAsync(ct);
            throw new BoiootException("انتهت صلاحية الفاتورة ولا يمكن إرفاق إيصال لها", 410);
        }

        if (invoice.PaymentProof is not null)
        {
            invoice.PaymentProof.ImageUrl = request.ImageUrl;
            invoice.PaymentProof.Notes    = request.Notes;
        }
        else
        {
            var proof = new PaymentProof
            {
                InvoiceId = invoiceId,
                ImageUrl  = request.ImageUrl,
                Notes     = request.Notes,
            };
            _db.PaymentProofs.Add(proof);
            invoice.PaymentProof = proof;
        }

        await _db.SaveChangesAsync(ct);
        return ToResponse(invoice);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    public async Task<List<InvoiceResponse>> GetAdminInvoicesAsync(
        string? status, CancellationToken ct = default)
    {
        var query = _db.Invoices
            .AsNoTracking()
            .Include(i => i.PlanPricing).ThenInclude(pp => pp.Plan)
            .Include(i => i.User)
            .Include(i => i.PaymentProof)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<InvoiceStatus>(status, ignoreCase: true, out var parsedStatus))
        {
            query = query.Where(i => i.Status == parsedStatus);
        }

        var invoices = await query
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(ct);

        return invoices.Select(ToResponse).ToList();
    }

    public async Task<InvoiceResponse> AdminConfirmPaymentAsync(
        Guid invoiceId, AdminReviewRequest request, CancellationToken ct = default)
    {
        // 1. Load invoice (tracked) to check expiry before any mutation
        var invoice = await _db.Invoices
            .Include(i => i.PlanPricing).ThenInclude(pp => pp.Plan)
            .Include(i => i.User)
            .Include(i => i.PaymentProof)
            .FirstOrDefaultAsync(i => i.Id == invoiceId, ct)
            ?? throw new BoiootException("الفاتورة غير موجودة", 404);

        if (IsExpired(invoice))
        {
            invoice.Status = InvoiceStatus.Expired;
            await _db.SaveChangesAsync(ct);
            throw new BoiootException("انتهت صلاحية الفاتورة ولا يمكن تأكيدها", 410);
        }

        // 2. Mark invoice as Paid via provider (reuses the tracked entity — no extra DB query)
        await _provider.ConfirmPaymentAsync(invoiceId, request.Note, ct);

        // 3. Resolve or create user account
        var accountId = await _accountResolver.ResolveAccountIdAsync(invoice.UserId, ct);

        if (accountId is null)
        {
            var account = new Account
            {
                CreatedByUserId   = invoice.UserId,
                PrimaryAdminUserId = invoice.UserId,
            };
            _db.Accounts.Add(account);

            var accountUser = new AccountUser
            {
                AccountId            = account.Id,
                UserId               = invoice.UserId,
                OrganizationUserRole = OrganizationUserRole.Admin,
                IsPrimary            = true,
                IsActive             = true,
            };
            _db.AccountUsers.Add(accountUser);

            accountId = account.Id;
        }

        // 4. Deactivate existing active subscriptions
        var existingSubs = await _db.Subscriptions
            .Where(s => s.AccountId == accountId.Value && s.IsActive)
            .ToListAsync(ct);

        foreach (var sub in existingSubs)
        {
            sub.IsActive = false;
            sub.Status   = SubscriptionStatus.Cancelled;
            sub.EndDate  = DateTime.UtcNow;
        }

        // 5. Calculate end date based on billing cycle
        var endDate = invoice.PlanPricing.BillingCycle == "Yearly"
            ? DateTime.UtcNow.AddDays(365)
            : DateTime.UtcNow.AddDays(30);

        // 6. Create new active subscription
        var newSub = new Subscription
        {
            AccountId  = accountId.Value,
            PlanId     = invoice.PlanPricing.PlanId,
            PricingId  = invoice.PlanPricingId,
            Status     = SubscriptionStatus.Active,
            StartDate  = DateTime.UtcNow,
            EndDate    = endDate,
            PaymentRef = invoiceId.ToString(),
            IsActive   = true,
        };
        _db.Subscriptions.Add(newSub);

        // 7. Single save for invoice + subscription changes
        await _db.SaveChangesAsync(ct);

        return ToResponse(invoice);
    }

    public async Task<InvoiceResponse> AdminRejectPaymentAsync(
        Guid invoiceId, AdminReviewRequest request, CancellationToken ct = default)
    {
        await _provider.RejectPaymentAsync(invoiceId, request.Note, ct);

        return await LoadInvoiceResponseAsync(invoiceId, ct);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<InvoiceResponse> LoadInvoiceResponseAsync(
        Guid invoiceId, CancellationToken ct)
    {
        var invoice = await _db.Invoices
            .AsNoTracking()
            .Include(i => i.PlanPricing).ThenInclude(pp => pp.Plan)
            .Include(i => i.User)
            .Include(i => i.PaymentProof)
            .FirstAsync(i => i.Id == invoiceId, ct);

        return ToResponse(invoice);
    }

    /// <summary>
    /// Returns true if the invoice has passed its ExpiresAt time.
    /// Invoices with no ExpiresAt set (created before this feature) are treated as non-expiring.
    /// </summary>
    private static bool IsExpired(Invoice invoice) =>
        invoice.ExpiresAt.HasValue && invoice.ExpiresAt.Value < DateTime.UtcNow;

    /// <summary>
    /// Returns true if the user has a non-expired Pending invoice.
    /// Expired-but-still-Pending invoices (never accessed after expiry) do NOT block new creation.
    /// </summary>
    private Task<bool> HasPendingInvoiceAsync(Guid userId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        return _db.Invoices.AnyAsync(
            i => i.UserId == userId &&
                 i.Status == InvoiceStatus.Pending &&
                 (!i.ExpiresAt.HasValue || i.ExpiresAt.Value > now),
            ct);
    }

    private static InvoiceResponse ToResponse(Invoice i) => new()
    {
        Id            = i.Id,
        UserId        = i.UserId,
        UserName      = i.User?.FullName ?? string.Empty,
        UserEmail     = i.User?.Email    ?? string.Empty,
        PlanPricingId = i.PlanPricingId,
        PlanName      = i.PlanPricing?.Plan?.Name     ?? string.Empty,
        BillingCycle  = i.PlanPricing?.BillingCycle   ?? string.Empty,
        Amount        = i.Amount,
        Currency      = i.Currency,
        Status        = i.Status.ToString(),
        ProviderName  = i.ProviderName,
        ExternalRef   = i.ExternalRef,
        AdminNote     = i.AdminNote,
        CreatedAt     = i.CreatedAt,
        ExpiresAt     = i.ExpiresAt,
        IsExpired     = IsExpired(i),
        Proof         = i.PaymentProof is null ? null : new PaymentProofResponse
        {
            Id        = i.PaymentProof.Id,
            ImageUrl  = i.PaymentProof.ImageUrl,
            Notes     = i.PaymentProof.Notes,
            CreatedAt = i.PaymentProof.CreatedAt,
        },
    };
}
