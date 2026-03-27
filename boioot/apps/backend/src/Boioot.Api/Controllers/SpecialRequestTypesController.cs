using Boioot.Application.Features.SpecialRequests.DTOs;
using Boioot.Application.Features.SpecialRequests.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/special-request-types")]
public class SpecialRequestTypesController : BaseController
{
    private readonly ISpecialRequestTypeService _service;

    public SpecialRequestTypesController(ISpecialRequestTypeService service)
    {
        _service = service;
    }

    // ── Public — active types for the form dropdown ────────────────────────────

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetActive(CancellationToken ct)
    {
        var types = await _service.GetActiveAsync(ct);
        return Ok(types);
    }

    // ── Admin ──────────────────────────────────────────────────────────────────

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var types = await _service.GetAllAsync(ct);
        return Ok(types);
    }

    [HttpPost("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateSpecialRequestTypeDto dto, CancellationToken ct)
    {
        var created = await _service.CreateAsync(dto, ct);
        return Ok(created);
    }

    [HttpPut("admin/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSpecialRequestTypeDto dto, CancellationToken ct)
    {
        try
        {
            var updated = await _service.UpdateAsync(id, dto, ct);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("admin/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await _service.DeleteAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }
}
