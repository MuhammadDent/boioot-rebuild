using Boioot.Application.Features.BuyerRequests.DTOs;
using Boioot.Application.Features.BuyerRequests.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/buyer-requests")]
public class BuyerRequestsController : BaseController
{
    private readonly IBuyerRequestService _service;

    public BuyerRequestsController(IBuyerRequestService service)
    {
        _service = service;
    }

    // ── Listing ───────────────────────────────────────────────────────────────

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetPublic(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        CancellationToken ct = default)
    {
        var result = await _service.GetPublicAsync(page, pageSize, ct);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("my")]
    public async Task<IActionResult> GetMy(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        var result = await _service.GetMyAsync(GetUserId(), page, pageSize, ct);
        return Ok(result);
    }

    // ── Single request ────────────────────────────────────────────────────────

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetByIdAsync(id, ct);
        return Ok(result);
    }

    // ── Create / Delete ───────────────────────────────────────────────────────

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateBuyerRequestDto dto, CancellationToken ct)
    {
        var result = await _service.CreateAsync(GetUserId(), dto, ct);
        return StatusCode(201, result);
    }

    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(GetUserId(), id, ct);
        return NoContent();
    }

    // ── Comments ──────────────────────────────────────────────────────────────

    [HttpGet("{id:guid}/comments")]
    [AllowAnonymous]
    public async Task<IActionResult> GetComments(Guid id, CancellationToken ct)
    {
        var result = await _service.GetCommentsAsync(id, ct);
        return Ok(result);
    }

    [Authorize]
    [HttpPost("{id:guid}/comments")]
    public async Task<IActionResult> AddComment(
        Guid id, [FromBody] AddCommentDto dto, CancellationToken ct)
    {
        var result = await _service.AddCommentAsync(GetUserId(), id, dto, ct);
        return StatusCode(201, result);
    }

    [Authorize]
    [HttpDelete("comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteComment(Guid commentId, CancellationToken ct)
    {
        await _service.DeleteCommentAsync(GetUserId(), commentId, ct);
        return NoContent();
    }
}
