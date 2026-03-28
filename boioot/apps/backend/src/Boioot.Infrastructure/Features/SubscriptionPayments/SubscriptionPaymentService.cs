using Boioot.Application.Common.Models;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Email;
using Boioot.Application.Features.Notifications.Interfaces;
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
    private readonly BoiootDbContext              _db;
    private readonly IAccountResolver             _accountResolver;
    private readonly IUserNotificationService     _notifications;
    private readonly IEmailService                _email;
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

    // Arabic labels for account audience type
    private static readonly Dictionary<string, string> AudienceTypeArLabels = new(StringComparer.OrdinalIgnoreCase)
    {
        ["seeker"]  = "باحث عن عقار",
        ["owner"]   = "مالك عقار",
        ["broker"]  = "وسيط",
        ["office"]  = "مكتب عقاري",
        ["company"] = "شركة",
        ["admin"]   = "مدير نظام",
    };

    public SubscriptionPaymentService(
        BoiootDbContext                      db,
        IAccountResolver                     accountResolver,
        IUserNotificationService             notifications,
        IEmailService                        email,
        ILogger<SubscriptionPaymentService>  logger)
    {
        _db              = db;
        _accountResolver = accountResolver;
        _notifications   = notifications;
        _email           = email;
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
            "PaymentRequest {Id} created: account={AccountId}, plan={PlanId}, method={Method}, amount={Amount}{Currency}, status={Status}",
            request.Id, accountId, dto.PlanId, dto.PaymentMethod, amount, currency, request.Status);

        // Notify all admins of the new subscription request
        var userName = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.FullName ?? u.Email)
            .FirstOrDefaultAsync(ct) ?? "مستخدم";

        await NotifyAdminsAsync(
            type:              "subscription_request_created",
            title:             "طلب اشتراك جديد",
            body:              $"قام المستخدم {userName} بإرسال طلب ترقية إلى الباقة ({plan.DisplayNameAr ?? plan.Name})",
            relatedEntityId:   request.Id.ToString(),
            relatedEntityType: "SubscriptionPaymentRequest",
            ct:                ct);

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
            "Receipt uploaded for PaymentRequest {Id} by user {UserId}, status=ReceiptUploaded", requestId, userId);

        // Notify admins that a receipt was uploaded and needs review
        var uploaderName = await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.FullName ?? u.Email)
            .FirstOrDefaultAsync(ct) ?? "مستخدم";

        var planNameForNotif = req.Plan?.DisplayNameAr ?? req.Plan?.Name ?? "غير محدد";

        await NotifyAdminsAsync(
            type:              "subscription_receipt_uploaded",
            title:             "إيصال دفع جديد للمراجعة",
            body:              $"قام المستخدم {uploaderName} برفع إيصال دفع لطلب الاشتراك في الباقة ({planNameForNotif})",
            relatedEntityId:   req.Id.ToString(),
            relatedEntityType: "SubscriptionPaymentRequest",
            ct:                ct);

        return ToResponse(req);
    }

    // ── Customer: Get by Id ──────────────────────────────────────────────

    public async Task<PaymentRequestResponse> GetByIdAsync(
        Guid requestId, Guid userId, CancellationToken ct = default)
    {
        var req = await LoadOwnedRequestAsync(requestId, userId, ct);
        var resp = ToResponse(req);

        // Load admin action history so the user can see all replies/decisions
        resp.Actions = await _db.SubscriptionRequestActions
            .AsNoTracking()
            .Where(a => a.RequestId == requestId)
            .OrderByDescending(a => a.CreatedAt)
            .Join(_db.Users, a => a.PerformedByUserId, u => u.Id,
                  (a, u) => new SubscriptionRequestActionResponse
                  {
                      Id                = a.Id,
                      ActionType        = a.ActionType,
                      Decision          = a.Decision,
                      Title             = a.Title,
                      Note              = a.Note,
                      SentInternally    = a.SentInternally,
                      SentByEmail       = a.SentByEmail,
                      EmailFailed       = a.EmailFailed,
                      PerformedByUserId = a.PerformedByUserId,
                      PerformedByName   = u.FullName ?? u.Email,
                      CreatedAt         = a.CreatedAt,
                  })
            .ToListAsync(ct);

        return resp;
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

        // Enrich with user / account info in a single batch query
        var userIds    = items.Select(r => r.UserId).Distinct().ToList();
        var accountIds = items.Select(r => r.AccountId).Distinct().ToList();

        var userMap = await _db.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName, u.Email })
            .ToDictionaryAsync(u => u.Id, ct);

        var accountTypeMap = await _db.Plans
            .AsNoTracking()
            .Join(_db.Subscriptions.Where(s => s.IsActive && accountIds.Contains(s.AccountId)),
                  p => p.Id, s => s.PlanId,
                  (p, s) => new { s.AccountId, p.AudienceType })
            .GroupBy(x => x.AccountId)
            .Select(g => new { AccountId = g.Key, AudienceType = g.First().AudienceType })
            .ToDictionaryAsync(x => x.AccountId, x => x.AudienceType, ct);

        var responses = items.Select(r =>
        {
            var resp = ToResponse(r);
            if (userMap.TryGetValue(r.UserId, out var u))
            {
                resp.UserName  = u.FullName;
                resp.UserEmail = u.Email;
            }
            if (accountTypeMap.TryGetValue(r.AccountId, out var at))
            {
                resp.AccountType   = at;
                resp.AccountTypeAr = AudienceTypeArLabels.GetValueOrDefault(at ?? "", "غير محدد");
            }
            else
            {
                resp.AccountTypeAr = "غير محدد";
            }
            return resp;
        }).ToList();

        return new PagedResult<PaymentRequestResponse>(responses, page, pageSize, total);
    }

    // ── Admin: Get by Id ─────────────────────────────────────────────────

    public async Task<PaymentRequestResponse> AdminGetByIdAsync(
        Guid requestId, CancellationToken ct = default)
    {
        var req = await _db.SubscriptionPaymentRequests
            .Include(r => r.Plan)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct)
            ?? throw new BoiootException("طلب الدفع غير موجود.", 404);

        var resp = ToResponse(req);

        // Enrich with user info
        var user = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == req.UserId)
            .Select(u => new { u.FullName, u.Email, u.Phone })
            .FirstOrDefaultAsync(ct);

        if (user is not null)
        {
            resp.UserName  = user.FullName;
            resp.UserEmail = user.Email;
            resp.UserPhone = user.Phone;
        }

        // Enrich account type from current active subscription plan
        var activePlan = await _db.Subscriptions
            .AsNoTracking()
            .Where(s => s.AccountId == req.AccountId && s.IsActive)
            .OrderByDescending(s => s.StartDate)
            .Join(_db.Plans, s => s.PlanId, p => p.Id, (s, p) => p.AudienceType)
            .FirstOrDefaultAsync(ct);

        resp.AccountType   = activePlan;
        resp.AccountTypeAr = AudienceTypeArLabels.GetValueOrDefault(activePlan ?? "", "غير محدد");

        // Load action history
        resp.Actions = await _db.SubscriptionRequestActions
            .AsNoTracking()
            .Where(a => a.RequestId == requestId)
            .OrderByDescending(a => a.CreatedAt)
            .Join(_db.Users, a => a.PerformedByUserId, u => u.Id,
                  (a, u) => new SubscriptionRequestActionResponse
                  {
                      Id                = a.Id,
                      ActionType        = a.ActionType,
                      Decision          = a.Decision,
                      Title             = a.Title,
                      Note              = a.Note,
                      SentInternally    = a.SentInternally,
                      SentByEmail       = a.SentByEmail,
                      EmailFailed       = a.EmailFailed,
                      PerformedByUserId = a.PerformedByUserId,
                      PerformedByName   = u.FullName ?? u.Email,
                      CreatedAt         = a.CreatedAt,
                  })
            .ToListAsync(ct);

        return resp;
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

    // ── Admin: Approve + Activate (combined) ─────────────────────────────

    public async Task<PaymentRequestResponse> ApproveAsync(
        Guid requestId, Guid adminUserId, ReviewPaymentRequestDto dto, CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            // Re-fetch inside transaction for fresh, consistent read
            var req = await _db.SubscriptionPaymentRequests
                .Include(r => r.Plan)
                .FirstOrDefaultAsync(r => r.Id == requestId, ct)
                ?? throw new BoiootException("طلب الدفع غير موجود.", 404);

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

            // 1. Record review audit fields
            req.ReviewedByUserId = adminUserId;
            req.ReviewNote       = dto.Note?.Trim();
            req.ReviewedAt       = DateTime.UtcNow;
            req.UpdatedAt        = DateTime.UtcNow;
            req.Status           = PaymentRequestStatus.Approved;

            // 2. Immediately activate the subscription
            await ActivateInternalAsync(req, ct);

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            _logger.LogInformation(
                "[APPROVE+ACTIVATE] PaymentRequest {ReqId} approved and subscription activated " +
                "for account={AccountId}, plan={PlanId}, cycle={Cycle}, by admin={AdminId}",
                requestId, req.AccountId, req.RequestedPlanId, req.BillingCycle, adminUserId);

            return ToResponse(req);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    /// <summary>
    /// Internal helper: activates the subscription for the given request.
    /// Must be called INSIDE an existing DB transaction.
    /// Sets req.Status = Activated, req.ActivatedAt, req.CompletedAt.
    /// </summary>
    private async Task ActivateInternalAsync(SubscriptionPaymentRequest req, CancellationToken ct)
    {
        // Idempotency guard
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

        // Calculate subscription dates based on billing cycle.
        // OneTime purchases have no expiry (EndDate = null) and are non-recurring.
        var startDate = DateTime.UtcNow;
        DateTime? endDate = req.BillingCycle switch
        {
            "Yearly"  => startDate.AddYears(1),
            "OneTime" => null,                    // perpetual — no renewal, no expiry
            _         => startDate.AddMonths(1),  // Monthly (default)
        };

        _db.Subscriptions.Add(new Subscription
        {
            AccountId  = req.AccountId,
            PlanId     = req.RequestedPlanId,
            PricingId  = req.RequestedPricingId,
            Status     = SubscriptionStatus.Active,
            StartDate  = startDate,
            EndDate    = endDate,
            IsActive   = true,
            AutoRenew  = false,  // one_time purchases are never auto-renewed
            PaymentRef = req.Id.ToString(),
            CreatedAt  = DateTime.UtcNow,
            UpdatedAt  = DateTime.UtcNow,
        });

        req.Status      = PaymentRequestStatus.Activated;
        req.ActivatedAt = DateTime.UtcNow;
        req.CompletedAt = DateTime.UtcNow;
        req.UpdatedAt   = DateTime.UtcNow;

        _logger.LogInformation(
            "[ACTIVATION] Subscription created: accountId={AccountId}, planId={PlanId}, " +
            "cycle={Cycle}, start={Start}, end={End}, requestId={ReqId}",
            req.AccountId, req.RequestedPlanId, req.BillingCycle, startDate, endDate, req.Id);
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

    // ── Admin: Activate Subscription (manual fallback for pre-existing Approved requests) ──

    public async Task<PaymentRequestResponse> ActivateSubscriptionAsync(
        Guid requestId, Guid adminUserId, CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var req = await _db.SubscriptionPaymentRequests
                .Include(r => r.Plan)
                .FirstOrDefaultAsync(r => r.Id == requestId, ct)
                ?? throw new BoiootException("طلب الدفع غير موجود.", 404);

            if (req.Status != PaymentRequestStatus.Approved)
                throw new BoiootException(
                    $"يمكن تفعيل الاشتراك فقط بعد الموافقة على الطلب. الحالة الحالية: {req.Status}", 400);

            await ActivateInternalAsync(req, ct);

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            _logger.LogInformation(
                "[MANUAL_ACTIVATE] Subscription activated by admin {AdminId}, requestId={ReqId}",
                adminUserId, requestId);

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

    // ── Admin: Notify User ───────────────────────────────────────────────

    public async Task<NotifyUserResult> NotifyUserAsync(
        Guid requestId, Guid adminUserId, NotifyUserDto dto, CancellationToken ct = default)
    {
        // Validate
        if (string.IsNullOrWhiteSpace(dto.Message))
            throw new BoiootException("نص الرسالة مطلوب ولا يمكن أن يكون فارغاً.", 400);

        if (!new[] { "approved", "rejected", "missing_info" }.Contains(dto.Decision, StringComparer.OrdinalIgnoreCase))
            throw new BoiootException("نوع القرار غير صالح. القيم المقبولة: approved, rejected, missing_info.", 400);

        if (!dto.SendInternal && !dto.SendEmail)
            throw new BoiootException("يجب اختيار طريقة إرسال واحدة على الأقل (داخلي أو إيميل).", 400);

        var req = await _db.SubscriptionPaymentRequests
            .Include(r => r.Plan)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct)
            ?? throw new BoiootException("طلب الدفع غير موجود.", 404);

        // Determine notification type
        var notifType = dto.Decision.ToLowerInvariant() switch
        {
            "approved"     => "subscription_approved",
            "rejected"     => "subscription_rejected",
            "missing_info" => "subscription_missing_info",
            _              => "subscription_notification",
        };

        // Auto-generate title if not provided
        var title = string.IsNullOrWhiteSpace(dto.Title)
            ? dto.Decision.ToLowerInvariant() switch
            {
                "approved"     => "تمت الموافقة على طلب الاشتراك",
                "rejected"     => "تم رفض طلب الاشتراك",
                "missing_info" => "يوجد نقص في طلب الاشتراك",
                _              => "إشعار بشأن طلب الاشتراك",
            }
            : dto.Title;

        // Get recipient info
        var recipientUser = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == req.UserId && !u.IsDeleted)
            .Select(u => new { u.Id, u.FullName, u.Email })
            .FirstOrDefaultAsync(ct)
            ?? throw new BoiootException("المستخدم المرتبط بالطلب غير موجود.", 404);

        bool sentInternally = false;
        bool sentByEmail    = false;
        bool emailFailed    = false;
        string? emailError  = null;

        // ── Internal notification ─────────────────────────────────────────
        if (dto.SendInternal)
        {
            try
            {
                await _notifications.CreateAsync(
                    userId:            req.UserId,
                    type:              notifType,
                    title:             title,
                    body:              dto.Message,
                    relatedEntityId:   requestId.ToString(),
                    relatedEntityType: "SubscriptionPaymentRequest",
                    ct:                ct);
                sentInternally = true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send internal notification for request {RequestId}", requestId);
            }
        }

        // ── Email ─────────────────────────────────────────────────────────
        if (dto.SendEmail)
        {
            var planName = req.Plan?.DisplayNameAr ?? req.Plan?.Name ?? "الباقة المطلوبة";
            var htmlBody = BuildEmailHtml(
                userName:    recipientUser.FullName ?? recipientUser.Email,
                title:       title,
                message:     dto.Message,
                requestId:   requestId.ToString(),
                planName:    planName,
                decision:    dto.Decision);

            var (ok, err) = await _email.TrySendAsync(new EmailMessage
            {
                ToAddress = recipientUser.Email,
                ToName    = recipientUser.FullName ?? recipientUser.Email,
                Subject   = title,
                HtmlBody  = htmlBody,
                PlainBody = dto.Message,
            }, ct);

            sentByEmail = ok;
            emailFailed = !ok;
            emailError  = err;
        }

        // ── Persist action log ────────────────────────────────────────────
        var action = new SubscriptionRequestAction
        {
            Id                = Guid.NewGuid(),
            RequestId         = requestId,
            ActionType        = "notify_user",
            Decision          = dto.Decision.ToLowerInvariant(),
            Title             = title,
            Note              = dto.Message,
            SentInternally    = sentInternally,
            SentByEmail       = sentByEmail,
            EmailFailed       = emailFailed,
            PerformedByUserId = adminUserId,
            CreatedAt         = DateTime.UtcNow,
            UpdatedAt         = DateTime.UtcNow,
        };
        _db.SubscriptionRequestActions.Add(action);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "NotifyUser: request={RequestId}, decision={Decision}, internal={Internal}, email={Email}, emailFailed={EmailFailed}, by={AdminId}",
            requestId, dto.Decision, sentInternally, sentByEmail, emailFailed, adminUserId);

        var updatedRequest = await AdminGetByIdAsync(requestId, ct);

        return new NotifyUserResult
        {
            SentInternally = sentInternally,
            SentByEmail    = sentByEmail,
            EmailFailed    = emailFailed,
            EmailError     = emailFailed ? emailError : null,
            Request        = updatedRequest,
        };
    }

    // ── Private: Build email HTML ─────────────────────────────────────────

    private static string BuildEmailHtml(
        string userName, string title, string message,
        string requestId, string planName, string decision)
    {
        var decisionColor = decision.ToLowerInvariant() switch
        {
            "approved"     => "#16a34a",
            "rejected"     => "#dc2626",
            "missing_info" => "#d97706",
            _              => "#2563eb",
        };

        var decisionLabel = decision.ToLowerInvariant() switch
        {
            "approved"     => "موافقة",
            "rejected"     => "رفض",
            "missing_info" => "طلب استكمال بيانات",
            _              => "إشعار",
        };

        return $"""
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="margin:0;padding:0;background:#f3f4f6;font-family:Tahoma,Arial,sans-serif;direction:rtl;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
                <tr><td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <tr><td style="background:{decisionColor};padding:24px 32px;text-align:center;">
                      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">بويوت للعقارات</h1>
                    </td></tr>
                    <tr><td style="padding:32px;">
                      <p style="color:#374151;font-size:16px;margin:0 0 16px;">مرحباً {System.Net.WebUtility.HtmlEncode(userName)}،</p>
                      <div style="background:#f9fafb;border-right:4px solid {decisionColor};padding:16px 20px;border-radius:8px;margin-bottom:24px;">
                        <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">نوع القرار</p>
                        <p style="margin:0;font-size:18px;font-weight:700;color:{decisionColor};">{System.Net.WebUtility.HtmlEncode(decisionLabel)}</p>
                      </div>
                      <h2 style="color:#111827;font-size:18px;margin:0 0 12px;">{System.Net.WebUtility.HtmlEncode(title)}</h2>
                      <p style="color:#374151;font-size:15px;line-height:1.7;white-space:pre-line;margin:0 0 24px;">{System.Net.WebUtility.HtmlEncode(message)}</p>
                      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
                      <table width="100%">
                        <tr>
                          <td style="color:#6b7280;font-size:13px;">رقم الطلب</td>
                          <td style="color:#374151;font-size:13px;text-align:left;">{requestId[..8].ToUpper()}</td>
                        </tr>
                        <tr>
                          <td style="color:#6b7280;font-size:13px;padding-top:8px;">الباقة</td>
                          <td style="color:#374151;font-size:13px;text-align:left;padding-top:8px;">{System.Net.WebUtility.HtmlEncode(planName)}</td>
                        </tr>
                      </table>
                    </td></tr>
                    <tr><td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
                      <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 بويوت للعقارات. جميع الحقوق محفوظة.</p>
                    </td></tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """;
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
        PlanDisplayNameAr        = r.Plan?.DisplayNameAr,
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
        Actions                  = [],
    };

    // ── Private: Admin notifications ─────────────────────────────────────

    /// <summary>
    /// Sends a notification to every user with the Admin role.
    /// Silently swallows any notification errors to avoid rolling back the primary operation.
    /// </summary>
    private async Task NotifyAdminsAsync(
        string  type,
        string  title,
        string  body,
        string? relatedEntityId,
        string? relatedEntityType,
        CancellationToken ct)
    {
        try
        {
            var adminIds = await _db.Users
                .AsNoTracking()
                .Where(u => u.Role == UserRole.Admin && u.IsActive && !u.IsDeleted)
                .Select(u => u.Id)
                .ToListAsync(ct);

            if (adminIds.Count == 0) return;

            var notifications = adminIds.Select(adminId => new NotificationRequest(
                UserId:            adminId,
                Type:              type,
                Title:             title,
                Body:              body,
                RelatedEntityId:   relatedEntityId,
                RelatedEntityType: relatedEntityType))
                .ToList();

            await _notifications.CreateBatchAsync(notifications, ct);

            _logger.LogInformation(
                "Admin notification sent to {Count} admins: type={Type}, entity={EntityId}",
                adminIds.Count, type, relatedEntityId);
        }
        catch (Exception ex)
        {
            // Notification failures must NOT rollback the primary subscription operation.
            _logger.LogWarning(ex,
                "Failed to send admin notification of type {Type} for entity {EntityId}",
                type, relatedEntityId);
        }
    }
}
