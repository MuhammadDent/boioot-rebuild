using Boioot.Application.Features.Plans.DTOs;

namespace Boioot.Application.Features.Plans.Interfaces;

public interface IAdminPlanService
{
    Task<List<PlanSummaryResponse>> GetAllPlansAsync(CancellationToken ct = default);

    Task<PlanDetailResponse> GetPlanDetailAsync(Guid planId, CancellationToken ct = default);

    Task<PlanDetailResponse> CreatePlanAsync(CreatePlanRequest request, CancellationToken ct = default);

    Task<PlanDetailResponse> UpdatePlanAsync(Guid planId, UpdatePlanRequest request, CancellationToken ct = default);

    /// <summary>Soft-deletes the plan by setting IsActive = false.</summary>
    Task DeletePlanAsync(Guid planId, CancellationToken ct = default);

    /// <summary>Creates a full copy of the plan (limits + features). New plan starts as inactive/private.</summary>
    Task<PlanDetailResponse> DuplicatePlanAsync(Guid sourcePlanId, CancellationToken ct = default);

    /// <summary>Set or update the value for a named limit on a plan. Creates the row if missing. Value must be integer (-1 = unlimited).</summary>
    Task<PlanLimitItem> SetLimitAsync(Guid planId, string limitKey, int value, CancellationToken ct = default);

    /// <summary>Enable or disable a named feature on a plan. Creates the row if missing.</summary>
    Task<PlanFeatureItem> SetFeatureAsync(Guid planId, string featureKey, bool isEnabled, CancellationToken ct = default);
}
