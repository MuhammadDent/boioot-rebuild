using Boioot.Application.Features.SiteSettings.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Public settings endpoint — no authentication required.
/// The frontend calls this on every page load to decide which nav links to show.
/// </summary>
[Route("api/settings")]
[AllowAnonymous]
public class SettingsController : BaseController
{
    private readonly ISiteSettingsService _settings;

    public SettingsController(ISiteSettingsService settings) => _settings = settings;

    /// <summary>
    /// GET /api/settings/public
    /// Returns feature toggle values for all four public sections.
    /// Safe to call without authentication.
    /// </summary>
    [HttpGet("public")]
    public async Task<IActionResult> GetPublic(CancellationToken ct)
    {
        var dto = await _settings.GetAsync(ct);
        return Ok(dto);
    }
}
