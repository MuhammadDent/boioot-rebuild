using Boioot.Application.Features.Subscriptions.DTOs;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Subscriptions;

/// <summary>
/// Full subscription lifecycle service — Phase 3A hardened.
/// Handles queries, assignment, plan changes, cancellation, and capability resolution.
/// Auto-detects and marks expired subscriptions on read.
/// Does NOT process payments or gateway webhooks.
/// </summary>
public sealed class SubscriptionService : ISubscriptionService
{
    private static readonly Guid FreePlanId    = new("00000001-0000-0000-0000-000000000000");
    private static readonly Guid FreePricingId = new("ef000001-0000-0000-0000-000000000000");

    private readonly BoiootDbContext  _db;
    private readonly IAccountResolver _resolver;

    public SubscriptionService(BoiootDbContext db, IAccountResolver resolver)
    {
        _db       = db;
        _resolver = resolver;
    }

    // ── GetCurrentAsync (user-facing) ─────────────────────────────────────────

    public async Task<CurrentSubscriptionResponse?> GetCurrentAsync(
        Guid userId, CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct);
        if (accountId is null)
            return null;

        return await GetCurrentPlanCapabilitiesAsync(accountId.Value, ct);
    }

    // ── GetCurrentPlanCapabilitiesAsync (by accountId — for enforcement) ──────

    public async Task<CurrentSubscriptionResponse?> GetCurrentPlanCapabilitiesAsync(
        Guid accountId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;

        // 1. Auto-detect and expire stale subscriptions first
        await ExpireStaleSubscriptionsAsync(accountId, now, ct);

        // 2. Fetch the best active subscription
        var sub = await _db.Subscriptions
            .AsNoTracking()
            .Include(s => s.Plan)
            .Where(s =>
                s.AccountId == accountId &&
                s.IsActive &&
                (s.Status == SubscriptionStatus.Trial ||
                 s.Status == SubscriptionStatus.Active ||
                 s.Status == SubscriptionStatus.Pending) &&
                (s.EndDate == null || s.EndDate > now))
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync(ct);

        if (sub is null)
            return await BuildFreeResponseAsync(ct);

        var pricing = sub.PricingId.HasValue
            ? await _db.PlanPricings.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == sub.PricingId.Value, ct)
            : null;

        pricing ??= await _db.PlanPricings.AsNoTracking()
            .Where(p => p.PlanId == sub.PlanId && p.BillingCycle == "Monthly" && p.IsActive)
            .FirstOrDefaultAsync(ct);

        var ent = await LoadPlanEntitlementsAsync(sub.PlanId, ct);

        return BuildResponse(sub, sub.Plan, pricing, ent);
    }

    // ── GetUpgradeIntentAsync ─────────────────────────────────────────────────

    public async Task<UpgradeIntentResponse> GetUpgradeIntentAsync(
        Guid userId,
        UpgradeIntentRequest request,
        CancellationToken ct = default)
    {
        var targetPricing = await _db.PlanPricings
            .AsNoTracking()
            .Include(p => p.Plan)
            .FirstOrDefaultAsync(p => p.Id == request.PricingId && p.IsActive, ct)
            ?? throw new KeyNotFoundException("لم يتم العثور على خيار التسعير المطلوب");

        var current = await GetCurrentAsync(userId, ct);

        if (current is null)
        {
            return new UpgradeIntentResponse
            {
                CurrentPlanName = "—",
                TargetPlanName  = targetPricing.Plan.DisplayNameAr ?? targetPricing.Plan.Name,
                BillingCycle    = targetPricing.BillingCycle,
                PriceAmount     = targetPricing.PriceAmount,
                CurrencyCode    = targetPricing.CurrencyCode,
                Allowed         = false,
                Reason          = "no_account",
                Message         = "يرجى إنشاء حساب أولاً للاشتراك في إحدى الباقات",
                TargetPlanId    = targetPricing.Plan.Id,
                TargetPricingId = targetPricing.Id,
            };
        }

        var currentRank = current.Rank;
        var targetRank  = targetPricing.Plan.Rank;

        if (targetPricing.Plan.Id == current.PlanId && targetPricing.BillingCycle == current.BillingCycle)
        {
            return new UpgradeIntentResponse
            {
                CurrentPlanName = current.PlanName,
                TargetPlanName  = targetPricing.Plan.DisplayNameAr ?? targetPricing.Plan.Name,
                BillingCycle    = targetPricing.BillingCycle,
                PriceAmount     = targetPricing.PriceAmount,
                CurrencyCode    = targetPricing.CurrencyCode,
                Allowed         = false,
                Reason          = "already_subscribed",
                Message         = $"أنت مشترك بالفعل في {current.PlanName}",
                TargetPlanId    = targetPricing.Plan.Id,
                TargetPricingId = targetPricing.Id,
            };
        }

        if (targetPricing.Plan.Id == current.PlanId)
        {
            return new UpgradeIntentResponse
            {
                CurrentPlanName = current.PlanName,
                TargetPlanName  = targetPricing.Plan.DisplayNameAr ?? targetPricing.Plan.Name,
                BillingCycle    = targetPricing.BillingCycle,
                PriceAmount     = targetPricing.PriceAmount,
                CurrencyCode    = targetPricing.CurrencyCode,
                Allowed         = true,
                Reason          = "cycle_change",
                Message         = $"سيتم تغيير دورة الفوترة إلى {ArabicCycle(targetPricing.BillingCycle)} " +
                                  $"بسعر {targetPricing.PriceAmount:N0} {targetPricing.CurrencyCode}",
                TargetPlanId    = targetPricing.Plan.Id,
                TargetPricingId = targetPricing.Id,
            };
        }

        var reason = targetRank > currentRank ? "upgrade" : "downgrade";
        var verb   = targetRank > currentRank ? "ترقية" : "تخفيض";

        return new UpgradeIntentResponse
        {
            CurrentPlanName = current.PlanName,
            TargetPlanName  = targetPricing.Plan.DisplayNameAr ?? targetPricing.Plan.Name,
            BillingCycle    = targetPricing.BillingCycle,
            PriceAmount     = targetPricing.PriceAmount,
            CurrencyCode    = targetPricing.CurrencyCode,
            Allowed         = true,
            Reason          = reason,
            Message         = $"{verb} من {current.PlanName} إلى {targetPricing.Plan.DisplayNameAr ?? targetPricing.Plan.Name} " +
                              $"بسعر {targetPricing.PriceAmount:N0} {targetPricing.CurrencyCode} / {ArabicCycle(targetPricing.BillingCycle)}",
            TargetPlanId    = targetPricing.Plan.Id,
            TargetPricingId = targetPricing.Id,
        };
    }

    // ── GetHistoryAsync ───────────────────────────────────────────────────────

    public async Task<List<SubscriptionHistoryDto>> GetHistoryAsync(
        Guid userId, CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct);
        if (accountId is null)
            return [];

        return await GetHistoryByAccountAsync(accountId.Value, ct);
    }

    // ── AssignPlanAsync ───────────────────────────────────────────────────────

    public async Task<CurrentSubscriptionResponse> AssignPlanAsync(
        Guid adminUserId,
        AssignPlanRequest request,
        CancellationToken ct = default)
    {
        var plan = await _db.Plans.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.PlanId && p.IsActive, ct)
            ?? throw new KeyNotFoundException("الباقة غير موجودة أو غير نشطة");

        var existingSubs = await _db.Subscriptions
            .Where(s => s.AccountId == request.AccountId && s.IsActive)
            .ToListAsync(ct);

        Guid? oldPlanId = null;
        var now = DateTime.UtcNow;

        foreach (var existing in existingSubs)
        {
            oldPlanId = existing.PlanId;
            existing.IsActive = false;
            existing.EndedAt  = now;
            if (existing.Status != SubscriptionStatus.Cancelled)
                existing.Status = SubscriptionStatus.Expired;
        }

        var isFree = plan.Id == FreePlanId || plan.BasePriceMonthly == 0;

        var sub = new Subscription
        {
            AccountId          = request.AccountId,
            PlanId             = request.PlanId,
            PricingId          = request.PricingId,
            Status             = SubscriptionStatus.Active,
            StartDate          = now,
            IsActive           = true,
            AutoRenew          = !isFree,
            CurrentPeriodStart = now,
            CurrentPeriodEnd   = isFree ? null : now.AddMonths(1),
            CreatedAt          = now,
            UpdatedAt          = now,
        };

        _db.Subscriptions.Add(sub);

        // Determine correct event type
        string eventType;
        if (oldPlanId is null)
        {
            eventType = "assigned";
        }
        else
        {
            var oldPlan = await _db.Plans.AsNoTracking()
                .Select(p => new { p.Id, p.Rank })
                .FirstOrDefaultAsync(p => p.Id == oldPlanId.Value, ct);
            eventType = (oldPlan?.Rank ?? 0) < plan.Rank ? "upgraded" : "assigned";
        }

        _db.SubscriptionHistories.Add(new SubscriptionHistory
        {
            SubscriptionId  = sub.Id,
            EventType       = eventType,
            OldPlanId       = oldPlanId,
            NewPlanId       = request.PlanId,
            Notes           = request.Notes,
            CreatedByUserId = adminUserId,
            CreatedAtUtc    = now,
        });

        await _db.SaveChangesAsync(ct);

        var ent = await LoadPlanEntitlementsAsync(plan.Id, ct);
        return BuildResponse(sub, plan, null, ent);
    }

    // ── ChangePlanAsync ───────────────────────────────────────────────────────

    public async Task<CurrentSubscriptionResponse> ChangePlanAsync(
        Guid userId,
        ChangePlanRequest request,
        CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct)
            ?? throw new InvalidOperationException("لا يوجد حساب مرتبط بهذا المستخدم");

        var newPlan = await _db.Plans.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.PlanId && p.IsActive, ct)
            ?? throw new KeyNotFoundException("الباقة الجديدة غير موجودة أو غير نشطة");

        var currentSub = await _db.Subscriptions
            .Where(s => s.AccountId == accountId && s.IsActive)
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync(ct);

        var now = DateTime.UtcNow;
        Guid? oldPlanId = currentSub?.PlanId;

        if (currentSub is not null)
        {
            currentSub.IsActive = false;
            currentSub.EndedAt  = now;
            if (currentSub.Status != SubscriptionStatus.Cancelled)
                currentSub.Status = SubscriptionStatus.Expired;
        }

        var isFree = newPlan.BasePriceMonthly == 0;
        var newSub = new Subscription
        {
            AccountId          = accountId,
            PlanId             = request.PlanId,
            PricingId          = request.PricingId,
            Status             = SubscriptionStatus.Active,
            StartDate          = now,
            IsActive           = true,
            AutoRenew          = !isFree,
            CurrentPeriodStart = now,
            CurrentPeriodEnd   = isFree ? null : now.AddMonths(1),
            CreatedAt          = now,
            UpdatedAt          = now,
        };
        _db.Subscriptions.Add(newSub);

        string eventType;
        if (oldPlanId is null)
        {
            eventType = "created";
        }
        else
        {
            var oldRank = (await _db.Plans.AsNoTracking()
                .Select(p => new { p.Id, p.Rank })
                .FirstOrDefaultAsync(p => p.Id == oldPlanId.Value, ct))?.Rank ?? 0;
            eventType = newPlan.Rank > oldRank ? "upgraded"
                      : newPlan.Rank < oldRank ? "downgraded"
                      : "changed";
        }

        _db.SubscriptionHistories.Add(new SubscriptionHistory
        {
            SubscriptionId  = newSub.Id,
            EventType       = eventType,
            OldPlanId       = oldPlanId,
            NewPlanId       = request.PlanId,
            Notes           = request.Notes,
            CreatedByUserId = userId,
            CreatedAtUtc    = now,
        });

        await _db.SaveChangesAsync(ct);

        var pricing = request.PricingId.HasValue
            ? await _db.PlanPricings.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == request.PricingId.Value, ct)
            : null;

        var ent = await LoadPlanEntitlementsAsync(newPlan.Id, ct);
        return BuildResponse(newSub, newPlan, pricing, ent);
    }

    // ── CancelAsync ───────────────────────────────────────────────────────────

    public async Task<CurrentSubscriptionResponse> CancelAsync(
        Guid userId,
        CancelSubscriptionRequest request,
        CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct)
            ?? throw new InvalidOperationException("لا يوجد حساب مرتبط بهذا المستخدم");

        var sub = await _db.Subscriptions
            .Include(s => s.Plan)
            .Where(s => s.AccountId == accountId && s.IsActive)
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync(ct)
            ?? throw new InvalidOperationException("لا يوجد اشتراك نشط ليتم إلغاؤه");

        var now      = DateTime.UtcNow;
        var oldPlanId = sub.PlanId;

        sub.Status    = SubscriptionStatus.Cancelled;
        sub.IsActive  = false;
        sub.CanceledAt = now;
        sub.EndedAt   = now;
        sub.AutoRenew = false;
        sub.UpdatedAt = now;

        _db.SubscriptionHistories.Add(new SubscriptionHistory
        {
            SubscriptionId  = sub.Id,
            EventType       = "canceled",
            OldPlanId       = oldPlanId,
            NewPlanId       = null,
            Notes           = request.Notes,
            CreatedByUserId = userId,
            CreatedAtUtc    = now,
        });

        await _db.SaveChangesAsync(ct);

        return await BuildFreeResponseAsync(ct);
    }

    // ── GetAllSubscriptionsAsync (admin) ──────────────────────────────────────

    public async Task<List<AdminSubscriptionDto>> GetAllSubscriptionsAsync(
        int page, int pageSize, string? statusFilter, CancellationToken ct = default)
    {
        var query = _db.Subscriptions
            .AsNoTracking()
            .Include(s => s.Plan)
            .Include(s => s.Account)
                .ThenInclude(a => a.CreatedByUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(statusFilter) &&
            Enum.TryParse<SubscriptionStatus>(statusFilter, true, out var parsedStatus))
        {
            query = query.Where(s => s.Status == parsedStatus);
        }

        var subs = await query
            .OrderByDescending(s => s.StartDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var result = new List<AdminSubscriptionDto>(subs.Count);
        foreach (var sub in subs)
        {
            PlanPricing? pricing = null;
            if (sub.PricingId.HasValue)
                pricing = await _db.PlanPricings.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Id == sub.PricingId.Value, ct);

            result.Add(new AdminSubscriptionDto
            {
                SubscriptionId    = sub.Id,
                AccountId         = sub.AccountId,
                AccountName       = sub.Account.Name,
                AccountOwnerEmail = sub.Account.CreatedByUser.Email,
                PlanId            = sub.PlanId,
                PlanName          = sub.Plan.DisplayNameAr ?? sub.Plan.Name,
                Status            = sub.Status.ToString(),
                AutoRenew         = sub.AutoRenew,
                IsActive          = sub.IsActive,
                StartDate         = sub.StartDate,
                EndDate           = sub.EndDate,
                TrialEndsAt       = sub.TrialEndsAt,
                CurrentPeriodEnd  = sub.CurrentPeriodEnd,
                CanceledAt        = sub.CanceledAt,
                BillingCycle      = pricing?.BillingCycle,
                PriceAmount       = pricing?.PriceAmount ?? 0,
                CurrencyCode      = pricing?.CurrencyCode ?? "SYP",
            });
        }

        return result;
    }

    // ── GetHistoryByAccountAsync (admin) ──────────────────────────────────────

    public async Task<List<SubscriptionHistoryDto>> GetHistoryByAccountAsync(
        Guid accountId, CancellationToken ct = default)
    {
        var subIds = await _db.Subscriptions
            .AsNoTracking()
            .Where(s => s.AccountId == accountId)
            .Select(s => s.Id)
            .ToListAsync(ct);

        if (subIds.Count == 0)
            return [];

        var rows = await _db.SubscriptionHistories
            .AsNoTracking()
            .Where(h => subIds.Contains(h.SubscriptionId))
            .OrderByDescending(h => h.CreatedAtUtc)
            .ToListAsync(ct);

        var planIds = rows
            .SelectMany(h => new[] { h.OldPlanId, h.NewPlanId })
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();

        var planNames = await _db.Plans
            .AsNoTracking()
            .Where(p => planIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p.DisplayNameAr ?? p.Name, ct);

        var userIds = rows
            .Where(h => h.CreatedByUserId.HasValue)
            .Select(h => h.CreatedByUserId!.Value)
            .Distinct()
            .ToList();

        var userNames = await _db.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName ?? u.Email, ct);

        return rows.Select(h => new SubscriptionHistoryDto
        {
            Id            = h.Id,
            EventType     = h.EventType,
            OldPlanName   = h.OldPlanId.HasValue && planNames.TryGetValue(h.OldPlanId.Value, out var op) ? op : null,
            NewPlanName   = h.NewPlanId.HasValue && planNames.TryGetValue(h.NewPlanId.Value, out var np) ? np : null,
            Notes         = h.Notes,
            CreatedAtUtc  = h.CreatedAtUtc,
            CreatedByName = h.CreatedByUserId.HasValue && userNames.TryGetValue(h.CreatedByUserId.Value, out var un) ? un : null,
        }).ToList();
    }

    // ── Private: auto-expiry detection ────────────────────────────────────────

    /// <summary>
    /// Finds subscriptions where IsActive=true, status is Active/Trial, but EndDate has passed
    /// OR listing quota has been fully consumed (for one_time_fixed_term plans).
    /// Marks them as Expired, writes a history event, and auto-downgrades to DowngradePlanCode if configured.
    /// Called before every read.
    /// </summary>
    private async Task ExpireStaleSubscriptionsAsync(
        Guid accountId, DateTime now, CancellationToken ct)
    {
        var candidates = await _db.Subscriptions
            .Include(s => s.Plan)
            .Where(s =>
                s.AccountId == accountId &&
                s.IsActive  &&
                (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial))
            .ToListAsync(ct);

        var stale = candidates.Where(s =>
        {
            // Expired by date
            bool dateExpired = s.EndDate != null && s.EndDate < now;

            // Expired by consumption (listing quota exhausted)
            bool quotaExhausted = false;
            if (s.Plan != null &&
                !string.Equals(s.Plan.ConsumptionPolicy, "none", StringComparison.OrdinalIgnoreCase) &&
                s.Plan.ListingLimit > 0 &&
                s.ListingQuotaUsed >= s.Plan.ListingLimit)
            {
                quotaExhausted = true;
            }

            return s.Plan?.ExpiryRule switch
            {
                "expire_by_date"                  => dateExpired,
                "expire_by_consumption"           => quotaExhausted,
                "expire_by_whichever_comes_first" => dateExpired || quotaExhausted,
                _                                 => dateExpired, // default: date-based
            };
        }).ToList();

        if (stale.Count == 0) return;

        var downgradePlanCodes = stale
            .Where(s => s.Plan?.AutoDowngradeOnExpiry == true && !string.IsNullOrWhiteSpace(s.Plan.DowngradePlanCode))
            .Select(s => s.Plan!.DowngradePlanCode!)
            .Distinct()
            .ToList();

        // Pre-load downgrade plans by code
        var downgradePlans = downgradePlanCodes.Count > 0
            ? await _db.Plans.AsNoTracking()
                .Where(p => p.Code != null && downgradePlanCodes.Contains(p.Code) && p.IsActive)
                .ToListAsync(ct)
            : [];

        foreach (var s in stale)
        {
            var quotaConsumed = s.Plan?.ListingLimit > 0 && s.ListingQuotaUsed >= s.Plan.ListingLimit;
            var notes = quotaConsumed
                ? "انتهاء تلقائي — استهلاك حصة الإعلانات بالكامل"
                : "انتهاء تلقائي بناءً على تاريخ انتهاء الاشتراك";

            s.IsActive  = false;
            s.Status    = SubscriptionStatus.Expired;
            s.EndedAt   = s.EndDate ?? now;
            s.UpdatedAt = now;

            _db.SubscriptionHistories.Add(new SubscriptionHistory
            {
                SubscriptionId  = s.Id,
                EventType       = "expired",
                OldPlanId       = s.PlanId,
                NewPlanId       = null,
                Notes           = notes,
                CreatedByUserId = null,
                CreatedAtUtc    = now,
            });

            // Auto-downgrade to the configured plan if applicable
            if (s.Plan?.AutoDowngradeOnExpiry == true && !string.IsNullOrWhiteSpace(s.Plan.DowngradePlanCode))
            {
                var downgradePlan = downgradePlans.FirstOrDefault(p =>
                    string.Equals(p.Code, s.Plan.DowngradePlanCode, StringComparison.OrdinalIgnoreCase));

                if (downgradePlan != null)
                {
                    var downgradesSub = new Subscription
                    {
                        AccountId          = s.AccountId,
                        PlanId             = downgradePlan.Id,
                        PricingId          = null,
                        Status             = SubscriptionStatus.Active,
                        StartDate          = now,
                        EndDate            = null,
                        IsActive           = true,
                        AutoRenew          = false,
                        PaymentRef         = "auto_downgrade",
                        CreatedAt          = now,
                        UpdatedAt          = now,
                    };
                    _db.Subscriptions.Add(downgradesSub);

                    _db.SubscriptionHistories.Add(new SubscriptionHistory
                    {
                        SubscriptionId  = downgradesSub.Id,
                        EventType       = "downgraded",
                        OldPlanId       = s.PlanId,
                        NewPlanId       = downgradePlan.Id,
                        Notes           = $"تخفيض تلقائي إلى خطة: {downgradePlan.DisplayNameAr ?? downgradePlan.Code ?? downgradePlan.Name}",
                        CreatedByUserId = null,
                        CreatedAtUtc    = now,
                    });
                }
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    // ── Private: build responses ──────────────────────────────────────────────

    private async Task<CurrentSubscriptionResponse> BuildFreeResponseAsync(CancellationToken ct)
    {
        var freePlan = await _db.Plans.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == FreePlanId, ct);
        var ent = await LoadPlanEntitlementsAsync(FreePlanId, ct);

        return new CurrentSubscriptionResponse
        {
            SubscriptionId   = Guid.Empty,
            PlanId           = FreePlanId,
            PlanName         = freePlan?.DisplayNameAr ?? freePlan?.Name ?? "مجاني",
            PlanCode         = freePlan?.Code,
            AudienceType     = freePlan?.AudienceType,
            Tier             = freePlan?.Tier,
            PricingId        = FreePricingId,
            BillingCycle     = "Monthly",
            PriceAmount      = 0,
            CurrencyCode     = "SYP",
            Rank             = freePlan?.Rank ?? 0,
            Status           = "Free",
            IsActive         = true,
            AutoRenew        = false,
            IsTrial          = false,
            IsExpired        = false,
            IsCanceled       = false,
            StartDate        = DateTime.MinValue,
            // Billing lifecycle
            PlanBillingType                = freePlan?.PlanBillingType ?? "free_default",
            ListingQuotaUsed               = 0,
            ListingLimit                   = ent.Limit("max_active_listings"),
            IsQuotaExhausted               = false,
            AllowRepurchaseOnConsumption   = freePlan?.AllowRepurchaseOnConsumption  ?? false,
            AllowEarlyRenewalOnConsumption = freePlan?.AllowEarlyRenewalOnConsumption ?? false,
            CanRepurchaseNow               = false,
            CanRenewEarlyNow               = false,
            // Backward-compat
            HasAnalyticsDashboard = ent.Feat("analytics_dashboard"),
            HasVideoUpload        = ent.Feat("video_upload"),
            HasFeaturedListings   = ent.Feat("featured_listings"),
            HasWhatsappContact    = ent.Feat("whatsapp_contact"),
            HasVerifiedBadge      = ent.Feat("verified_badge"),
            HasHomepageExposure   = ent.Feat("homepage_exposure"),
            HasProjectManagement  = ent.Feat("project_management"),
            MaxActiveListings     = ent.Limit("max_active_listings"),
            MaxImagesPerListing   = ent.Limit("max_images_per_listing"),
            MaxAgents             = ent.Limit("max_agents"),
            MaxFeaturedSlots      = ent.Limit("max_featured_slots"),
            // Dynamic maps
            Features = ent.Features,
            Limits   = ent.Limits,
            Policies = ent.Policies,
        };
    }

    private static CurrentSubscriptionResponse BuildResponse(
        Subscription sub,
        Plan plan,
        PlanPricing? pricing,
        PlanEntitlements ent)
    {
        var now       = DateTime.UtcNow;
        var isTrial   = sub.Status == SubscriptionStatus.Trial
                        && (sub.TrialEndsAt == null || sub.TrialEndsAt > now);
        var isExpired = sub.Status == SubscriptionStatus.Expired
                        || (sub.EndDate.HasValue && sub.EndDate < now);
        var isCanceled = sub.Status == SubscriptionStatus.Cancelled;

        // Quota exhaustion
        var listingLimit     = ent.Limit("max_active_listings");
        var listingQuotaUsed = sub.ListingQuotaUsed;
        var isQuotaExhausted = !string.Equals(plan.ConsumptionPolicy, "none", StringComparison.OrdinalIgnoreCase)
                               && listingLimit > 0
                               && listingQuotaUsed >= listingLimit;

        var canRepurchaseNow = isQuotaExhausted
                               && plan.AllowRepurchaseOnConsumption
                               && string.Equals(plan.PlanBillingType, "one_time_fixed_term", StringComparison.OrdinalIgnoreCase);

        var canRenewEarlyNow = isQuotaExhausted
                               && plan.AllowEarlyRenewalOnConsumption
                               && string.Equals(plan.PlanBillingType, "recurring", StringComparison.OrdinalIgnoreCase);

        return new CurrentSubscriptionResponse
        {
            SubscriptionId     = sub.Id,
            PlanId             = plan.Id,
            PlanName           = plan.DisplayNameAr ?? plan.Name,
            PlanCode           = plan.Code,
            AudienceType       = plan.AudienceType,
            Tier               = plan.Tier,
            PricingId          = pricing?.Id,
            BillingCycle       = pricing?.BillingCycle ?? "Monthly",
            PriceAmount        = pricing?.PriceAmount  ?? 0,
            CurrencyCode       = pricing?.CurrencyCode ?? "SYP",
            Rank               = plan.Rank,
            Status             = sub.Status.ToString(),
            IsActive           = sub.IsActive,
            AutoRenew          = sub.AutoRenew,
            IsTrial            = isTrial,
            IsExpired          = isExpired,
            IsCanceled         = isCanceled,
            StartDate          = sub.StartDate,
            EndDate            = sub.EndDate,
            TrialEndsAt        = sub.TrialEndsAt,
            CurrentPeriodStart = sub.CurrentPeriodStart,
            CurrentPeriodEnd   = sub.CurrentPeriodEnd,
            CanceledAt         = sub.CanceledAt,
            EndedAt            = sub.EndedAt,
            // Billing lifecycle
            PlanBillingType                = plan.PlanBillingType,
            ListingQuotaUsed               = listingQuotaUsed,
            ListingLimit                   = listingLimit,
            IsQuotaExhausted               = isQuotaExhausted,
            AllowRepurchaseOnConsumption   = plan.AllowRepurchaseOnConsumption,
            AllowEarlyRenewalOnConsumption = plan.AllowEarlyRenewalOnConsumption,
            CanRepurchaseNow               = canRepurchaseNow,
            CanRenewEarlyNow               = canRenewEarlyNow,
            // Backward-compat
            HasAnalyticsDashboard = ent.Feat("analytics_dashboard"),
            HasVideoUpload        = ent.Feat("video_upload"),
            HasFeaturedListings   = ent.Feat("featured_listings"),
            HasWhatsappContact    = ent.Feat("whatsapp_contact"),
            HasVerifiedBadge      = ent.Feat("verified_badge"),
            HasHomepageExposure   = ent.Feat("homepage_exposure"),
            HasProjectManagement  = ent.Feat("project_management"),
            MaxActiveListings     = ent.Limit("max_active_listings"),
            MaxImagesPerListing   = ent.Limit("max_images_per_listing"),
            MaxAgents             = ent.Limit("max_agents"),
            MaxFeaturedSlots      = ent.Limit("max_featured_slots"),
            // Dynamic maps
            Features = ent.Features,
            Limits   = ent.Limits,
            Policies = ent.Policies,
        };
    }

    // ── Private: entitlement loading ──────────────────────────────────────────

    private async Task<PlanEntitlements> LoadPlanEntitlementsAsync(Guid planId, CancellationToken ct)
    {
        var features = await (
            from pf in _db.Set<PlanFeature>()
            where pf.SubscriptionPlanId == planId
            join fd in _db.Set<FeatureDefinition>() on pf.FeatureDefinitionId equals fd.Id
            select new { fd.Key, pf.IsEnabled, fd.AccessPolicy }
        ).ToListAsync(ct);

        var limits = await (
            from pl in _db.Set<PlanLimit>()
            where pl.SubscriptionPlanId == planId
            join ld in _db.Set<LimitDefinition>() on pl.LimitDefinitionId equals ld.Id
            select new { ld.Key, pl.Value }
        ).ToListAsync(ct);

        var featureMap = features.ToDictionary(x => x.Key, x => x.IsEnabled);
        var limitMap   = limits.ToDictionary(x => x.Key, x => (int)x.Value);

        // Build policies map: only include features with non-open (non-null) access policies.
        var policyMap = features
            .Where(x => !string.IsNullOrEmpty(x.AccessPolicy)
                        && !x.AccessPolicy.Equals("open", StringComparison.OrdinalIgnoreCase))
            .ToDictionary(x => x.Key, x => x.AccessPolicy!);

        return new PlanEntitlements(featureMap, limitMap, policyMap);
    }

    private sealed record PlanEntitlements(
        Dictionary<string, bool>   Features,
        Dictionary<string, int>    Limits,
        Dictionary<string, string> Policies)
    {
        public bool Feat(string key)  => Features.TryGetValue(key, out var v) && v;
        public int  Limit(string key) => Limits.TryGetValue(key, out var v) ? v : 0;
    }

    private static string ArabicCycle(string cycle) => cycle switch
    {
        "Yearly"  => "سنوياً",
        "OneTime" => "دفعة واحدة",
        _         => "شهرياً",
    };
}
