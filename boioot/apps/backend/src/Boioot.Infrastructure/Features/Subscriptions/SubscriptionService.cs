using Boioot.Application.Features.Subscriptions.DTOs;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Subscriptions;

/// <summary>
/// Read-only subscription state service.
/// Does NOT process payments or mutate subscription rows.
/// </summary>
public sealed class SubscriptionService : ISubscriptionService
{
    // The Free plan fixed GUID (seeded in Program.cs)
    private static readonly Guid FreePlanId   = new("00000001-0000-0000-0000-000000000000");
    private static readonly Guid FreePricingId = new("ef000001-0000-0000-0000-000000000000");

    private readonly BoiootDbContext  _db;
    private readonly IAccountResolver _resolver;

    public SubscriptionService(BoiootDbContext db, IAccountResolver resolver)
    {
        _db       = db;
        _resolver = resolver;
    }

    // ── GetCurrentAsync ───────────────────────────────────────────────────────

    public async Task<CurrentSubscriptionResponse?> GetCurrentAsync(
        Guid userId, CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct);
        if (accountId is null)
            return null;

        // Find the most recent active subscription
        var sub = await _db.Subscriptions
            .AsNoTracking()
            .Include(s => s.Plan)
            .Where(s =>
                s.AccountId == accountId.Value &&
                s.IsActive &&
                (s.Status == SubscriptionStatus.Trial || s.Status == SubscriptionStatus.Active) &&
                (s.EndDate == null || s.EndDate > DateTime.UtcNow))
            .OrderByDescending(s => s.StartDate)
            .FirstOrDefaultAsync(ct);

        if (sub is null)
            return await BuildFreeResponseAsync(ct);

        // Resolve the PlanPricing row: prefer the stored PricingId, fall back to Monthly
        var pricing = sub.PricingId.HasValue
            ? await _db.PlanPricings
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == sub.PricingId.Value, ct)
            : null;

        pricing ??= await _db.PlanPricings
            .AsNoTracking()
            .Where(p => p.PlanId == sub.PlanId && p.BillingCycle == "Monthly" && p.IsActive)
            .FirstOrDefaultAsync(ct);

        return new CurrentSubscriptionResponse
        {
            PlanId       = sub.PlanId,
            PlanName     = sub.Plan.Name,
            PricingId    = pricing?.Id,
            BillingCycle = pricing?.BillingCycle ?? "Monthly",
            PriceAmount  = pricing?.PriceAmount  ?? 0,
            CurrencyCode = pricing?.CurrencyCode  ?? "SYP",
            Rank         = sub.Plan.Rank,
            Status       = sub.Status.ToString(),
        };
    }

    // ── GetUpgradeIntentAsync ─────────────────────────────────────────────────

    public async Task<UpgradeIntentResponse> GetUpgradeIntentAsync(
        Guid userId,
        UpgradeIntentRequest request,
        CancellationToken ct = default)
    {
        // 1. Resolve target pricing
        var targetPricing = await _db.PlanPricings
            .AsNoTracking()
            .Include(p => p.Plan)
            .FirstOrDefaultAsync(p => p.Id == request.PricingId && p.IsActive, ct)
            ?? throw new KeyNotFoundException("لم يتم العثور على خيار التسعير المطلوب");

        // 2. Get current subscription (may be null → no account, or Free)
        var current = await GetCurrentAsync(userId, ct);

        // 3. No account at all
        if (current is null)
        {
            return new UpgradeIntentResponse
            {
                CurrentPlanName = "—",
                TargetPlanName  = targetPricing.Plan.Name,
                BillingCycle    = targetPricing.BillingCycle,
                PriceAmount     = targetPricing.PriceAmount,
                CurrencyCode    = targetPricing.CurrencyCode,
                Allowed         = false,
                Reason          = "no_account",
                Message         = "يرجى إنشاء حساب أولاً للاشتراك في إحدى الباقات",
            };
        }

        var currentRank = current.Rank;
        var targetRank  = targetPricing.Plan.Rank;

        // 4. Same plan, same cycle → already subscribed
        if (targetPricing.Plan.Id == current.PlanId &&
            targetPricing.BillingCycle == current.BillingCycle)
        {
            return new UpgradeIntentResponse
            {
                CurrentPlanName = current.PlanName,
                TargetPlanName  = targetPricing.Plan.Name,
                BillingCycle    = targetPricing.BillingCycle,
                PriceAmount     = targetPricing.PriceAmount,
                CurrencyCode    = targetPricing.CurrencyCode,
                Allowed         = false,
                Reason          = "already_subscribed",
                Message         = $"أنت مشترك بالفعل في {current.PlanName}",
            };
        }

        // 5. Same plan, different billing cycle → cycle change
        if (targetPricing.Plan.Id == current.PlanId)
        {
            return new UpgradeIntentResponse
            {
                CurrentPlanName = current.PlanName,
                TargetPlanName  = targetPricing.Plan.Name,
                BillingCycle    = targetPricing.BillingCycle,
                PriceAmount     = targetPricing.PriceAmount,
                CurrencyCode    = targetPricing.CurrencyCode,
                Allowed         = true,
                Reason          = "cycle_change",
                Message         = $"سيتم تغيير دورة الفوترة إلى {ArabicCycle(targetPricing.BillingCycle)} " +
                                  $"بسعر {targetPricing.PriceAmount:N0} {targetPricing.CurrencyCode}",
            };
        }

        // 6. Different plans — upgrade or downgrade
        if (targetRank > currentRank)
        {
            return new UpgradeIntentResponse
            {
                CurrentPlanName = current.PlanName,
                TargetPlanName  = targetPricing.Plan.Name,
                BillingCycle    = targetPricing.BillingCycle,
                PriceAmount     = targetPricing.PriceAmount,
                CurrencyCode    = targetPricing.CurrencyCode,
                Allowed         = true,
                Reason          = "upgrade",
                Message         = $"ترقية من {current.PlanName} إلى {targetPricing.Plan.Name} " +
                                  $"بسعر {targetPricing.PriceAmount:N0} {targetPricing.CurrencyCode} / {ArabicCycle(targetPricing.BillingCycle)}",
            };
        }

        // targetRank < currentRank → downgrade
        return new UpgradeIntentResponse
        {
            CurrentPlanName = current.PlanName,
            TargetPlanName  = targetPricing.Plan.Name,
            BillingCycle    = targetPricing.BillingCycle,
            PriceAmount     = targetPricing.PriceAmount,
            CurrencyCode    = targetPricing.CurrencyCode,
            Allowed         = true,
            Reason          = "downgrade",
            Message         = $"تخفيض من {current.PlanName} إلى {targetPricing.Plan.Name} " +
                              $"بسعر {targetPricing.PriceAmount:N0} {targetPricing.CurrencyCode} / {ArabicCycle(targetPricing.BillingCycle)}",
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<CurrentSubscriptionResponse> BuildFreeResponseAsync(CancellationToken ct)
    {
        var freePlan = await _db.Plans.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == FreePlanId, ct);

        return new CurrentSubscriptionResponse
        {
            PlanId       = FreePlanId,
            PlanName     = freePlan?.Name ?? "Free",
            PricingId    = FreePricingId,
            BillingCycle = "Monthly",
            PriceAmount  = 0,
            CurrencyCode = "SYP",
            Rank         = freePlan?.Rank ?? 0,
            Status       = "Free",
        };
    }

    private static string ArabicCycle(string cycle) =>
        cycle == "Yearly" ? "سنوياً" : "شهرياً";
}
