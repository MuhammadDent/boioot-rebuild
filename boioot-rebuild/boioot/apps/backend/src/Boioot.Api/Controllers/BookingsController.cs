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
}