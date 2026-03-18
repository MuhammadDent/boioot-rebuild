using Boioot.Application.Features.Pricing.DTOs;

namespace Boioot.Application.Features.Pricing.Interfaces;

/// <summary>
/// Admin operations for managing plan pricing entries.
/// Isolated from plan limits, plan features, and subscription enforcement.
/// </summary>
public interface IAdminPlanPricingService
{
    /// <summary>List all pricing entries for the given plan.</summary>
    Task<List<PlanPricingResponse>> GetByPlanAsync(Guid planId, CancellationToken ct = default);

    /// <summary>Add a new pricing entry (e.g., monthly or yearly) to a plan.</summary>
    Task<PlanPricingResponse> CreateAsync(Guid planId, UpsertPlanPricingRequest request, CancellationToken ct = default);

    /// <summary>Update an existing pricing entry's fields.</summary>
    Task<PlanPricingResponse> UpdateAsync(Guid planId, Guid pricingId, UpsertPlanPricingRequest request, CancellationToken ct = default);

    /// <summary>Toggle whether a pricing entry is active (subscribable).</summary>
    Task<PlanPricingResponse> SetActiveAsync(Guid planId, Guid pricingId, bool isActive, CancellationToken ct = default);

    /// <summary>Permanently delete a pricing entry.</summary>
    Task DeleteAsync(Guid planId, Guid pricingId, CancellationToken ct = default);
}
