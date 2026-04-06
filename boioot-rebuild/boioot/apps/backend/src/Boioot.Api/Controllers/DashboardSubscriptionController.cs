using Boioot.Application.Features.Subscriptions.DTOs;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// User-facing subscription endpoints — Phase 3A.
/// Read: current state, history, upgrade intent.
/// Write: change plan, cancel. No payment processing.
/// </summary>
[Authorize]
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
    /// Returns the caller's subscription change history.
    /// </summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory(CancellationToken ct)
    {
        var result = await _subscriptions.GetHistoryAsync(GetUserId(), ct);
        return Ok(result);
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

    /// <summary>
    /// Changes the caller's subscription to a different plan.
    /// Records a history event. No payment gateway involved.
    /// </summary>
    [HttpPost("change-plan")]
    public async Task<IActionResult> ChangePlan(
        [FromBody] ChangePlanRequest request,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _subscriptions.ChangePlanAsync(GetUserId(), request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Cancels the caller's current subscription.
    /// Records a history event. Status becomes Cancelled, IsActive = false.
    /// </summary>
    [HttpPost("cancel")]
    public async Task<IActionResult> Cancel(
        [FromBody] CancelSubscriptionRequest request,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _subscriptions.CancelAsync(GetUserId(), request, ct);
        return Ok(result);
    }
}
