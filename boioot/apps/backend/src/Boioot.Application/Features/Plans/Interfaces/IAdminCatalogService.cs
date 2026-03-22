using Boioot.Application.Features.Plans.DTOs;

namespace Boioot.Application.Features.Plans.Interfaces;

public interface IAdminCatalogService
{
    // ── Feature Definitions ──────────────────────────────────────────────────
    Task<List<FeatureDefinitionResponse>> GetFeaturesAsync(CancellationToken ct = default);
    Task<FeatureDefinitionResponse> CreateFeatureAsync(CreateFeatureDefinitionRequest request, CancellationToken ct = default);
    Task<FeatureDefinitionResponse> UpdateFeatureAsync(Guid id, UpdateFeatureDefinitionRequest request, CancellationToken ct = default);
    Task DeleteFeatureAsync(Guid id, CancellationToken ct = default);

    // ── Limit Definitions ────────────────────────────────────────────────────
    Task<List<LimitDefinitionResponse>> GetLimitsAsync(CancellationToken ct = default);
    Task<LimitDefinitionResponse> CreateLimitAsync(CreateLimitDefinitionRequest request, CancellationToken ct = default);
    Task<LimitDefinitionResponse> UpdateLimitAsync(Guid id, UpdateLimitDefinitionRequest request, CancellationToken ct = default);
    Task DeleteLimitAsync(Guid id, CancellationToken ct = default);
}
