using Boioot.Application.Features.Projects.DTOs;
using Boioot.Application.Features.Projects.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

[Route("api/projects")]
public class ProjectsController : BaseController
{
    private readonly IProjectService _projectService;
    private readonly BoiootDbContext _db;

    public ProjectsController(IProjectService projectService, BoiootDbContext db)
    {
        _projectService = projectService;
        _db = db;
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

    // ── GET /api/projects/{id}/images ─────────────────────────────────────────

    /// <summary>
    /// Returns all images for a project, ordered by Order ASC.
    /// Public endpoint — no auth required.
    ///
    /// Prefer: GET /api/images/project/{id}
    /// </summary>
    [AllowAnonymous]
    [HttpGet("{id:guid}/images")]
    public async Task<IActionResult> GetImages(Guid id, CancellationToken ct)
    {
        bool exists = await _db.Projects
            .AnyAsync(p => p.Id == id && !p.IsDeleted, ct);

        if (!exists)
            return NotFound(new { error = "المشروع غير موجود" });

        var images = await _db.Set<ProjectImage>()
            .Where(i => i.ProjectId == id)
            .OrderBy(i => i.Order)
            .Select(i => new
            {
                i.Id,
                i.ImageUrl,
                i.IsCover,
                i.IsPrimary,
                i.Order,
                i.UserImageId,
            })
            .ToListAsync(ct);

        return Ok(images);
    }
}
