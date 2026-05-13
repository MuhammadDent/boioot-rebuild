using Boioot.Api.Authorization;
using Boioot.Application.Features.Pages.DTOs;
using Boioot.Application.Features.Pages.Interfaces;
using Boioot.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Admin CRUD for static pages.
/// Requires Admin role.
/// </summary>
[Route("api/admin/pages")]
[Authorize]
public class AdminPagesController : BaseController
{
    private readonly IStaticPageService _service;

    public AdminPagesController(IStaticPageService service) => _service = service;

    /// <summary>GET /api/admin/pages — list all pages.</summary>
    [HttpGet]
    [RequirePermission(Permissions.SettingsView)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var pages = await _service.GetAllAdminAsync(ct);
        return Ok(pages);
    }

    /// <summary>POST /api/admin/pages — create a new page.</summary>
    [HttpPost]
    [RequirePermission(Permissions.SettingsManage)]
    public async Task<IActionResult> Create([FromBody] UpsertStaticPageDto dto, CancellationToken ct)
    {
        try
        {
            var created = await _service.CreateAsync(dto, ct);
            return CreatedAtAction(nameof(GetAll), created);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>PUT /api/admin/pages/{id} — update an existing page.</summary>
    [HttpPut("{id:guid}")]
    [RequirePermission(Permissions.SettingsManage)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertStaticPageDto dto, CancellationToken ct)
    {
        try
        {
            var updated = await _service.UpdateAsync(id, dto, ct);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "الصفحة غير موجودة." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>DELETE /api/admin/pages/{id} — delete a non-system page.</summary>
    [HttpDelete("{id:guid}")]
    [RequirePermission(Permissions.SettingsManage)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await _service.DeleteAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "الصفحة غير موجودة." });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}
