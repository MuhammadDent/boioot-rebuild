using Boioot.Application.Exceptions;
using Boioot.Application.Features.Plans.DTOs;
using Boioot.Application.Features.Plans.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Plans;

public class AdminCatalogService : IAdminCatalogService
{
    private readonly BoiootDbContext _db;

    public AdminCatalogService(BoiootDbContext db)
    {
        _db = db;
    }

    // ── Plan Matrix ──────────────────────────────────────────────────────────

    public async Task<PlanMatrixResponse> GetMatrixAsync(CancellationToken ct = default)
    {
        // 1) All active feature definitions (ordered for display)
        var featureDefs = await _db.FeatureDefinitions
            .Where(f => f.IsActive)
            .OrderBy(f => f.SortOrder)
            .ThenBy(f => f.FeatureGroup)
            .ThenBy(f => f.Key)
            .Select(f => new MatrixFeatureDef
            {
                Key          = f.Key,
                Name         = f.Name,
                FeatureGroup = f.FeatureGroup,
                Icon         = f.Icon,
                SortOrder    = f.SortOrder,
                IsSystem     = f.IsSystem,
            })
            .ToListAsync(ct);

        // 2) All active limit definitions
        var limitDefs = await _db.LimitDefinitions
            .Where(l => l.IsActive)
            .OrderBy(l => l.AppliesToScope)
            .ThenBy(l => l.Key)
            .Select(l => new MatrixLimitDef
            {
                Key            = l.Key,
                Name           = l.Name,
                Unit           = l.Unit,
                ValueType      = l.ValueType,
                AppliesToScope = l.AppliesToScope,
            })
            .ToListAsync(ct);

        // 3) All plans (admin sees all, including inactive)
        var plans = await _db.Plans
            .OrderBy(p => p.DisplayOrder)
            .ThenBy(p => p.Name)
            .ToListAsync(ct);

        // 4) All PlanFeatures in one query  →  key = (planId, featureKey)
        var allFeatureKeys = featureDefs.Select(f => f.Key).ToHashSet();
        var planFeatureRows = await _db.PlanFeatures
            .Join(_db.FeatureDefinitions,
                  pf => pf.FeatureDefinitionId,
                  fd => fd.Id,
                  (pf, fd) => new { pf.SubscriptionPlanId, fd.Key, pf.IsEnabled })
            .Where(x => allFeatureKeys.Contains(x.Key))
            .ToListAsync(ct);

        // group: planId → dict<featureKey, isEnabled>
        var featureByPlan = planFeatureRows
            .GroupBy(x => x.SubscriptionPlanId)
            .ToDictionary(
                g => g.Key,
                g => g.ToDictionary(r => r.Key, r => r.IsEnabled));

        // 5) All PlanLimits in one query — materialize decimal values then cast in memory
        var allLimitKeys = limitDefs.Select(l => l.Key).ToHashSet();
        var planLimitRaw = await _db.PlanLimits
            .Join(_db.LimitDefinitions,
                  pl => pl.LimitDefinitionId,
                  ld => ld.Id,
                  (pl, ld) => new { pl.SubscriptionPlanId, ld.Key, pl.Value })
            .Where(x => allLimitKeys.Contains(x.Key))
            .ToListAsync(ct);

        // group: planId → dict<limitKey, value>  (cast decimal → int in memory)
        var limitByPlan = planLimitRaw
            .GroupBy(x => x.SubscriptionPlanId)
            .ToDictionary(
                g => g.Key,
                g => g.ToDictionary(r => r.Key, r => (int)r.Value));

        // 6) Assemble the response
        var planCols = plans.Select(p =>
        {
            featureByPlan.TryGetValue(p.Id, out var fv);
            limitByPlan.TryGetValue(p.Id, out var lv);

            var col = new MatrixPlanCol
            {
                PlanId        = p.Id,
                PlanName      = p.Name,
                DisplayNameAr = p.DisplayNameAr,
                AudienceType  = p.AudienceType,
                Tier          = p.Tier,
                Code          = p.Code,
                IsActive      = p.IsActive,
                IsRecommended = p.IsRecommended,
                DisplayOrder  = p.DisplayOrder,
                PlanCategory  = p.PlanCategory,
                PriceMonthly  = p.BasePriceMonthly,
            };

            foreach (var fd in featureDefs)
                col.FeatureValues[fd.Key] = fv != null && fv.TryGetValue(fd.Key, out var enabled) && enabled;

            foreach (var ld in limitDefs)
                col.LimitValues[ld.Key] = lv != null && lv.TryGetValue(ld.Key, out var val) ? val : 0;

            return col;
        }).ToList();

        return new PlanMatrixResponse
        {
            FeatureDefs = featureDefs,
            LimitDefs   = limitDefs,
            Plans        = planCols,
        };
    }

    // ── Feature Definitions ──────────────────────────────────────────────────

    public async Task<List<FeatureDefinitionResponse>> GetFeaturesAsync(CancellationToken ct = default)
    {
        // Count PlanFeature references per FeatureDefinition in a single query.
        var counts = await _db.PlanFeatures
            .GroupBy(pf => pf.FeatureDefinitionId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count, ct);

        return await _db.FeatureDefinitions
            .OrderBy(f => f.SortOrder)
            .ThenBy(f => f.FeatureGroup)
            .ThenBy(f => f.Key)
            .Select(f => new FeatureDefinitionResponse
            {
                Id               = f.Id,
                Key              = f.Key,
                Name             = f.Name,
                Description      = f.Description,
                FeatureGroup     = f.FeatureGroup,
                Icon             = f.Icon,
                IsActive         = f.IsActive,
                Type             = f.Type,
                Scope            = f.Scope,
                IsSystem         = f.IsSystem,
                SortOrder        = f.SortOrder,
                PlanFeatureCount = 0  // filled below after materialisation
            })
            .ToListAsync(ct)
            .ContinueWith(t =>
            {
                var list = t.Result;
                foreach (var r in list)
                {
                    if (counts.TryGetValue(r.Id, out var c)) r.PlanFeatureCount = c;
                }
                return list;
            }, ct, System.Threading.Tasks.TaskContinuationOptions.OnlyOnRanToCompletion,
               System.Threading.Tasks.TaskScheduler.Default);
    }

    public async Task<FeatureDefinitionResponse> CreateFeatureAsync(
        CreateFeatureDefinitionRequest request, CancellationToken ct = default)
    {
        if (await _db.FeatureDefinitions.AnyAsync(f => f.Key == request.Key, ct))
            throw new BoiootException($"المفتاح '{request.Key}' موجود مسبقاً", 409);

        var validTypes  = new[] { "boolean", "limit", "text", "json" };
        var validScopes = new[] { "listing", "user", "system", "messaging", "analytics" };

        var type  = request.Type.Trim().ToLowerInvariant();
        var scope = request.Scope.Trim().ToLowerInvariant();

        if (!validTypes.Contains(type))
            throw new BoiootException($"النوع '{type}' غير صالح. القيم المسموح بها: boolean, limit, text, json", 400);
        if (!validScopes.Contains(scope))
            throw new BoiootException($"النطاق '{scope}' غير صالح. القيم المسموح بها: listing, user, system, messaging, analytics", 400);

        var entity = new FeatureDefinition
        {
            Key          = request.Key.Trim().ToLowerInvariant(),
            Name         = request.Name.Trim(),
            Description  = request.Description?.Trim(),
            FeatureGroup = request.FeatureGroup?.Trim().ToLowerInvariant(),
            Icon         = request.Icon?.Trim(),
            IsActive     = true,
            Type         = type,
            Scope        = scope,
            IsSystem     = false,
            SortOrder    = request.SortOrder
        };

        _db.FeatureDefinitions.Add(entity);
        await _db.SaveChangesAsync(ct);
        return MapFeature(entity, 0);
    }

    public async Task<FeatureDefinitionResponse> UpdateFeatureAsync(
        Guid id, UpdateFeatureDefinitionRequest request, CancellationToken ct = default)
    {
        var entity = await _db.FeatureDefinitions.FindAsync([id], ct)
            ?? throw new BoiootException("تعريف الميزة غير موجود", 404);

        entity.Name         = request.Name.Trim();
        entity.Description  = request.Description?.Trim();
        entity.FeatureGroup = request.FeatureGroup?.Trim().ToLowerInvariant();
        entity.Icon         = request.Icon?.Trim();
        entity.IsActive     = request.IsActive;
        entity.SortOrder    = request.SortOrder;
        entity.UpdatedAt    = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        int count = await _db.PlanFeatures.CountAsync(pf => pf.FeatureDefinitionId == id, ct);
        return MapFeature(entity, count);
    }

    public async Task DeleteFeatureAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.FeatureDefinitions.FindAsync([id], ct)
            ?? throw new BoiootException("تعريف الميزة غير موجود", 404);

        if (entity.IsSystem)
            throw new BoiootException("لا يمكن حذف ميزة نظامية مدمجة؛ قم بتعطيلها بدلاً من ذلك", 409);

        bool inUse = await _db.PlanFeatures
            .AnyAsync(pf => pf.FeatureDefinitionId == id, ct);
        if (inUse)
            throw new BoiootException("لا يمكن حذف تعريف مرتبط بخطط موجودة؛ قم بتعطيله بدلاً من ذلك", 409);

        _db.FeatureDefinitions.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    // ── Limit Definitions ────────────────────────────────────────────────────

    public async Task<List<LimitDefinitionResponse>> GetLimitsAsync(CancellationToken ct = default)
    {
        return await _db.LimitDefinitions
            .OrderBy(l => l.AppliesToScope)
            .ThenBy(l => l.Key)
            .Select(l => MapLimit(l))
            .ToListAsync(ct);
    }

    public async Task<LimitDefinitionResponse> CreateLimitAsync(
        CreateLimitDefinitionRequest request, CancellationToken ct = default)
    {
        if (await _db.LimitDefinitions.AnyAsync(l => l.Key == request.Key, ct))
            throw new BoiootException($"المفتاح '{request.Key}' موجود مسبقاً", 409);

        var entity = new LimitDefinition
        {
            Key            = request.Key.Trim().ToLowerInvariant(),
            Name           = request.Name.Trim(),
            Description    = request.Description?.Trim(),
            Unit           = request.Unit?.Trim(),
            ValueType      = string.IsNullOrWhiteSpace(request.ValueType) ? "integer" : request.ValueType,
            AppliesToScope = request.AppliesToScope?.Trim().ToLowerInvariant(),
            IsActive       = true
        };

        _db.LimitDefinitions.Add(entity);
        await _db.SaveChangesAsync(ct);
        return MapLimit(entity);
    }

    public async Task<LimitDefinitionResponse> UpdateLimitAsync(
        Guid id, UpdateLimitDefinitionRequest request, CancellationToken ct = default)
    {
        var entity = await _db.LimitDefinitions.FindAsync([id], ct)
            ?? throw new BoiootException("تعريف الحد غير موجود", 404);

        entity.Name           = request.Name.Trim();
        entity.Description    = request.Description?.Trim();
        entity.Unit           = request.Unit?.Trim();
        entity.ValueType      = string.IsNullOrWhiteSpace(request.ValueType) ? "integer" : request.ValueType;
        entity.AppliesToScope = request.AppliesToScope?.Trim().ToLowerInvariant();
        entity.IsActive       = request.IsActive;
        entity.UpdatedAt      = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return MapLimit(entity);
    }

    public async Task DeleteLimitAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.LimitDefinitions.FindAsync([id], ct)
            ?? throw new BoiootException("تعريف الحد غير موجود", 404);

        bool inUse = await _db.PlanLimits
            .AnyAsync(pl => pl.LimitDefinitionId == id, ct);
        if (inUse)
            throw new BoiootException("لا يمكن حذف تعريف مرتبط بخطط موجودة؛ قم بتعطيله بدلاً من ذلك", 409);

        _db.LimitDefinitions.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    // ── Private mappers ──────────────────────────────────────────────────────

    private static FeatureDefinitionResponse MapFeature(FeatureDefinition f, int planFeatureCount) => new()
    {
        Id               = f.Id,
        Key              = f.Key,
        Name             = f.Name,
        Description      = f.Description,
        FeatureGroup     = f.FeatureGroup,
        Icon             = f.Icon,
        IsActive         = f.IsActive,
        Type             = f.Type,
        Scope            = f.Scope,
        IsSystem         = f.IsSystem,
        SortOrder        = f.SortOrder,
        PlanFeatureCount = planFeatureCount
    };

    private static LimitDefinitionResponse MapLimit(LimitDefinition l) => new()
    {
        Id             = l.Id,
        Key            = l.Key,
        Name           = l.Name,
        Description    = l.Description,
        Unit           = l.Unit,
        ValueType      = l.ValueType,
        AppliesToScope = l.AppliesToScope,
        IsActive       = l.IsActive
    };
}
