using Boioot.Application.Features.Content.DTOs;

namespace Boioot.Application.Features.Content.Interfaces;

public interface ISiteContentService
{
    /// <summary>Returns key→valueAr dict for active items (public API).</summary>
    Task<Dictionary<string, string>> GetPublicDictionaryAsync(CancellationToken ct = default);

    Task<IReadOnlyList<SiteContentResponse>> GetAllAsync(string? group = null, CancellationToken ct = default);
    Task<SiteContentResponse> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<SiteContentResponse> CreateAsync(CreateSiteContentRequest request, CancellationToken ct = default);
    Task<SiteContentResponse> UpdateAsync(Guid id, UpdateSiteContentRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
