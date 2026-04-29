using Boioot.Application.Exceptions;
using Boioot.Application.Features.Pricing.DTOs;
using Boioot.Application.Features.Pricing.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Pricing;

public class AdminPlanPricingService : IAdminPlanPricingService
{
    private readonly BoiootDbContext _db;
    private readonly ILogger<AdminPlanPricingService> _logger;

    public AdminPlanPricingService(BoiootDbContext db, ILogger<AdminPlanPricingService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── GetByPlanAsync ────────────────────────────────────────────────────────
    public async Task<List<PlanPricingResponse>> GetByPlanAsync(Guid planId, CancellationToken ct = default)
    {
        var plan = await GetPlanOrThrowAsync(planId, ct);

        // Load all pricing rows for this plan first, then filter in-memory.
        // EF Core cannot translate the IsCycleCompatible switch expression to SQL,
        // so performing the filter after materialization avoids a 500 translation error.
        var all = await _db.PlanPricings
            .Where(pp => pp.PlanId == planId)
            .OrderBy(pp => pp.BillingCycle)
            .ToListAsync(ct);

        return all
            .Where(pp => IsCycleCompatible(pp.BillingCycle, plan.PlanBillingType))
            .Select(ToResponse)
            .ToList();
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────
    public async Task<PlanPricingResponse> CreateAsync(
        Guid planId, UpsertPlanPricingRequest request, CancellationToken ct = default)
    {
        var plan = await GetPlanOrThrowAsync(planId, ct);
        ValidateBillingCycle(request.BillingCycle);
        ValidateCycleCompatibility(request.BillingCycle, plan.PlanBillingType);

        var entry = new PlanPricing
        {
            Id               = Guid.NewGuid(),
            PlanId           = planId,
            BillingCycle     = request.BillingCycle,
            PriceAmount      = request.PriceAmount,
            CurrencyCode     = request.CurrencyCode.ToUpperInvariant(),
            IsActive         = request.IsActive,
            IsPublic         = request.IsPublic,
            ExternalProvider = request.ExternalProvider?.Trim(),
            ExternalPriceId  = request.ExternalPriceId?.Trim(),
            CreatedAt        = DateTime.UtcNow,
            UpdatedAt        = DateTime.UtcNow
        };

        _db.PlanPricings.Add(entry);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Created PlanPricing {Id} for plan {PlanId} ({Cycle})",
            entry.Id, planId, entry.BillingCycle);

        return ToResponse(entry);
    }

    // ── UpdateAsync ───────────────────────────────────────────────────────────
    public async Task<PlanPricingResponse> UpdateAsync(
        Guid planId, Guid pricingId, UpsertPlanPricingRequest request, CancellationToken ct = default)
    {
        var plan  = await GetPlanOrThrowAsync(planId, ct);
        var entry = await GetPricingOrThrowAsync(planId, pricingId, ct);
        ValidateBillingCycle(request.BillingCycle);
        ValidateCycleCompatibility(request.BillingCycle, plan.PlanBillingType);

        entry.BillingCycle     = request.BillingCycle;
        entry.PriceAmount      = request.PriceAmount;
        entry.CurrencyCode     = request.CurrencyCode.ToUpperInvariant();
        entry.IsActive         = request.IsActive;
        entry.IsPublic         = request.IsPublic;
        entry.ExternalProvider = request.ExternalProvider?.Trim();
        entry.ExternalPriceId  = request.ExternalPriceId?.Trim();
        entry.UpdatedAt        = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Updated PlanPricing {Id} for plan {PlanId}", pricingId, planId);
        return ToResponse(entry);
    }

    // ── SetActiveAsync ────────────────────────────────────────────────────────
    public async Task<PlanPricingResponse> SetActiveAsync(
        Guid planId, Guid pricingId, bool isActive, CancellationToken ct = default)
    {
        var entry = await GetPricingOrThrowAsync(planId, pricingId, ct);

        entry.IsActive  = isActive;
        entry.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("PlanPricing {Id} IsActive set to {IsActive}", pricingId, isActive);
        return ToResponse(entry);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────
    public async Task DeleteAsync(Guid planId, Guid pricingId, CancellationToken ct = default)
    {
        var entry = await GetPricingOrThrowAsync(planId, pricingId, ct);

        _db.PlanPricings.Remove(entry);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Deleted PlanPricing {Id}", pricingId);
    }

    // ── Private helpers ───────────────────────────────────────────────────────
    private async Task<Domain.Entities.Plan> GetPlanOrThrowAsync(Guid planId, CancellationToken ct)
    {
        return await _db.Set<Domain.Entities.Plan>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == planId, ct)
            ?? throw new BoiootException("الباقة غير موجودة", 404);
    }

    private async Task<PlanPricing> GetPricingOrThrowAsync(Guid planId, Guid pricingId, CancellationToken ct)
    {
        return await _db.PlanPricings
            .FirstOrDefaultAsync(pp => pp.Id == pricingId && pp.PlanId == planId, ct)
            ?? throw new BoiootException("سجل التسعير غير موجود", 404);
    }

    private static void ValidateBillingCycle(string cycle)
    {
        if (cycle is not ("Monthly" or "Yearly" or "OneTime"))
            throw new BoiootException("BillingCycle يجب أن يكون 'Monthly' أو 'Yearly' أو 'OneTime'", 400);
    }

    /// <summary>
    /// Throws 400 if the billing cycle is incompatible with the plan's billing type.
    /// Prevents adding Monthly/Yearly pricing to a one_time plan (and vice-versa).
    /// </summary>
    private static void ValidateCycleCompatibility(string billingCycle, string planBillingType)
    {
        if (!IsCycleCompatible(billingCycle, planBillingType))
            throw new BoiootException(
                $"لا يمكن إضافة سعر بدورة '{billingCycle}' إلى خطة من نوع '{planBillingType}'. " +
                "تحقق من توافق نوع الفوترة مع دورة السعر.", 400);
    }

    /// <summary>
    /// Returns true when a pricing BillingCycle is compatible with the plan's PlanBillingType.
    /// </summary>
    private static bool IsCycleCompatible(string billingCycle, string? planBillingType) =>
        planBillingType switch
        {
            "one_time_fixed_term" => billingCycle == "OneTime",
            "recurring"           => billingCycle == "Monthly" || billingCycle == "Yearly",
            "free_default"        => false,
            _                     => true,
        };

    private static PlanPricingResponse ToResponse(PlanPricing pp) => new(
        pp.Id,
        pp.PlanId,
        pp.BillingCycle,
        pp.PriceAmount,
        pp.CurrencyCode,
        pp.IsActive,
        pp.IsPublic,
        pp.ExternalProvider,
        pp.ExternalPriceId,
        pp.CreatedAt,
        pp.UpdatedAt
    );
}
