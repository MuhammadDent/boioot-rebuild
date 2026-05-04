using Boioot.Api.Authorization;
using Boioot.Application.Features.SiteSettings.DTOs;
using Boioot.Application.Features.SiteSettings.Interfaces;
using Boioot.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Admin-only endpoints for reading and updating site feature toggles.
/// GET  /api/admin/settings  — requires settings.view
/// PUT  /api/admin/settings  — requires settings.manage
/// </summary>
[Route("api/admin/settings")]
[Authorize]
[RequirePermission(Permissions.SettingsView)]
public class AdminSiteSettingsController : BaseController
{
    private readonly ISiteSettingsService _settings;

    public AdminSiteSettingsController(ISiteSettingsService settings) => _settings = settings;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var dto = await _settings.GetAsync(ct);
        return Ok(dto);
    }

    [HttpPut]
    [RequirePermission(Permissions.SettingsManage)]
    public async Task<IActionResult> Update(
        [FromBody] SiteSettingsDto dto,
        CancellationToken ct)
    {
        await _settings.UpdateAsync(dto, ct);
        var updated = await _settings.GetAsync(ct);
        return Ok(updated);
    }
}
