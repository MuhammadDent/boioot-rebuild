using Boioot.Application.Features.Admin.DTOs;
using Boioot.Application.Features.Admin.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/property-types")]
public class PropertyTypesController : BaseController
{
    private readonly IAdminService _admin;
    public PropertyTypesController(IAdminService admin) { _admin = admin; }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetActive(CancellationToken ct = default)
    {
        var all = await _admin.GetPropertyTypesAsync(ct);
        return Ok(all.Where(t => t.IsActive));
    }

    [HttpGet("all")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAll(CancellationToken ct = default)
        => Ok(await _admin.GetPropertyTypesAsync(ct));

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] UpsertPropertyTypeRequest request, CancellationToken ct = default)
        => Ok(await _admin.CreatePropertyTypeAsync(request, ct));

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertPropertyTypeRequest request, CancellationToken ct = default)
        => Ok(await _admin.UpdatePropertyTypeAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct = default)
    {
        await _admin.DeletePropertyTypeAsync(id, ct);
        return NoContent();
    }
}
