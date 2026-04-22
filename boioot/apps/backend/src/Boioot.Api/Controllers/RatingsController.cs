using Boioot.Application.Exceptions;
using Boioot.Application.Features.Ratings.DTOs;
using Boioot.Application.Features.Ratings.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api")]
public class RatingsController : BaseController
{
    private readonly IRatingService           _ratings;
    private readonly ILogger<RatingsController> _log;

    public RatingsController(IRatingService ratings, ILogger<RatingsController> log)
    {
        _ratings = ratings;
        _log     = log;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/ratings
    // ──────────────────────────────────────────────────────────────────────────

    [Authorize]
    [HttpPost("ratings")]
    public async Task<IActionResult> Create(
        [FromBody] CreateRatingRequest request,
        CancellationToken ct)
    {
        if (request.Score < 1 || request.Score > 5)
            return BadRequest(new { message = "يجب أن يكون التقييم بين 1 و 5" });

        try
        {
            var result = await _ratings.CreateAsync(GetUserId(), request, ct);
            return StatusCode(201, result);
        }
        catch (BoiootException ex) when (ex.StatusCode == 409)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (BoiootException ex) when (ex.StatusCode == 403)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (BoiootException ex) when (ex.StatusCode == 404)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/listings/{id}/ratings?page=1&pageSize=10&sort=newest
    // ──────────────────────────────────────────────────────────────────────────

    [AllowAnonymous]
    [HttpGet("listings/{id:guid}/ratings")]
    public async Task<IActionResult> GetListingRatings(
        Guid id,
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string sort  = "newest",
        CancellationToken ct = default)
    {
        var result = await _ratings.GetListingRatingsAsync(id, page, pageSize, sort, ct);
        return Ok(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/listings/{id}/rating-summary
    // ──────────────────────────────────────────────────────────────────────────

    [AllowAnonymous]
    [HttpGet("listings/{id:guid}/rating-summary")]
    public async Task<IActionResult> GetRatingSummary(Guid id, CancellationToken ct)
    {
        var result = await _ratings.GetSummaryAsync(id, ct);
        return Ok(result);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/listings/{id}/can-rate   (requires auth)
    // ──────────────────────────────────────────────────────────────────────────

    [Authorize]
    [HttpGet("listings/{id:guid}/can-rate")]
    public async Task<IActionResult> CanRate(Guid id, CancellationToken ct)
    {
        var result = await _ratings.CanUserRateAsync(GetUserId(), id, ct);
        return Ok(result);
    }
}
