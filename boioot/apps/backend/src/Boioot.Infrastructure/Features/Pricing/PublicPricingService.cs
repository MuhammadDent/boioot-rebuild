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
    /// Includes limits and features. No authentication required.
    /// Does NOT touch enforcement logic — read-only projection only.
    /// </summary>
    public async Task<List<PublicPricingItem>> GetPublicPricingAsync(CancellationToken ct = default)
    {
        var plans = await _db.Set<Plan>()
            .Where(p => p.IsActive)
            .Include(p => p.PlanPricings.Where(pp => pp.IsActive && pp.IsPublic))
            .Include(p => p.PlanLimits)
                .ThenInclude(pl => pl.LimitDefinition)
            .Include(p => p.PlanFeatures)
                .ThenInclude(pf => pf.FeatureDefinition)
            .Where(p => p.PlanPricings.Any(pp => pp.IsActive && pp.IsPublic))
            .OrderBy(p => p.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);

        return plans.Select(p => new PublicPricingItem(
            PlanId:               p.Id,
            PlanName:             p.Name,
            Description:          p.Description,
            ApplicableAccountType: p.ApplicableAccountType?.ToString(),
            Rank:                 p.Rank,
            Pricing: p.PlanPricings
                .OrderBy(pp => pp.BillingCycle)
                .Select(pp => new PublicPricingEntry(pp.Id, pp.BillingCycle, pp.PriceAmount, pp.CurrencyCode))
                .ToList(),
            Limits: p.PlanLimits
                .Where(pl => pl.LimitDefinition.IsActive)
                .Select(pl => new PublicLimitItem(
                    pl.LimitDefinition.Key,
                    pl.LimitDefinition.Name,
                    pl.Value,
                    pl.LimitDefinition.Unit))
                .ToList(),
            Features: p.PlanFeatures
                .Where(pf => pf.FeatureDefinition.IsActive)
                .Select(pf => new PublicFeatureItem(
                    pf.FeatureDefinition.Key,
                    pf.FeatureDefinition.Name,
                    pf.IsEnabled,
                    pf.FeatureDefinition.FeatureGroup))
                .ToList()
        )).ToList();
    }
}
