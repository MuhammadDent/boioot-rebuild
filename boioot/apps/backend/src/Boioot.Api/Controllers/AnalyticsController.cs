using Boioot.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsController
//
// GET /api/analytics/summary
//   Returns aggregated GA4 event counts for the last N days.
//   Requires authentication — any authenticated user can call this.
//   (Plan-level gating is enforced by the sidebar feature flag.)
//
// HOW TO EXTEND:
//   Add ?days=90 to change the reporting window (default: 30).
// ─────────────────────────────────────────────────────────────────────────────

[Authorize]
[Route("api/analytics")]
public class AnalyticsController : BaseController
{
    private readonly IGa4Service _ga4;

    public AnalyticsController(IGa4Service ga4)
    {
        _ga4 = ga4;
    }

    /// <summary>
    /// Returns event-level analytics summary from GA4.
    /// Returns all zeros when GA4 is not configured — never throws.
    /// </summary>
    /// <param name="days">Reporting window in days (1–365). Default: 30.</param>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(
        [FromQuery] int days = 30,
        CancellationToken ct = default)
    {
        days = Math.Clamp(days, 1, 365);
        var summary = await _ga4.GetSummaryAsync(days, ct);
        return Ok(summary);
    }
}
