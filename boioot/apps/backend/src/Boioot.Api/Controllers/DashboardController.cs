using Boioot.Application.Features.Dashboard.Interfaces;
using Boioot.Application.Features.Projects.Interfaces;
using Boioot.Application.Features.Properties.Interfaces;
using Boioot.Application.Features.Requests.DTOs;
using Boioot.Application.Features.Requests.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Authorize(Policy = "AdminOrCompanyOwnerOrAgent")]
[Route("api/dashboard")]
public class DashboardController : BaseController
{
    private readonly IDashboardService _dashboardService;
    private readonly IPropertyService _propertyService;
    private readonly IProjectService _projectService;
    private readonly IRequestService _requestService;

    public DashboardController(
        IDashboardService dashboardService,
        IPropertyService propertyService,
        IProjectService projectService,
        IRequestService requestService)
    {
        _dashboardService = dashboardService;
        _propertyService  = propertyService;
        _projectService   = projectService;
        _requestService   = requestService;
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

    [HttpGet("properties/{id:guid}")]
    public async Task<IActionResult> GetProperty(Guid id, CancellationToken ct)
    {
        var result = await _propertyService.GetByIdDashboardAsync(GetUserId(), GetUserRole(), id, ct);
        return Ok(result);
    }

    [HttpGet("projects")]
    public async Task<IActionResult> GetProjects(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var result = await _dashboardService.GetProjectsAsync(GetUserId(), GetUserRole(), page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("projects/{id:guid}")]
    public async Task<IActionResult> GetProject(Guid id, CancellationToken ct)
    {
        var result = await _projectService.GetByIdDashboardAsync(GetUserId(), GetUserRole(), id, ct);
        return Ok(result);
    }

    [HttpGet("requests")]
    public async Task<IActionResult> GetRequests(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var result = await _dashboardService.GetRequestsAsync(GetUserId(), GetUserRole(), page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("requests/{id:guid}")]
    public async Task<IActionResult> GetRequest(Guid id, CancellationToken ct)
    {
        var result = await _requestService.GetByIdAsync(GetUserId(), GetUserRole(), id, ct);
        return Ok(result);
    }

    [HttpPatch("requests/{id:guid}/status")]
    public async Task<IActionResult> UpdateRequestStatus(
        Guid id, [FromBody] UpdateRequestStatusRequest request, CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _requestService.UpdateStatusAsync(
            GetUserId(), GetUserRole(), id, request.Status!.Value, ct);
        return Ok(result);
    }

    [HttpGet("messages/summary")]
    public async Task<IActionResult> GetMessagesSummary(CancellationToken ct)
    {
        var result = await _dashboardService.GetMessagesSummaryAsync(GetUserId(), ct);
        return Ok(result);
    }
}
