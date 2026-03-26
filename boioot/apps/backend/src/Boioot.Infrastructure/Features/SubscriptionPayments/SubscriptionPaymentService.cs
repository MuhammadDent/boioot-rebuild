using Boioot.Application.Common.Models;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.SubscriptionPayments;
using Boioot.Application.Features.SubscriptionPayments.DTOs;
using Boioot.Application.Features.SubscriptionPayments.Interfaces;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.SubscriptionPayments;

public class SubscriptionPaymentService : ISubscriptionPaymentService
{
    private readonly BoiootDbContext       _db;
    private readonly IAccountResolver      _accountResolver;
    private readonly ILogger<SubscriptionPaymentService> _logger;

    // Statuses that block new request creation for the same account.
    private static readonly PaymentRequestStatus[] ActiveStatuses =
    [
        PaymentRequestStatus.Pending,
        PaymentRequestStatus.AwaitingPayment,
        PaymentRequestStatus.ReceiptUploaded,
        PaymentRequestStatus.UnderReview,
        PaymentRequestStatus.Approved,
    ];

    public SubscriptionPaymentService(
        BoiootDbContext                      db,
        IAccountResolver                     accountResolver,
        ILogger<SubscriptionPaymentService>  logger)
    {
        _db              = db;
        _accountResolver = accountResolver;
        _logger          = logger;
    }

    // ── Customer: Create ─────────────────────────────────────────────────

    public async Task<PaymentRequestResponse> CreateAsync(
        Guid userId, CreatePaymentRequestDto dto, CancellationToken ct = default)
    {
        // FIX-1: Validate payment method
        if (!PaymentMethodKeys.All.Contains(dto.PaymentMethod))
            throw new BoiootException(
                $"طريقة الدفع '{dto.PaymentMethod}' غير مدعومة.", 400);

        // Resolve account
        var accountId = await _accountResolver.ResolveAccountIdAsync(userId, ct)
            ?? throw new BoiootException(
                "لا يوجد حساب مرتبط بهذا المستخدم. يرجى إكمال إعداد الحساب أولاً.", 404);

        // FIX-4: Prevent duplicate active requests
        var hasActive = await _db.SubscriptionPaymentRequests
            .AnyAsync(r => r.AccountId == accountId
                        && ActiveStatuses.Contains(r.Status), ct);

        if (hasActive)
            throw new BoiootException(
                "لديك طلب دفع نشط بالفعل. يرجى انتظار معالجته أو إلغاؤه قبل إنشاء طلب جديد.", 409);

        // Validate plan
        var plan = await _db.Plans.FirstOrDefaultAsync(p => p.Id == dto.PlanId, ct)
            ?? throw new BoiootException("الخطة المطلوبة غير موجودة.", 404);

        // FIX-6: Validate plan–role (audience) compatibility
        if (!string.IsNullOrWhiteSpace(plan.AudienceType))
        {
            var userRole = await _db.Users
                .Where(u => u.Id == userId)
                .Select(u => u.Role)
                .FirstOrDefaultAsync(ct);

            // For CompanyOwner, distinguish Office vs Company via Account.AccountType
            var accountType = (userRole == UserRole.CompanyOwner || userRole == UserRole.Agent)
                ? await _db.Accounts
                    .Where(a => a.Id == accountId)
                    .Select(a => (AccountType?)a.AccountType)
                    .FirstOrDefaultAsync(ct)
                : null;

            var audienceLower = plan.AudienceType.ToLowerInvariant();
            var compatible = audienceLower switch
            {
                "seeker"  => userRole == UserRole.User,
                "owner"   => userRole == UserRole.Owner,
                "broker"  => userRole == UserRole.Broker,
                "office"  => (userRole == UserRole.CompanyOwner && accountType == AccountType.Office)
                          || userRole == UserRole.Agent,
                "company" => userRole == UserRole.CompanyOwner && accountType == AccountType.Company,
                _         => false,
            };

            if (!compatible)
                throw new BoiootException(
                    $"الخطة المطلوبة ('{plan.DisplayNameAr ?? plan.Name}') غير متوافقة مع نوع حسابك. يرجى اختيار خطة مناسبة لدورك.",
                    422);
        }

        // FIX-5: Resolve amount — must be > 0, no silent fallback
        decimal amount   = 0m;
        string  currency = "USD";
        string  cycle    = dto.BillingCycle;

        if (dto.PricingId.HasValue)
        {
            var pricing = await _db.PlanPricings
                .FirstOrDefaultAsync(p => p.Id == dto.PricingId.Value
                                       && p.PlanId == dto.PlanId, ct)
                ?? throw new BoiootException(
                    "بيانات التسعير غير صحيحة أو لا تنتمي للخطة المحددة.", 400);

            amount   = pricing.PriceAmount;
            currency = pricing.CurrencyCode ?? "USD";
            cycle    = pricing.BillingCycle ?? dto.BillingCycle;
        }
        else
        {
            // Attempt fallback: find any pricing for the plan + cycle
            var pricing = await _db.PlanPricings
                .Where(p => p.PlanId == dto.PlanId
                         && (p.BillingCycle == dto.BillingCycle || p.BillingCycle == null))
                .OrderBy(p => p.PriceAmount)
                .FirstOrDefaultAsync(ct);

            if (pricing != null)
            {
                amount   = pricing.PriceAmount;
                currency = pricing.CurrencyCode ?? "USD";
            }
        }

        // FIX-5: Reject requests with zero amount — no silent free subscriptions
        if (amount <= 0m)
            throw new BoiootException(
                "لم يتم العثور على تسعير مناسب للخطة المطلوبة. يرجى تحديد رقم التسعير (PricingId) بشكل صريح.", 400);

        var request = new SubscriptionPaymentRequest
        {
            AccountId               = accountId,
            UserId                  = userId,
            RequestedPlanId         = dto.PlanId,
            RequestedPricingId      = dto.PricingId,
            BillingCycle            = cycle,
            Amount                  = amount,
            Currency                = currency,
            PaymentMethod           = dto.PaymentMethod,
            PaymentFlowType         = PaymentMethodKeys.GetFlowType(dto.PaymentMethod),
            Status                  = PaymentRequestStatus.Pending,
            CustomerNote            = dto.CustomerNote?.Trim(),
            SalesRepresentativeName = dto.SalesRepresentativeName?.Trim(),
            CreatedAt               = DateTime.UtcNow,
            UpdatedAt               = DateTime.UtcNow,
        };

        _db.SubscriptionPaymentRequests.Add(request);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "PaymentRequest {Id} created: account={AccountId}, plan={PlanId}, method={Method}, amount={Amount}{Currency}",
            request.Id, accountId, dto.PlanId, dto.PaymentMethod, amount, currency);

        return ToResponse(request, plan.Name, plan.Code ?? string.Empty);
    }

    // ── Customer: Upload Receipt ─────────────────────────────────────────

    public async Task<PaymentRequestResponse> UploadReceiptAsync(
        Guid requestId, Guid userId, UploadReceiptDto dto, CancellationToken ct = default)
    {
        var req = await LoadOwnedRequestAsync(requestId, userId, ct);

        // FIX-2: Only Pending or AwaitingPayment may receive a receipt
        if (req.Status != PaymentRequestStatus.Pending &&
            req.Status != PaymentRequestStatus.AwaitingPayment)
            throw new BoiootException(
                $"لا يمكن رفع إيصال لطلب في الحالة '{req.Status}'. " +
                "يُسمح برفع الإيصال فقط في حالة Pending أو AwaitingPayment.", 400);

        req.ReceiptImageUrl = dto.ReceiptImageUrl;
        req.ReceiptFileName = dto.ReceiptFileName?.Trim();
        req.Status          = PaymentRequestStatus.ReceiptUploaded;
        if (!string.IsNullOrWhiteSpace(dto.CustomerNote))
            req.CustomerNote = dto.CustomerNote.Trim();
        req.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Receipt uploaded for PaymentRequest {Id} by user {UserId}", requestId, userId);

        return ToResponse(req);
    }

    // ── Customer: Get by Id ──────────────────────────────────────────────

    public async Task<PaymentRequestResponse> GetByIdAsync(
        Guid requestId, Guid userId, CancellationToken ct = default)
    {
        var req = await LoadOwnedRequestAsync(requestId, userId, ct);
        return ToResponse(req);
    }

    // ── Customer: My requests ────────────────────────────────────────────

    public async Task<List<PaymentRequestResponse>> GetMyRequestsAsync(
        Guid userId, CancellationToken ct = default)
    {
        var accountId = await _accountResolver.ResolveAccountIdAsync(userId, ct);
        if (!accountId.HasValue) return [];

        var requests = await _db.SubscriptionPaymentRequests
            .Include(r => r.Plan)
            .Where(r => r.AccountId == accountId.Value)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        return requests.Select(r => ToResponse(r)).ToList();
    }

    // ── Customer: Cancel ─────────────────────────────────────────────────

    public async Task<PaymentRequestResponse> CancelAsync(
        Guid requestId, Guid userId, CancellationToken ct = default)
    {
        var req = await LoadOwnedRequestAsync(requestId, userId, ct);

        if (req.Status != PaymentRequestStatus.Pending &&
            req.Status != PaymentRequestStatus.AwaitingPayment &&
            req.Status != PaymentRequestStatus.ReceiptUploaded)
            throw new BoiootException(
                $"لا يمكن إلغاء طلب في الحالة '{req.Status}'. يرجى التواصل مع الدعم.", 400);

        req.Status    = PaymentRequestStatus.Cancelled;
        req.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return ToResponse(req);
    }

    // ── Admin: Get All ───────────────────────────────────────────────────

    public async Task<PagedResult<PaymentRequestResponse>> GetAllAsync(
        PaymentRequestFilter filter, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.SubscriptionPaymentRequests
            .Include(r => r.Plan)
            .AsQueryable();

        // FIX-1: Safe enum parsing — return 400 on invalid status string
        if (!string.IsNullOrEmpty(filter.Status))
        {
            if (!Enum.TryParse<PaymentRequestStatus>(filter.Status, ignoreCase: true, out var parsedStatus))
                throw new BoiootException(
                    $"قيمة الحالة '{filter.Status}' غير صالحة. " +
                    $"القيم المقبولة: {string.Join(", ", Enum.GetNames<PaymentRequestStatus>())}", 400);

            query = query.Where(r => r.Status == parsedStatus);
        }

        if (!string.IsNullOrEmpty(filter.PaymentMethod))
            query = query.Where(r => r.PaymentMethod == filter.PaymentMethod);

        if (!string.IsNullOrEmpty(filter.PaymentFlowType))
            query = query.Where(r => r.PaymentFlowType == filter.PaymentFlowType);

        if (filter.AccountId.HasValue)
            query = query.Where(r => r.AccountId == filter.AccountId.Value);

        if (filter.PlanId.HasValue)
            query = query.Where(r => r.RequestedPlanId == filter.PlanId.Value);

        if (filter.FromDate.HasValue)
            query = query.Where(r => r.CreatedAt >= filter.FromDate.Value);

        if (filter.ToDate.HasValue)
            query = query.Where(r => r.CreatedAt <= filter.ToDate.Value);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<PaymentRequestResponse>(
            items.Select(r => ToResponse(r)).ToList(),
            page,
            pageSize,
            total);
    }

    // ── Admin: Get by Id ─────────────────────────────────────────────────

    public async Task<PaymentRequestResponse> AdminGetByIdAsync(
        Guid requestId, CancellationToken ct = default)
    {
        var req = await _db.SubscriptionPaymentRequests
            .Include(r => r.Plan)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct)
            ?? throw new BoiootException("طلب الدفع غير موجود.", 404);

        return ToResponse(req);
    }

    // ── Admin: Mark Under Review ─────────────────────────────────────────

    public async Task<PaymentRequestResponse> MarkUnderReviewAsync(
        Guid requestId, Guid adminUserId, CancellationToken ct = default)
    {
        var req = await LoadAdminRequestAsync(requestId, ct);

        if (req.Status != PaymentRequestStatus.ReceiptUploaded &&
            req.Status != PaymentRequestStatus.Pending &&
            req.Status != PaymentRequestStatus.AwaitingPayment)
            throw new BoiootException(
                $"لا يمكن تغيير حالة طلب في الحالة '{req.Status}' إلى 'قيد المراجعة'.", 400);

        req.Status           = PaymentRequestStatus.UnderReview;
        req.ReviewedByUserId = adminUserId;
        req.ReviewedAt       = DateTime.UtcNow;
        req.UpdatedAt        = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return ToResponse(req);
    }

    // ── Admin: Approve ───────────────────────────────────────────────────

    public async Task<PaymentRequestResponse> ApproveAsync(
        Guid requestId, Guid adminUserId, ReviewPaymentRequestDto dto, CancellationToken ct = default)
    {
        var req = await LoadAdminRequestAsync(requestId, ct);

        // FIX-2: Explicit allowlist — Rejected and Cancelled are implicitly blocked
        var allowedStatuses = new[]
        {
            PaymentRequestStatus.Pending,
            PaymentRequestStatus.AwaitingPayment,
            PaymentRequestStatus.ReceiptUploaded,
            PaymentRequestStatus.UnderReview,
        };

        if (!allowedStatuses.Contains(req.Status))
            throw new BoiootException(
                $"لا يمكن الموافقة على طلب في الحالة '{req.Status}'. " +
                "الموافقة مسموحة فقط للطلبات في: Pending, AwaitingPayment, ReceiptUploaded, UnderReview.", 400);

        req.Status           = PaymentRequestStatus.Approved;
        req.ReviewedByUserId = adminUserId;
        req.ReviewNote       = dto.Note?.Trim();
        req.ReviewedAt       = DateTime.UtcNow;
        req.UpdatedAt        = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "PaymentRequest {Id} approved by admin {AdminId}", requestId, adminUserId);

        return ToResponse(req);
    }

    // ── Admin: Reject ────────────────────────────────────────────────────

    public async Task<PaymentRequestResponse> RejectAsync(
        Guid requestId, Guid adminUserId, ReviewPaymentRequestDto dto, CancellationToken ct = default)
    {
        var req = await LoadAdminRequestAsync(requestId, ct);

        // FIX-2: Block terminal and post-approval states
        if (req.Status == PaymentRequestStatus.Activated   ||
            req.Status == PaymentRequestStatus.Cancelled   ||
            req.Status == PaymentRequestStatus.Approved)
            throw new BoiootException(
                $"لا يمكن رفض طلب في الحالة '{req.Status}'. " +
                "الطلبات المعتمدة أو المُفعَّلة أو الملغاة لا يمكن رفضها.", 400);

        if (string.IsNullOrWhiteSpace(dto.Note))
            throw new BoiootException("سبب الرفض مطلوب.", 400);

        req.Status           = PaymentRequestStatus.Rejected;
        req.ReviewedByUserId = adminUserId;
        req.ReviewNote       = dto.Note.Trim();
        req.ReviewedAt       = DateTime.UtcNow;
        req.UpdatedAt        = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "PaymentRequest {Id} rejected by admin {AdminId}: {Reason}",
            requestId, adminUserId, dto.Note);

        return ToResponse(req);
    }

    // ── Admin: Cancel ────────────────────────────────────────────────────

    /// <summary>
    /// FIX-3: Admin administrative cancel — semantically distinct from customer cancel.
    /// Allowed in any non-terminal state (not Activated).
    /// </summary>
    public async Task<PaymentRequestResponse> AdminCancelAsync(
        Guid requestId, Guid adminUserId, string? note, CancellationToken ct = default)
    {
        var req = await LoadAdminRequestAsync(requestId, ct);

        if (req.Status == PaymentRequestStatus.Activated)
            throw new BoiootException(
                "لا يمكن إلغاء طلب تم تفعيله بالفعل. الاشتراك ساري المفعول.", 400);

        if (req.Status == PaymentRequestStatus.Cancelled)
            throw new BoiootException("الطلب ملغى مسبقاً.", 400);

        req.Status           = PaymentRequestStatus.Cancelled;
        req.ReviewedByUserId = adminUserId;
        req.ReviewNote       = note?.Trim();
        req.ReviewedAt       = DateTime.UtcNow;
        req.UpdatedAt        = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "PaymentRequest {Id} cancelled administratively by admin {AdminId}. Note: {Note}",
            requestId, adminUserId, note ?? "—");

        return ToResponse(req);
    }

    // ── Admin: Activate Subscription ────────────────────────────────────

    public async Task<PaymentRequestResponse> ActivateSubscriptionAsync(
        Guid requestId, Guid adminUserId, CancellationToken ct = default)
    {
        // FIX-6: Wrap in a transaction to prevent race conditions
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            // Re-fetch inside the transaction for a fresh, consistent read
            var req = await _db.SubscriptionPaymentRequests
                .Include(r => r.Plan)
                .FirstOrDefaultAsync(r => r.Id == requestId, ct)
                ?? throw new BoiootException("طلب الدفع غير موجود.", 404);

            if (req.Status != PaymentRequestStatus.Approved)
                throw new BoiootException(
                    $"يمكن تفعيل الاشتراك فقط بعد الموافقة على الطلب. الحالة الحالية: {req.Status}", 400);

            // FIX-6: Idempotency guard — check if a subscription was already created
            // for this exact payment request (PaymentRef = req.Id)
            var alreadyActivated = await _db.Subscriptions
                .AnyAsync(s => s.PaymentRef == req.Id.ToString(), ct);

            if (alreadyActivated)
                throw new BoiootException(
                    "تم تفعيل اشتراك لهذا الطلب مسبقاً. لا يمكن التفعيل مرتين.", 409);

            // Deactivate any existing active subscriptions for the account
            var existingActive = await _db.Subscriptions
                .Where(s => s.AccountId == req.AccountId && s.IsActive)
                .ToListAsync(ct);

            foreach (var sub in existingActive)
            {
                sub.IsActive  = false;
                sub.Status    = SubscriptionStatus.Cancelled;
                sub.UpdatedAt = DateTime.UtcNow;
            }

            // Calculate subscription dates
            var startDate = DateTime.UtcNow;
            var endDate   = req.BillingCycle == "Yearly"
                ? startDate.AddYears(1)
                : startDate.AddMonths(1);

            var subscription = new Subscription
            {
                AccountId  = req.AccountId,
                PlanId     = req.RequestedPlanId,
                PricingId  = req.RequestedPricingId,
                Status     = SubscriptionStatus.Active,
                StartDate  = startDate,
                EndDate    = endDate,
                IsActive   = true,
                AutoRenew  = false,
                PaymentRef = req.Id.ToString(),
                CreatedAt  = DateTime.UtcNow,
                UpdatedAt  = DateTime.UtcNow,
            };

            _db.Subscriptions.Add(subscription);

            req.Status      = PaymentRequestStatus.Activated;
            req.ActivatedAt = DateTime.UtcNow;
            req.CompletedAt = DateTime.UtcNow;
            req.UpdatedAt   = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            _logger.LogInformation(
                "Subscription activated: account={AccountId}, plan={PlanId}, " +
                "cycle={Cycle}, end={EndDate}, via PaymentRequest={ReqId}",
                req.AccountId, req.RequestedPlanId, req.BillingCycle, endDate, requestId);

            return ToResponse(req);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    // ── Free Plan Shortcut ───────────────────────────────────────────────

    public async Task<FreePlanActivationResponse> ActivateFreeAsync(
        Guid userId, Guid planId, CancellationToken ct = default)
    {
        var resolvedId = await _accountResolver.ResolveAccountIdAsync(userId, ct);

        Guid accountId;
        if (resolvedId is null)
        {
            // Auto-create account for users who registered before auto-account creation was added
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
                ?? throw new BoiootException("المستخدم غير موجود.", 404);

            var now = DateTime.UtcNow;
            var account = new Account
            {
                Name               = user.FullName,
                AccountType        = AccountType.Individual,
                CreatedByUserId    = userId,
                PrimaryAdminUserId = userId,
                IsActive           = true,
                CreatedAt          = now,
                UpdatedAt          = now,
            };
            _db.Accounts.Add(account);

            _db.AccountUsers.Add(new AccountUser
            {
                AccountId            = account.Id,
                UserId               = userId,
                OrganizationUserRole = OrganizationUserRole.Admin,
                IsPrimary            = true,
                IsActive             = true,
                JoinedAt             = now,
            });

            await _db.SaveChangesAsync(ct);
            accountId = account.Id;
        }
        else
        {
            accountId = resolvedId.Value;
        }

        var plan = await _db.Plans.FirstOrDefaultAsync(p => p.Id == planId, ct)
            ?? throw new BoiootException("الخطة المطلوبة غير موجودة.", 404);

        // Guard: reject if the plan has ANY paid pricing
        var hasPaidPricing = await _db.PlanPricings
            .AnyAsync(p => p.PlanId == planId && p.PriceAmount > 0, ct);

        if (hasPaidPricing)
            throw new BoiootException(
                "هذه الباقة ليست مجانية. يرجى اختيار طريقة دفع للاشتراك.", 400);

        // Deactivate any existing active subscriptions for this account
        var existingActive = await _db.Subscriptions
            .Where(s => s.AccountId == accountId && s.IsActive)
            .ToListAsync(ct);

        foreach (var sub in existingActive)
        {
            sub.IsActive  = false;
            sub.Status    = SubscriptionStatus.Cancelled;
            sub.UpdatedAt = DateTime.UtcNow;
        }

        // Create the free subscription (no expiry)
        var subscription = new Subscription
        {
            AccountId  = accountId,
            PlanId     = planId,
            PricingId  = null,
            Status     = SubscriptionStatus.Active,
            StartDate  = DateTime.UtcNow,
            EndDate    = null,
            IsActive   = true,
            AutoRenew  = false,
            PaymentRef = "free",
            CreatedAt  = DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow,
        };

        _db.Subscriptions.Add(subscription);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Free plan activated directly: account={AccountId}, plan={PlanId}",
            accountId, planId);

        return new FreePlanActivationResponse
        {
            SubscriptionId = subscription.Id,
            PlanName       = plan.DisplayNameAr ?? plan.Name,
            Message        = "تم تفعيل الباقة المجانية بنجاح.",
        };
    }

    // ── Private helpers ──────────────────────────────────────────────────

    private async Task<SubscriptionPaymentRequest> LoadOwnedRequestAsync(
        Guid requestId, Guid userId, CancellationToken ct)
    {
        var accountId = await _accountResolver.ResolveAccountIdAsync(userId, ct);

        var req = await _db.SubscriptionPaymentRequests
            .Include(r => r.Plan)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct)
            ?? throw new BoiootException("طلب الدفع غير موجود.", 404);

        if (req.UserId != userId && req.AccountId != accountId)
            throw new BoiootException("غير مصرح بالوصول إلى هذا الطلب.", 403);

        return req;
    }

    private async Task<SubscriptionPaymentRequest> LoadAdminRequestAsync(
        Guid requestId, CancellationToken ct)
    {
        return await _db.SubscriptionPaymentRequests
            .Include(r => r.Plan)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct)
            ?? throw new BoiootException("طلب الدفع غير موجود.", 404);
    }

    private static PaymentRequestResponse ToResponse(
        SubscriptionPaymentRequest r,
        string? planName = null,
        string? planCode = null) => new()
    {
        Id                       = r.Id,
        AccountId                = r.AccountId,
        UserId                   = r.UserId,
        PlanId                   = r.RequestedPlanId,
        PlanName                 = planName ?? r.Plan?.Name ?? string.Empty,
        PlanCode                 = planCode ?? r.Plan?.Code ?? string.Empty,
        PricingId                = r.RequestedPricingId,
        BillingCycle             = r.BillingCycle,
        Amount                   = r.Amount,
        Currency                 = r.Currency,
        PaymentMethod            = r.PaymentMethod,
        PaymentFlowType          = r.PaymentFlowType,
        Status                   = r.Status.ToString(),
        ReceiptImageUrl          = r.ReceiptImageUrl,
        ReceiptFileName          = r.ReceiptFileName,
        CustomerNote             = r.CustomerNote,
        SalesRepresentativeName  = r.SalesRepresentativeName,
        ReviewedByUserId         = r.ReviewedByUserId,
        ReviewNote               = r.ReviewNote,
        ExternalPaymentReference = r.ExternalPaymentReference,
        CreatedAt                = r.CreatedAt,
        ReviewedAt               = r.ReviewedAt,
        ActivatedAt              = r.ActivatedAt,
        CompletedAt              = r.CompletedAt,
    };
}
