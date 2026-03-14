using Boioot.Application.Features.Dashboard.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Authorize(Policy = "AdminOrCompanyOwnerOrAgent")]
[Route("api/dashboard")]
public class DashboardController : BaseController
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(CancellationToken ct)
    {
        var result = await _dashboardService.GetSummaryAsync(GetUserId(), GetUserRole(), ct);
        return Ok(result);
    }

    [HttpGet("properties")]
    public async Task<IActionResult> GetProperties(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var result = await _dashboardService.GetPropertiesAsync(GetUserId(), GetUserRole(), page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("projects")]
    public async Task<IActionResult> GetProjects(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var result = await _dashboardService.GetProjectsAsync(GetUserId(), GetUserRole(), page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var result = await _dashboardService.GetRequestsAsync(GetUserId(), GetUserRole(), page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("messages/summary")]
    public async Task<IActionResult> GetMessagesSummary(CancellationToken ct)
    {
        var result = await _dashboardService.GetMessagesSummaryAsync(GetUserId(), ct);
        return Ok(result);
    }
}
