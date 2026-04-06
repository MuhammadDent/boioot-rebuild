using Boioot.Application.Features.LeadUnlocks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Authorize]
[Route("api/leads")]
public class LeadUnlocksController : BaseController
{
    private readonly ILeadUnlockService _service;

    public LeadUnlocksController(ILeadUnlockService service)
    {
        _service = service;
    }

    /// <summary>
    /// Unlock contact details for a property listing.
    /// Consumes one monthly_lead_unlock credit from the caller's plan.
    /// If the caller already unlocked this property this month, returns cached info without consuming a credit.
    /// </summary>
    [HttpPost("unlock/{propertyId:guid}")]
    public async Task<IActionResult> Unlock(Guid propertyId, CancellationToken ct)
    {
        var result = await _service.UnlockAsync(GetUserId(), propertyId, ct);
        return Ok(result);
    }

    /// <summary>
    /// Returns the caller's monthly lead-unlock usage stats.
    /// </summary>
    [HttpGet("unlock/usage")]
    public async Task<IActionResult> GetUsage(CancellationToken ct)
    {
        var (used, limit) = await _service.GetMonthlyUsageAsync(GetUserId(), ct);
        return Ok(new { used, limit, isUnlimited = limit == -1 });
    }
}
