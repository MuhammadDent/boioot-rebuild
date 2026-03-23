using Boioot.Application.Features.Pricing.DTOs;
using Boioot.Application.Features.Pricing.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Pricing;

public class PublicPricingService : IPublicPricingService
{
    private readonly BoiootDbContext _db;

    public PublicPricingService(BoiootDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Returns all active plans that have at least one active + public pricing entry.
    /// Uses explicit LINQ joins to avoid Include/ThenInclude Guid-parsing issues with SQLite.
    /// </summary>
    public async Task<List<PublicPricingItem>> GetPublicPricingAsync(CancellationToken ct = default)
    {
        // ── 1. Qualifying plan IDs ─────────────────────────────────────────────
        var planIds = await _db.Set<Plan>()
            .Where(p => p.IsActive && p.IsPublic
                     && _db.Set<PlanPricing>().Any(pp => pp.PlanId == p.Id && pp.IsActive && pp.IsPublic))
            .OrderBy(p => p.DisplayOrder)
            .ThenBy(p => p.CreatedAt)
            .Select(p => p.Id)
            .ToListAsync(ct);

        if (planIds.Count == 0)
            return [];

        // ── 2. Plan summaries ──────────────────────────────────────────────────
        var plans = await _db.Set<Plan>()
            .Where(p => planIds.Contains(p.Id))
            .OrderBy(p => p.DisplayOrder)
            .ThenBy(p => p.CreatedAt)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Description,
                ApplicableAccountType = p.ApplicableAccountType == null ? null : p.ApplicableAccountType.ToString(),
                p.Rank,
                p.DisplayOrder,
                p.IsRecommended,
                p.PlanCategory,
            })
            .AsNoTracking()
            .ToListAsync(ct);

        // ── 3. Pricings ────────────────────────────────────────────────────────
        var pricings = await _db.Set<PlanPricing>()
            .Where(pp => planIds.Contains(pp.PlanId) && pp.IsActive && pp.IsPublic)
            .Select(pp => new
            {
                pp.Id,
                pp.PlanId,
                pp.BillingCycle,
                pp.PriceAmount,
                pp.CurrencyCode,
            })
            .AsNoTracking()
            .ToListAsync(ct);

        // ── 4. Limits (join PlanLimits + LimitDefinitions) ────────────────────
        var limits = await (
            from pl in _db.Set<PlanLimit>()
            join ld in _db.Set<LimitDefinition>() on pl.LimitDefinitionId equals ld.Id
            where planIds.Contains(pl.SubscriptionPlanId) && ld.IsActive
            select new
            {
                pl.SubscriptionPlanId,
                ld.Key,
                ld.Name,
                pl.Value,
                ld.Unit,
            }
        ).AsNoTracking().ToListAsync(ct);

        // ── 5. Features (join PlanFeatures + FeatureDefinitions) ──────────────
        var features = await (
            from pf in _db.Set<PlanFeature>()
            join fd in _db.Set<FeatureDefinition>() on pf.FeatureDefinitionId equals fd.Id
            where planIds.Contains(pf.SubscriptionPlanId) && fd.IsActive
            select new
            {
                pf.SubscriptionPlanId,
                fd.Key,
                fd.Name,
                pf.IsEnabled,
                fd.FeatureGroup,
            }
        ).AsNoTracking().ToListAsync(ct);

        // ── 6. Assemble ────────────────────────────────────────────────────────
        return plans.Select(p => new PublicPricingItem(
            PlanId:               p.Id,
            PlanName:             p.Name,
            Description:          p.Description,
            ApplicableAccountType: p.ApplicableAccountType,
            Rank:                 p.Rank,
            DisplayOrder:         p.DisplayOrder,
            IsRecommended:        p.IsRecommended,
            PlanCategory:         p.PlanCategory,
            Pricing: pricings
                .Where(pp => pp.PlanId == p.Id)
                .OrderBy(pp => pp.BillingCycle)
                .Select(pp => new PublicPricingEntry(pp.Id, pp.BillingCycle, (decimal)pp.PriceAmount, pp.CurrencyCode))
                .ToList(),
            Limits: limits
                .Where(l => l.SubscriptionPlanId == p.Id)
                .Select(l => new PublicLimitItem(l.Key, l.Name, l.Value, l.Unit))
                .ToList(),
            Features: features
                .Where(f => f.SubscriptionPlanId == p.Id)
                .Select(f => new PublicFeatureItem(f.Key, f.Name, f.IsEnabled, f.FeatureGroup))
                .ToList()
        )).ToList();
    }
}
