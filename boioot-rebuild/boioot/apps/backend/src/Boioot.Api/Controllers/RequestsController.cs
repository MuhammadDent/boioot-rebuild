using Boioot.Application.Features.Requests.DTOs;
using Boioot.Application.Features.Requests.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/requests")]
public class RequestsController : BaseController
{
    private readonly IRequestService _requestService;

    public RequestsController(IRequestService requestService)
    {
        _requestService = requestService;
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Submit([FromBody] SubmitRequestRequest request, CancellationToken ct)
    {
        var result = await _requestService.SubmitAsync(request, GetOptionalUserId(), ct);
        return StatusCode(201, result);
    }

    [Authorize]
    [HttpGet("my")]
    public async Task<IActionResult> GetMyRequests(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        var result = await _requestService.GetMyRequestsAsync(GetUserId(), page, pageSize, ct);
        return Ok(result);
    }
}
