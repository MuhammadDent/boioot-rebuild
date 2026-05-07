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

    // LaunchMode is preserved in config for operational flexibility
    // (e.g. temporarily open all results for testing / beta periods).
    // In Phase 1, professional accounts always have full access regardless of this flag.
    private readonly bool _launchMode;

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
    // GET /api/matching/my-leads
    // Returns buyer requests that fall within the calling user's coverage areas.
    // Free for all professional accounts (Broker / Agent / CompanyOwner / Office).
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet("my-leads")]
    public async Task<IActionResult> GetMyLeads(CancellationToken ct)
    {
        var userId = GetUserId();

        // Load the calling user's registered coverage areas
        var coverages = await _db.Set<Boioot.Domain.Entities.UserCoverage>()
            .AsNoTracking()
            .Where(uc => uc.UserId == userId)
            .ToListAsync(ct);

        if (!coverages.Any())
            return Ok(new MyLeadsResponseDto { IsLaunchMode = _launchMode, TotalCount = 0, Leads = [] });

        // Partition coverage into city-wide (match any request in that city)
        // and neighborhood-specific (match only requests in that exact neighborhood)
        var cityWideCityIds = coverages
            .Where(c => c.CoverageType == "city_wide")
            .Select(c => c.CityId)
            .ToHashSet();

        var customNeighborhoodIds = coverages
            .Where(c => c.CoverageType == "custom" && c.NeighborhoodId.HasValue)
            .Select(c => c.NeighborhoodId!.Value)
            .ToHashSet();

        // Find published buyer requests whose location overlaps with coverage
        var leads = await _db.BuyerRequests
            .AsNoTracking()
            .Where(r => r.IsPublished
                && (
                    (r.CityId.HasValue        && cityWideCityIds.Contains(r.CityId.Value))
                 || (r.NeighborhoodId.HasValue && customNeighborhoodIds.Contains(r.NeighborhoodId.Value))
                ))
            .OrderByDescending(r => r.CreatedAt)
            .Take(100)
            .Select(r => new BuyerRequestLeadDto
            {
                Id              = r.Id,
                Title           = r.Title,
                PropertyType    = r.PropertyType,
                City            = r.City,
                Neighborhood    = r.Neighborhood,
                Status          = r.Status,
                ReferenceNumber = r.ReferenceNumber,
                CreatedAt       = r.CreatedAt,
            })
            .ToListAsync(ct);

        return Ok(new MyLeadsResponseDto
        {
            IsLaunchMode = _launchMode,
            TotalCount   = leads.Count,
            Leads        = leads,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/matching/buyer-requests/{id}
    // Returns coverage-matched professionals for a given BuyerRequest.
    // Professional accounts (Broker / Agent / CompanyOwner / Office) always
    // receive full access — no subscription required.
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
        var allMatches   = await _matching.GetMatchesAsync(id, ct);
        var userFeatures = await _planAccess.GetFeaturesAsync(userId, ct);

        // ── Apply visibility rules ────────────────────────────────────────────
        // Phase 1: professional accounts always get full access.
        // LaunchMode also grants full access (preserved for operational flexibility).
        // Future: non-professional viewers may receive a limited preview.
        List<MatchResultDto> visible;
        int                  locked;

        if (_launchMode || userFeatures.HasProfessionalAccess || userFeatures.FullMatchAccess)
        {
            visible = allMatches;
            locked  = 0;
        }
        else
        {
            // Limited preview for non-professional accounts (future path)
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
            IsUnlocked          = userFeatures.HasProfessionalAccess,
            LockedMatchesCount  = locked,
            UserFeatures        = userFeatures,
            Matches             = visible,
        });
    }
}
