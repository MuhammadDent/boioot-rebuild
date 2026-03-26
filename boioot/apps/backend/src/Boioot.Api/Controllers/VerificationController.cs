using Boioot.Application.Features.VerificationRequests.DTOs;
using Boioot.Application.Features.VerificationRequests.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[ApiController]
[Route("api/verification")]
[Authorize]
public class VerificationController : BaseController
{
    private readonly IVerificationRequestService _service;

    public VerificationController(IVerificationRequestService service)
        => _service = service;

    /// <summary>Create a new verification request (starts in Draft)</summary>
    [HttpPost("requests")]
    public async Task<IActionResult> CreateRequest(
        [FromBody] CreateVerificationRequestDto dto, CancellationToken ct)
    {
        var userId = GetUserId();
        var result = await _service.CreateRequestAsync(userId, dto, ct);
        return CreatedAtAction(nameof(GetMyRequestById), new { id = result.Id }, result);
    }

    /// <summary>Add a document to a Draft/NeedsMoreInfo request</summary>
    [HttpPost("requests/{id:guid}/documents")]
    public async Task<IActionResult> AddDocument(
        Guid id, [FromBody] AddDocumentDto dto, CancellationToken ct)
    {
        var userId = GetUserId();
        var result = await _service.AddDocumentAsync(userId, id, dto, ct);
        return Ok(result);
    }

    /// <summary>Submit the request for admin review (Draft → Pending)</summary>
    [HttpPost("requests/{id:guid}/submit")]
    public async Task<IActionResult> Submit(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        var result = await _service.SubmitRequestAsync(userId, id, ct);
        return Ok(result);
    }

    /// <summary>List my verification requests</summary>
    [HttpGet("requests/my")]
    public async Task<IActionResult> GetMyRequests(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var userId = GetUserId();
        var result = await _service.GetMyRequestsAsync(userId, page, pageSize, ct);
        return Ok(result);
    }

    /// <summary>Get a single request I own</summary>
    [HttpGet("requests/{id:guid}")]
    public async Task<IActionResult> GetMyRequestById(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        var result = await _service.GetMyRequestByIdAsync(userId, id, ct);
        return Ok(result);
    }
}
