using Boioot.Infrastructure.Features.Integrations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/admin/integrations")]
[Authorize]
public class AdminIntegrationsController : BaseController
{
    private readonly IntegrationService _svc;

    public AdminIntegrationsController(IntegrationService svc) => _svc = svc;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await _svc.GetAllAsync(ct));

    [HttpGet("{key}")]
    public async Task<IActionResult> GetByKey(string key, CancellationToken ct)
        => Ok(await _svc.GetByKeyAsync(key, ct));

    [HttpPost("{key}/settings")]
    public async Task<IActionResult> SaveSettings(
        string key,
        [FromBody] SaveIntegrationRequest request,
        CancellationToken ct)
    {
        var result = await _svc.SaveSettingsAsync(key, request, GetUserId(), ct);
        return Ok(result);
    }

    [HttpPost("{key}/enable")]
    public async Task<IActionResult> Enable(string key, CancellationToken ct)
        => Ok(await _svc.SetEnabledAsync(key, true, GetUserId(), ct));

    [HttpPost("{key}/disable")]
    public async Task<IActionResult> Disable(string key, CancellationToken ct)
        => Ok(await _svc.SetEnabledAsync(key, false, GetUserId(), ct));

    [HttpPost("{key}/disconnect")]
    public async Task<IActionResult> Disconnect(string key, CancellationToken ct)
        => Ok(await _svc.DisconnectAsync(key, GetUserId(), ct));
}
