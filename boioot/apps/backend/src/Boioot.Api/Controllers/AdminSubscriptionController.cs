using Boioot.Application.Features.Subscriptions.DTOs;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Admin subscription management endpoints — Phase 3A.
/// Assign plans, list all subscriptions, change plan, cancel, view history.
/// </summary>
[Authorize(Policy = "AdminOnly")]
[Route("api/admin/subscriptions")]
public class AdminSubscriptionController : BaseController
{
    private readonly ISubscriptionService _subscriptions;

    public AdminSubscriptionController(ISubscriptionService subscriptions)
    {
        _subscriptions = subscriptions;
    }

    /// <summary>
    /// Lists all subscriptions with optional status filter and pagination.
    /// Query params: ?status=Active|Trial|Pending|Cancelled|Expired&amp;page=1&amp;pageSize=20
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize is < 1 or > 100) pageSize = 20;

        var result = await _subscriptions.GetAllSubscriptionsAsync(page, pageSize, status, ct);
        return Ok(result);
    }

    /// <summary>
    /// Manually assign a plan to an account.
    /// Deactivates any existing active subscription and creates a new one.
    /// </summary>
    [HttpPost("assign")]
    public async Task<IActionResult> Assign(
        [FromBody] AssignPlanRequest request,
        CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _subscriptions.AssignPlanAsync(GetUserId(), request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Returns subscription history for a given account.
    /// </summary>
    [HttpGet("history/{accountId:guid}")]
    public async Task<IActionResult> GetHistory(Guid accountId, CancellationToken ct)
    {
        var result = await _subscriptions.GetHistoryByAccountAsync(accountId, ct);
        return Ok(result);
    }
}
