using Boioot.Application.Features.Admin.DTOs;
using Boioot.Application.Features.Admin.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/ownership-types")]
public class OwnershipTypesController : BaseController
{
    private readonly IAdminService _admin;
    public OwnershipTypesController(IAdminService admin) { _admin = admin; }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetActive(CancellationToken ct = default)
    {
        var all = await _admin.GetOwnershipTypesAsync(ct);
        return Ok(all.Where(t => t.IsActive));
    }

    [HttpGet("all")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetAll(CancellationToken ct = default)
        => Ok(await _admin.GetOwnershipTypesAsync(ct));

    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Create([FromBody] UpsertOwnershipTypeRequest request, CancellationToken ct = default)
        => Ok(await _admin.CreateOwnershipTypeAsync(request, ct));

    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertOwnershipTypeRequest request, CancellationToken ct = default)
        => Ok(await _admin.UpdateOwnershipTypeAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct = default)
    {
        await _admin.DeleteOwnershipTypeAsync(id, ct);
        return NoContent();
    }
}
