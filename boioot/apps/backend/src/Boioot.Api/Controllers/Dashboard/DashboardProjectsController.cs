using Boioot.Application.Features.Projects.DTOs;
using Boioot.Application.Features.Projects.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers.Dashboard;

[Authorize(Policy = "AdminOrCompanyOwner")]
[Route("api/dashboard/projects")]
public class DashboardProjectsController : BaseController
{
    private readonly IProjectService _projectService;

    public DashboardProjectsController(IProjectService projectService)
    {
        _projectService = projectService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] ProjectFilters filters, CancellationToken ct)
    {
        var result = await _projectService.GetDashboardListAsync(
            GetUserId(), GetUserRole(), filters, ct);
        return Ok(result);
    }
}
