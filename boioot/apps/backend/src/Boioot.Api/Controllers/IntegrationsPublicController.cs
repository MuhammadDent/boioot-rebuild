using Boioot.Infrastructure.Features.Integrations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Public endpoint consumed by the frontend to inject tracking scripts.
/// Returns only fully-configured and enabled integrations.
/// </summary>
[Route("api/integrations")]
[AllowAnonymous]
public class IntegrationsPublicController : BaseController
{
    private readonly IntegrationService _svc;

    public IntegrationsPublicController(IntegrationService svc) => _svc = svc;

    [HttpGet("active")]
    public async Task<IActionResult> GetActive(CancellationToken ct)
        => Ok(await _svc.GetActiveConfigsAsync(ct));
}
