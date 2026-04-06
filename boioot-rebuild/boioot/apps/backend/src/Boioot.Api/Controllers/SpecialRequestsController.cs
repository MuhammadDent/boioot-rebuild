using Boioot.Application.Features.SpecialRequests.DTOs;
using Boioot.Application.Features.SpecialRequests.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/special-requests")]
public class SpecialRequestsController : BaseController
{
    private readonly ISpecialRequestService _service;

    public SpecialRequestsController(ISpecialRequestService service)
    {
        _service = service;
    }

    // ── Admin endpoints ────────────────────────────────────────────────────────

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await _service.GetAllAsync(search, status, page, pageSize, ct);
        return Ok(result);
    }

    [HttpGet("admin/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        if (item is null) return NotFound();
        return Ok(item);
    }

    [HttpPut("admin/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSpecialRequestDto dto, CancellationToken ct)
    {
        try
        {
            var result = await _service.UpdateAsync(id, dto, ct);
            return Ok(result);
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

    // ── Public endpoints ───────────────────────────────────────────────────────

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Submit([FromBody] SubmitSpecialRequestDto dto, CancellationToken ct)
    {
        var userId = GetOptionalUserId();
        var result = await _service.SubmitAsync(dto, userId, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }
}
