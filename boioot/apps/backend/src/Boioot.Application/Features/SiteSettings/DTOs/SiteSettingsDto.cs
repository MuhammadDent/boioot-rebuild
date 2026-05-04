namespace Boioot.Application.Features.SiteSettings.DTOs;

/// <summary>
/// Shared shape for both the public GET and the admin GET/PUT endpoints.
/// All sections default to true so nothing disappears if settings are missing.
/// </summary>
public record SiteSettingsDto(
    bool SectionProjectsEnabled,
    bool SectionRequestsEnabled,
    bool SectionDailyRentEnabled,
    bool SectionBlogEnabled);
