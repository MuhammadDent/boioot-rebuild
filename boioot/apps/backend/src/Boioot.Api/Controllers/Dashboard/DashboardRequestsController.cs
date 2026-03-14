using Boioot.Application.Features.Requests.DTOs;
using Boioot.Application.Features.Requests.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers.Dashboard;

[Authorize(Policy = "AdminOrCompanyOwnerOrAgent")]
[Route("api/dashboard/requests")]
public class DashboardRequestsController : BaseController
{
    private readonly IRequestService _requestService;

    public DashboardRequestsController(IRequestService requestService)
    {
        _requestService = requestService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] RequestFilters filters, CancellationToken ct)
    {
        var result = await _requestService.GetDashboardListAsync(
            GetUserId(), GetUserRole(), filters, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _requestService.GetByIdAsync(
            GetUserId(), GetUserRole(), id, ct);
        return Ok(result);
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(
        Guid id, [FromBody] UpdateRequestStatusRequest request, CancellationToken ct)
    {
        var result = await _requestService.UpdateStatusAsync(
            GetUserId(), GetUserRole(), id, request.Status!.Value, ct);
        return Ok(result);
    }
}
