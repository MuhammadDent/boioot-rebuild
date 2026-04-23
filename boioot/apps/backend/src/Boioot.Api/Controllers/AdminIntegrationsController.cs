using Boioot.Infrastructure.Features.Integrations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/admin/integrations")]
[Authorize]
public class AdminIntegrationsController : BaseController
{
    private readonly IntegrationService _svc;
    private readonly ILogger<AdminIntegrationsController> _log;

    public AdminIntegrationsController(IntegrationService svc, ILogger<AdminIntegrationsController> log)
    {
        _svc = svc;
        _log = log;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await _svc.GetAllAsync(ct));

    [HttpGet("{key}")]
    public async Task<IActionResult> GetByKey(string key, CancellationToken ct)
    {
        try { return Ok(await _svc.GetByKeyAsync(key, ct)); }
        catch (IntegrationNotFoundException) { return NotFound(new { message = "التطبيق غير موجود" }); }
    }

    [HttpPost("{key}/settings")]
    public async Task<IActionResult> SaveSettings(
        string key,
        [FromBody] SaveIntegrationRequest request,
        CancellationToken ct)
    {
        try
        {
            var result = await _svc.SaveSettingsAsync(key, request, GetUserId(), ct);
            return Ok(result);
        }
        catch (IntegrationNotFoundException)
        {
            return NotFound(new { message = "التطبيق غير موجود" });
        }
        catch (IntegrationValidationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "[Integrations] SaveSettings failed for key={Key}", key);
            return StatusCode(500, new { message = "تعذّر حفظ الإعدادات، يرجى المحاولة مرة أخرى" });
        }
    }

    [HttpPost("{key}/enable")]
    public async Task<IActionResult> Enable(string key, CancellationToken ct)
    {
        try { return Ok(await _svc.SetEnabledAsync(key, true, GetUserId(), ct)); }
        catch (IntegrationNotFoundException) { return NotFound(new { message = "التطبيق غير موجود" }); }
    }

    [HttpPost("{key}/disable")]
    public async Task<IActionResult> Disable(string key, CancellationToken ct)
    {
        try { return Ok(await _svc.SetEnabledAsync(key, false, GetUserId(), ct)); }
        catch (IntegrationNotFoundException) { return NotFound(new { message = "التطبيق غير موجود" }); }
    }

    [HttpPost("{key}/disconnect")]
    public async Task<IActionResult> Disconnect(string key, CancellationToken ct)
    {
        try { return Ok(await _svc.DisconnectAsync(key, GetUserId(), ct)); }
        catch (IntegrationNotFoundException) { return NotFound(new { message = "التطبيق غير موجود" }); }
    }
}
