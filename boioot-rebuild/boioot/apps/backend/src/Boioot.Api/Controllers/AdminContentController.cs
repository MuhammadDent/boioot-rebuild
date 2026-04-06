using Boioot.Application.Features.Content.DTOs;
using Boioot.Application.Features.Content.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/admin/content")]
[Authorize]
public class AdminContentController : BaseController
{
    private readonly ISiteContentService _content;

    public AdminContentController(ISiteContentService content)
    {
        _content = content;
    }

    // ── List ──────────────────────────────────────────────────────────────────

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? group,
        CancellationToken ct)
    {
        var items = await _content.GetAllAsync(group, ct);
        return Ok(items);
    }

    // ── Single ────────────────────────────────────────────────────────────────

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var item = await _content.GetByIdAsync(id, ct);
        return Ok(item);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateSiteContentRequest request,
        CancellationToken ct)
    {
        var item = await _content.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateSiteContentRequest request,
        CancellationToken ct)
    {
        var item = await _content.UpdateAsync(id, request, ct);
        return Ok(item);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _content.DeleteAsync(id, ct);
        return NoContent();
    }
}
