using Boioot.Application.Features.Bookings.DTOs;
using Boioot.Application.Features.Bookings.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Authorize]
[Route("api/bookings")]
public class BookingsController : BaseController
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBookingRequest request, CancellationToken ct)
    {
        var result = await _bookingService.CreateAsync(GetUserId(), request, ct);
        return StatusCode(201, result);
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        var result = await _bookingService.GetMineAsync(GetUserId(), ct);
        return Ok(result);
    }

    [HttpGet("for-my-properties")]
    public async Task<IActionResult> ForMyProperties(CancellationToken ct)
    {
        var result = await _bookingService.GetForMyPropertiesAsync(GetUserId(), ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/confirm")]
    public async Task<IActionResult> Confirm(Guid id, CancellationToken ct)
    {
        var result = await _bookingService.ConfirmAsync(GetUserId(), id, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
    {
        var result = await _bookingService.RejectAsync(GetUserId(), id, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _bookingService.CancelAsync(GetUserId(), id, ct);
        return Ok(result);
    }
}