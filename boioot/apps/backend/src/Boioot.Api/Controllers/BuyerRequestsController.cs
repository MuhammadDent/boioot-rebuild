using Boioot.Application.Features.BuyerRequests.DTOs;
using Boioot.Application.Features.BuyerRequests.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Boioot.Api.Controllers;

[Route("api/buyer-requests")]
public class BuyerRequestsController : BaseController
{
    private readonly IBuyerRequestService _service;

    public BuyerRequestsController(IBuyerRequestService service)
    {
        _service = service;
    }

    // ── Admin-only ────────────────────────────────────────────────────────────

    [HttpGet("admin")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllAdmin(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var result = await _service.GetAllForAdminAsync(page, pageSize, search, ct);
        return Ok(result);
    }

    [HttpDelete("admin/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminDelete(Guid id, CancellationToken ct)
    {
        await _service.AdminDeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPatch("admin/{id:guid}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminSetStatus(
        Guid id, [FromBody] SetBuyerRequestStatusRequest request, CancellationToken ct)
    {
        await _service.AdminSetStatusAsync(id, request.Status, ct);
        return NoContent();
    }

    [HttpPatch("admin/{id:guid}/published")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminSetPublished(
        Guid id, [FromBody] SetBuyerRequestPublishedRequest request, CancellationToken ct)
    {
        await _service.AdminSetPublishedAsync(id, request.IsPublished, ct);
        return NoContent();
    }

    [HttpPut("admin/{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminUpdate(
        Guid id, [FromBody] AdminUpdateBuyerRequestBody body, CancellationToken ct)
    {
        await _service.AdminUpdateAsync(id, new(body.Title, body.Description, body.PropertyType, body.City, body.Neighborhood), ct);
        return NoContent();
    }

    [HttpPost("admin/{id:guid}/respond")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminRespond(
        Guid id, [FromBody] AdminRespondRequest request, CancellationToken ct)
    {
        var result = await _service.AdminRespondAsync(GetUserId(), id, request.Content, ct);
        return StatusCode(201, result);
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
    [EnableRateLimiting("content")]
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
    [EnableRateLimiting("content")]
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

public record SetBuyerRequestStatusRequest(string Status);
public record SetBuyerRequestPublishedRequest(bool IsPublished);
public record AdminUpdateBuyerRequestBody(
    string Title,
    string Description,
    string PropertyType,
    string? City,
    string? Neighborhood
);
public record AdminRespondRequest(string Content);
