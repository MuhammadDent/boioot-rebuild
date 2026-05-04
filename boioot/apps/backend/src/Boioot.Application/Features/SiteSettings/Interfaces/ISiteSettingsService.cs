using Boioot.Application.Features.SiteSettings.DTOs;

namespace Boioot.Application.Features.SiteSettings.Interfaces;

public interface ISiteSettingsService
{
    /// <summary>Returns the current site settings. Seeds defaults if any key is missing.</summary>
    Task<SiteSettingsDto> GetAsync(CancellationToken ct = default);

    /// <summary>Persists updated site settings (upserts each key).</summary>
    Task UpdateAsync(SiteSettingsDto dto, CancellationToken ct = default);
}
