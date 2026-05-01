using Boioot.Application.Features.Matching.DTOs;
using Boioot.Application.Features.Matching.Interfaces;
using Boioot.Application.Exceptions;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Boioot.Api.Controllers;

[Authorize]
[Route("api/matching")]
public class MatchingController : BaseController
{
    private readonly IRequestMatchingService    _matching;
    private readonly IMatchingPlanAccessService _planAccess;
    private readonly BoiootDbContext            _db;
    private readonly bool                       _launchMode;

    public MatchingController(
        IRequestMatchingService    matching,
        IMatchingPlanAccessService planAccess,
        BoiootDbContext            db,
        IConfiguration             config)
    {
        _matching   = matching;
        _planAccess = planAccess;
        _db         = db;
        _launchMode = config.GetValue<bool>("Matching:LaunchMode", defaultValue: true);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/matching/buyer-requests/{id}
    // Returns coverage-matched users for a given BuyerRequest.
    // In LaunchMode (default): all results visible, lockedMatchesCount = 0.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("buyer-requests/{id:guid}")]
    public async Task<IActionResult> GetMatches(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();

        // Validate the request belongs to the caller (only request owner can see their matches)
        var request = await _db.BuyerRequests
            .AsNoTracking()
            .Where(r => r.Id == id && r.IsPublished)
            .Select(r => new { r.Id, r.Title, r.City, r.Neighborhood, r.UserId, r.Status })
            .FirstOrDefaultAsync(ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        if (request.UserId != userId)
            throw new BoiootException("غير مصرح لك بعرض نتائج هذا الطلب", 403);

        // ── Get all matches ───────────────────────────────────────────────────
        var allMatches  = await _matching.GetMatchesAsync(id, ct);
        var userFeatures = await _planAccess.GetFeaturesAsync(userId, ct);

        // ── Apply visibility rules ────────────────────────────────────────────
        List<MatchResultDto> visible;
        int                  locked;

        if (_launchMode)
        {
            visible = allMatches;
            locked  = 0;
        }
        else if (userFeatures.FullMatchAccess)
        {
            visible = allMatches;
            locked  = 0;
        }
        else
        {
            visible = allMatches.Take(2).ToList();
            locked  = Math.Max(0, allMatches.Count - 2);
        }

        return Ok(new MatchResponseDto
        {
            RequestId           = request.Id,
            RequestTitle        = request.Title,
            RequestCity         = request.City,
            RequestNeighborhood = request.Neighborhood,
            TotalCount          = allMatches.Count,
            IsLaunchMode        = _launchMode,
            IsUnlocked          = false,
            LockedMatchesCount  = locked,
            UserFeatures        = userFeatures,
            Matches             = visible,
        });
    }
}
