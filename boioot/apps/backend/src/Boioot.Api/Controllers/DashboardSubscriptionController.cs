using Boioot.Application.Features.Subscriptions.DTOs;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Dashboard subscription endpoints.
/// These are read-only / intent-only — no payment processing occurs here.
/// </summary>
[Authorize(Policy = "AdminOrCompanyOwnerOrAgent")]
[Route("api/dashboard/subscription")]
public class DashboardSubscriptionController : BaseController
{
    private readonly ISubscriptionService _subscriptions;

    public DashboardSubscriptionController(ISubscriptionService subscriptions)
    {
        _subscriptions = subscriptions;
    }

    /// <summary>
    /// Returns the caller's current active subscription (or Free plan defaults).
    /// Returns 204 when the user has no account yet.
    /// </summary>
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent(CancellationToken ct)
    {
        var result = await _subscriptions.GetCurrentAsync(GetUserId(), ct);
        return result is null ? NoContent() : Ok(result);
    }

    /// <summary>
    /// Evaluates a plan-change intent: upgrade, downgrade, or cycle change.
    /// Does NOT process payment or mutate subscription data.
    /// </summary>
    [HttpPost("upgrade-intent")]
    public async Task<IActionResult> GetUpgradeIntent(
        [FromBody] UpgradeIntentRequest request,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var result = await _subscriptions.GetUpgradeIntentAsync(GetUserId(), request, ct);
        return Ok(result);
    }
}
