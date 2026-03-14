using Boioot.Application.Features.Requests.DTOs;
using Boioot.Application.Features.Requests.Interfaces;
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
    public async Task<IActionResult> Submit([FromBody] SubmitRequestRequest request, CancellationToken ct)
    {
        var result = await _requestService.SubmitAsync(request, ct);
        return StatusCode(201, result);
    }
}
