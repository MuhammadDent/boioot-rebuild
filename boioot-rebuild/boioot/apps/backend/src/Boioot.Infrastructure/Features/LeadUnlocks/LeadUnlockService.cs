using Boioot.Application.Exceptions;
using Boioot.Application.Features.LeadUnlocks;
using Boioot.Application.Features.Subscriptions;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.LeadUnlocks;

public sealed class LeadUnlockService : ILeadUnlockService
{
    private readonly BoiootDbContext         _db;
    private readonly IAccountResolver        _resolver;
    private readonly IPlanEntitlementService _entitlement;
    private readonly ILogger<LeadUnlockService> _logger;

    public LeadUnlockService(
        BoiootDbContext db,
        IAccountResolver resolver,
        IPlanEntitlementService entitlement,
        ILogger<LeadUnlockService> logger)
    {
        _db          = db;
        _resolver    = resolver;
        _entitlement = entitlement;
        _logger      = logger;
    }

    // ── UnlockAsync ───────────────────────────────────────────────────────────

    public async Task<LeadUnlockResult> UnlockAsync(
        Guid userId, Guid propertyId, CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct)
            ?? throw new BoiootException("لا يوجد حساب مرتبط بهذا المستخدم", 400);

        // Load property + owner info
        var property = await _db.Properties
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == propertyId, ct)
            ?? throw new BoiootException("الإعلان غير موجود", 404);

        // Resolve owner contact
        var (ownerName, contactPhone, contactWhatsapp) = await ResolveContactInfoAsync(property, ct);

        // ── Check if already unlocked this month ─────────────────────────────
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var alreadyUnlocked = await _db.Set<LeadUnlock>()
            .AnyAsync(u => u.UnlockerAccountId == accountId
                        && u.PropertyId == propertyId
                        && u.UnlockedAt >= monthStart, ct);

        if (alreadyUnlocked)
        {
            var (usedNow, limitNow) = await GetMonthlyUsageForAccountAsync(accountId, ct);
            return new LeadUnlockResult(
                AlreadyUnlocked:          true,
                ContactPhone:             contactPhone,
                ContactWhatsApp:          contactWhatsapp,
                OwnerName:                ownerName,
                UnlocksUsedThisMonth:     usedNow,
                UnlocksAllowedThisMonth:  limitNow);
        }

        // ── Check monthly limit ───────────────────────────────────────────────
        var (used, limit) = await GetMonthlyUsageForAccountAsync(accountId, ct);

        if (limit != -1 && used >= limit)
        {
            var suggestedPlan = limit == 0 ? "office_basic" : "office_advanced";

            _logger.LogWarning(
                "[LeadUnlock] Limit exceeded — accountId={AccountId} used={Used} limit={Limit}",
                accountId, used, limit);

            throw new PlanLimitException(
                limitKey:         SubscriptionKeys.MonthlyLeadUnlocks,
                message:          $"لقد استنفدت جميع فتحات كشف بيانات التواصل لهذا الشهر ({used}/{limit}). يرجى ترقية باقتك للمزيد.",
                upgradeRequired:  true,
                currentValue:     used,
                planLimit:        limit,
                suggestedPlanCode: suggestedPlan);
        }

        // ── Record the unlock ─────────────────────────────────────────────────
        var unlock = new LeadUnlock
        {
            Id                = Guid.NewGuid(),
            UnlockerAccountId = accountId,
            PropertyId        = propertyId,
            UnlockType        = limit == -1 ? "Subscription" : "PerLead",
            UnlockedAt        = DateTime.UtcNow,
            CreatedAt         = DateTime.UtcNow,
        };

        _db.Set<LeadUnlock>().Add(unlock);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "[LeadUnlock] Unlocked — accountId={AccountId} propertyId={PropertyId} used={Used}/{Limit}",
            accountId, propertyId, used + 1, limit == -1 ? "∞" : limit.ToString());

        return new LeadUnlockResult(
            AlreadyUnlocked:         false,
            ContactPhone:            contactPhone,
            ContactWhatsApp:         contactWhatsapp,
            OwnerName:               ownerName,
            UnlocksUsedThisMonth:    used + 1,
            UnlocksAllowedThisMonth: limit);
    }

    // ── GetMonthlyUsageAsync (user-facing) ────────────────────────────────────

    public async Task<(int used, int limit)> GetMonthlyUsageAsync(
        Guid userId, CancellationToken ct = default)
    {
        var accountId = await _resolver.ResolveAccountIdAsync(userId, ct);
        if (accountId is null) return (0, 0);
        return await GetMonthlyUsageForAccountAsync(accountId.Value, ct);
    }

    // ── Private: resolve contact info from property ───────────────────────────

    private async Task<(string name, string phone, string whatsapp)> ResolveContactInfoAsync(
        Property property, CancellationToken ct)
    {
        // Personal listing → contact the OwnerId user
        if (!string.IsNullOrEmpty(property.OwnerId) &&
            Guid.TryParse(property.OwnerId, out var ownerId))
        {
            var owner = await _db.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == ownerId, ct);
            if (owner != null)
                return (owner.FullName, owner.Phone ?? string.Empty, string.Empty);
        }

        // Company listing → contact the company's phone/whatsapp
        var company = await _db.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == property.CompanyId, ct);

        if (company != null)
            return (company.Name, company.Phone ?? string.Empty, company.WhatsApp ?? string.Empty);

        return ("صاحب الإعلان", string.Empty, string.Empty);
    }

    // ── Private: monthly usage query ─────────────────────────────────────────

    private async Task<(int used, int limit)> GetMonthlyUsageForAccountAsync(
        Guid accountId, CancellationToken ct)
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var used = await _db.Set<LeadUnlock>()
            .CountAsync(u => u.UnlockerAccountId == accountId
                          && u.UnlockedAt >= monthStart, ct);

        var limit = (int)await _entitlement.GetLimitAsync(accountId, SubscriptionKeys.MonthlyLeadUnlocks, ct);

        return (used, limit);
    }
}
