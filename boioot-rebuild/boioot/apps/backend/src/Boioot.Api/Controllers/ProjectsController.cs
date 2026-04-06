using Boioot.Application.Features.Projects.DTOs;
using Boioot.Application.Features.Projects.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/projects")]
public class ProjectsController : BaseController
{
    private readonly IProjectService _projectService;

    public ProjectsController(IProjectService projectService)
    {
        _projectService = projectService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] ProjectFilters filters, CancellationToken ct)
    {
        var result = await _projectService.GetPublicListAsync(filters, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _projectService.GetByIdPublicAsync(id, ct);
        return Ok(result);
    }

    // Write operations — restricted to Admin OR CompanyOwner with account_type=Company.
    // Office accounts share the CompanyOwner role but must NOT manage projects.

    [Authorize(Policy = "CompanyProjectsOnly")]
    [HttpPost]
    [RequestSizeLimit(104_857_600)]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest request, CancellationToken ct)
    {
        var result = await _projectService.CreateAsync(GetUserId(), GetUserRole(), request, ct);
        return StatusCode(201, result);
    }

    [Authorize(Policy = "CompanyProjectsOnly")]
    [HttpPut("{id:guid}")]
    [RequestSizeLimit(104_857_600)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectRequest request, CancellationToken ct)
    {
        var result = await _projectService.UpdateAsync(GetUserId(), GetUserRole(), id, request, ct);
        return Ok(result);
    }

    [Authorize(Policy = "CompanyProjectsOnly")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _projectService.DeleteAsync(GetUserId(), GetUserRole(), id, ct);
        return NoContent();
    }
}
