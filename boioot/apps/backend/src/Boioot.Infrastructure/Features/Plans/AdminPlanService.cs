using Boioot.Application.Exceptions;
using Boioot.Application.Features.Plans.DTOs;
using Boioot.Application.Features.Plans.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Plans;

public class AdminPlanService : IAdminPlanService
{
    private readonly BoiootDbContext _db;
    private readonly ILogger<AdminPlanService> _logger;

    public AdminPlanService(BoiootDbContext db, ILogger<AdminPlanService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── GetAllPlansAsync ──────────────────────────────────────────────────────
    public async Task<List<PlanSummaryResponse>> GetAllPlansAsync(CancellationToken ct = default)
    {
        return await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .OrderBy(p => p.CreatedAt)
            .Select(p => MapToSummary(p))
            .ToListAsync(ct);
    }

    // ── GetPlanDetailAsync ────────────────────────────────────────────────────
    public async Task<PlanDetailResponse> GetPlanDetailAsync(Guid planId, CancellationToken ct = default)
    {
        var plan = await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .Include(p => p.PlanLimits)
                .ThenInclude(pl => pl.LimitDefinition)
            .Include(p => p.PlanFeatures)
                .ThenInclude(pf => pf.FeatureDefinition)
            .FirstOrDefaultAsync(p => p.Id == planId, ct)
            ?? throw new BoiootException("الخطة غير موجودة", 404);

        // Auto-ensure rows exist for every active definition (idempotent)
        bool dirty = false;

        var allLimitDefs = await _db.Set<LimitDefinition>()
            .Where(ld => ld.IsActive).ToListAsync(ct);
        var existingLimitIds = plan.PlanLimits
            .Select(pl => pl.LimitDefinitionId).ToHashSet();
        foreach (var ld in allLimitDefs.Where(ld => !existingLimitIds.Contains(ld.Id)))
        {
            _db.Set<PlanLimit>().Add(new PlanLimit
            {
                SubscriptionPlanId = plan.Id,
                LimitDefinitionId  = ld.Id,
                Value              = 0
            });
            dirty = true;
        }

        var allFeatureDefs = await _db.Set<FeatureDefinition>()
            .Where(fd => fd.IsActive).ToListAsync(ct);
        var existingFeatureIds = plan.PlanFeatures
            .Select(pf => pf.FeatureDefinitionId).ToHashSet();
        foreach (var fd in allFeatureDefs.Where(fd => !existingFeatureIds.Contains(fd.Id)))
        {
            _db.Set<PlanFeature>().Add(new PlanFeature
            {
                SubscriptionPlanId  = plan.Id,
                FeatureDefinitionId = fd.Id,
                IsEnabled           = false
            });
            dirty = true;
        }

        if (dirty)
        {
            await _db.SaveChangesAsync(ct);
            plan = await _db.Set<Plan>()
                .IgnoreQueryFilters()
                .Include(p => p.PlanLimits)
                    .ThenInclude(pl => pl.LimitDefinition)
                .Include(p => p.PlanFeatures)
                    .ThenInclude(pf => pf.FeatureDefinition)
                .FirstOrDefaultAsync(p => p.Id == planId, ct)!;
        }

        return MapToDetail(plan!);
    }

    // ── CreatePlanAsync ───────────────────────────────────────────────────────
    public async Task<PlanDetailResponse> CreatePlanAsync(CreatePlanRequest request, CancellationToken ct = default)
    {
        AccountType? accountType = null;
        if (!string.IsNullOrWhiteSpace(request.ApplicableAccountType) &&
            Enum.TryParse<AccountType>(request.ApplicableAccountType, out var at))
            accountType = at;

        var plan = new Plan
        {
            Name                 = request.Name.Trim(),
            Description          = request.Description?.Trim(),
            BasePriceMonthly     = request.BasePriceMonthly,
            BasePriceYearly      = request.BasePriceYearly,
            ApplicableAccountType = accountType,
            DisplayOrder         = request.DisplayOrder,
            BadgeText            = string.IsNullOrWhiteSpace(request.BadgeText) ? null : request.BadgeText.Trim(),
            PlanColor            = string.IsNullOrWhiteSpace(request.PlanColor)  ? null : request.PlanColor.Trim(),
            IsActive             = true
        };

        _db.Set<Plan>().Add(plan);
        await _db.SaveChangesAsync(ct);

        // Auto-create PlanLimit rows for all active LimitDefinitions (default 0)
        var limitDefs = await _db.Set<LimitDefinition>()
            .Where(ld => ld.IsActive)
            .ToListAsync(ct);

        foreach (var ld in limitDefs)
        {
            _db.Set<PlanLimit>().Add(new PlanLimit
            {
                SubscriptionPlanId = plan.Id,
                LimitDefinitionId  = ld.Id,
                Value              = 0
            });
        }

        // Auto-create PlanFeature rows for all active FeatureDefinitions (default disabled)
        var featureDefs = await _db.Set<FeatureDefinition>()
            .Where(fd => fd.IsActive)
            .ToListAsync(ct);

        foreach (var fd in featureDefs)
        {
            _db.Set<PlanFeature>().Add(new PlanFeature
            {
                SubscriptionPlanId  = plan.Id,
                FeatureDefinitionId = fd.Id,
                IsEnabled           = false
            });
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Plan created: {PlanId} — {Name}", plan.Id, plan.Name);

        return await GetPlanDetailAsync(plan.Id, ct);
    }

    // ── UpdatePlanAsync ───────────────────────────────────────────────────────
    public async Task<PlanDetailResponse> UpdatePlanAsync(
        Guid planId, UpdatePlanRequest request, CancellationToken ct = default)
    {
        var plan = await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == planId, ct)
            ?? throw new BoiootException("الخطة غير موجودة", 404);

        AccountType? accountType = null;
        if (!string.IsNullOrWhiteSpace(request.ApplicableAccountType) &&
            Enum.TryParse<AccountType>(request.ApplicableAccountType, out var at))
            accountType = at;

        plan.Name                 = request.Name.Trim();
        plan.Description          = request.Description?.Trim();
        plan.BasePriceMonthly     = request.BasePriceMonthly;
        plan.BasePriceYearly      = request.BasePriceYearly;
        plan.IsActive             = request.IsActive;
        plan.ApplicableAccountType = accountType;
        plan.DisplayOrder         = request.DisplayOrder;
        plan.IsPublic             = request.IsPublic;
        plan.IsRecommended        = request.IsRecommended;
        plan.PlanCategory         = request.PlanCategory?.Trim();
        plan.BillingMode          = request.BillingMode;
        plan.BadgeText            = string.IsNullOrWhiteSpace(request.BadgeText) ? null : request.BadgeText.Trim();
        plan.PlanColor            = string.IsNullOrWhiteSpace(request.PlanColor)  ? null : request.PlanColor.Trim();

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Plan updated: {PlanId} — {Name}", plan.Id, plan.Name);

        return await GetPlanDetailAsync(plan.Id, ct);
    }

    // ── DeletePlanAsync ───────────────────────────────────────────────────────
    public async Task DeletePlanAsync(Guid planId, CancellationToken ct = default)
    {
        var plan = await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == planId, ct)
            ?? throw new BoiootException("الخطة غير موجودة", 404);

        var hasActiveSubscriptions = await _db.Subscriptions
            .AnyAsync(s => s.PlanId == planId && s.IsActive, ct);

        if (hasActiveSubscriptions)
            throw new BoiootException(
                "لا يمكن حذف الخطة — يوجد حسابات مشتركة بها حالياً", 409);

        plan.IsActive = false;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Plan soft-deleted: {PlanId}", planId);
    }

    // ── SetLimitAsync ─────────────────────────────────────────────────────────
    public async Task<PlanLimitItem> SetLimitAsync(
        Guid planId, string limitKey, decimal value, CancellationToken ct = default)
    {
        var planExists = await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .AnyAsync(p => p.Id == planId, ct);
        if (!planExists)
            throw new BoiootException("الخطة غير موجودة", 404);

        var limitDef = await _db.Set<LimitDefinition>()
            .FirstOrDefaultAsync(ld => ld.Key == limitKey && ld.IsActive, ct)
            ?? throw new BoiootException($"تعريف الحد '{limitKey}' غير موجود", 404);

        var row = await _db.Set<PlanLimit>()
            .FirstOrDefaultAsync(pl => pl.SubscriptionPlanId == planId
                                    && pl.LimitDefinitionId  == limitDef.Id, ct);
        if (row is null)
        {
            row = new PlanLimit
            {
                SubscriptionPlanId = planId,
                LimitDefinitionId  = limitDef.Id,
                Value              = value
            };
            _db.Set<PlanLimit>().Add(row);
        }
        else
        {
            row.Value = value;
        }

        await _db.SaveChangesAsync(ct);

        return new PlanLimitItem
        {
            LimitDefinitionId = limitDef.Id,
            Key               = limitDef.Key,
            Name              = limitDef.Name,
            Unit              = limitDef.Unit,
            Value             = row.Value
        };
    }

    // ── SetFeatureAsync ───────────────────────────────────────────────────────
    public async Task<PlanFeatureItem> SetFeatureAsync(
        Guid planId, string featureKey, bool isEnabled, CancellationToken ct = default)
    {
        var planExists = await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .AnyAsync(p => p.Id == planId, ct);
        if (!planExists)
            throw new BoiootException("الخطة غير موجودة", 404);

        var featureDef = await _db.Set<FeatureDefinition>()
            .FirstOrDefaultAsync(fd => fd.Key == featureKey && fd.IsActive, ct)
            ?? throw new BoiootException($"تعريف الميزة '{featureKey}' غير موجود", 404);

        var row = await _db.Set<PlanFeature>()
            .FirstOrDefaultAsync(pf => pf.SubscriptionPlanId  == planId
                                    && pf.FeatureDefinitionId == featureDef.Id, ct);
        if (row is null)
        {
            row = new PlanFeature
            {
                SubscriptionPlanId  = planId,
                FeatureDefinitionId = featureDef.Id,
                IsEnabled           = isEnabled
            };
            _db.Set<PlanFeature>().Add(row);
        }
        else
        {
            row.IsEnabled = isEnabled;
        }

        await _db.SaveChangesAsync(ct);

        return new PlanFeatureItem
        {
            FeatureDefinitionId = featureDef.Id,
            Key                 = featureDef.Key,
            Name                = featureDef.Name,
            FeatureGroup        = featureDef.FeatureGroup,
            IsEnabled           = row.IsEnabled
        };
    }

    // ── Mapping helpers ───────────────────────────────────────────────────────
    private static PlanSummaryResponse MapToSummary(Plan p) => new()
    {
        Id                   = p.Id,
        Name                 = p.Name,
        Code                 = p.Code,
        Description          = p.Description,
        IsActive             = p.IsActive,
        BasePriceMonthly     = p.BasePriceMonthly,
        BasePriceYearly      = p.BasePriceYearly,
        ApplicableAccountType = p.ApplicableAccountType?.ToString(),
        CreatedAt            = p.CreatedAt,
        DisplayOrder         = p.DisplayOrder,
        IsPublic             = p.IsPublic,
        IsRecommended        = p.IsRecommended,
        PlanCategory         = p.PlanCategory,
        BillingMode          = p.BillingMode,
        Rank                 = p.Rank,
        BadgeText            = p.BadgeText,
        PlanColor            = p.PlanColor,
    };

    private static PlanDetailResponse MapToDetail(Plan p) => new()
    {
        Id                   = p.Id,
        Name                 = p.Name,
        Code                 = p.Code,
        Description          = p.Description,
        IsActive             = p.IsActive,
        BasePriceMonthly     = p.BasePriceMonthly,
        BasePriceYearly      = p.BasePriceYearly,
        ApplicableAccountType = p.ApplicableAccountType?.ToString(),
        CreatedAt            = p.CreatedAt,
        DisplayOrder         = p.DisplayOrder,
        IsPublic             = p.IsPublic,
        IsRecommended        = p.IsRecommended,
        PlanCategory         = p.PlanCategory,
        BillingMode          = p.BillingMode,
        Rank                 = p.Rank,
        BadgeText            = p.BadgeText,
        PlanColor            = p.PlanColor,
        Limits = p.PlanLimits
            .OrderBy(pl => pl.LimitDefinition.Key)
            .Select(pl => new PlanLimitItem
            {
                LimitDefinitionId = pl.LimitDefinitionId,
                Key               = pl.LimitDefinition.Key,
                Name              = pl.LimitDefinition.Name,
                Unit              = pl.LimitDefinition.Unit,
                Value             = pl.Value
            }).ToList(),
        Features = p.PlanFeatures
            .OrderBy(pf => pf.FeatureDefinition.FeatureGroup)
            .ThenBy(pf => pf.FeatureDefinition.Key)
            .Select(pf => new PlanFeatureItem
            {
                FeatureDefinitionId = pf.FeatureDefinitionId,
                Key                 = pf.FeatureDefinition.Key,
                Name                = pf.FeatureDefinition.Name,
                FeatureGroup        = pf.FeatureDefinition.FeatureGroup,
                IsEnabled           = pf.IsEnabled
            }).ToList()
    };
}
