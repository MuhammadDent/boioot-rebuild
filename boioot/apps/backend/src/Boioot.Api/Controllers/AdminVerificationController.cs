using Boioot.Application.Features.VerificationRequests.DTOs;
using Boioot.Application.Features.VerificationRequests.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[ApiController]
[Route("api/admin/verification")]
[Authorize(Roles = "Admin,Staff")]
public class AdminVerificationController : BaseController
{
    private readonly IVerificationRequestService _service;

    public AdminVerificationController(IVerificationRequestService service)
        => _service = service;

    /// <summary>List all verification requests with optional filters</summary>
    [HttpGet("requests")]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null,
        [FromQuery] string? verificationType = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        var filter = new AdminVerificationRequestFilter
        {
            Page             = page,
            PageSize         = pageSize,
            Status           = status,
            VerificationType = verificationType,
            Search           = search,
        };

        var result = await _service.GetAllRequestsAsync(filter, ct);
        return Ok(result);
    }

    /// <summary>Get a single verification request by id</summary>
    [HttpGet("requests/{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _service.GetRequestByIdAsync(id, ct);
        return Ok(result);
    }

    /// <summary>Approve / Reject / NeedsMoreInfo a verification request</summary>
    [HttpPut("requests/{id:guid}/review")]
    public async Task<IActionResult> Review(
        Guid id, [FromBody] ReviewVerificationRequestDto dto, CancellationToken ct)
    {
        var adminId = GetUserId();
        var result  = await _service.ReviewRequestAsync(adminId, id, dto, ct);
        return Ok(result);
    }
}
