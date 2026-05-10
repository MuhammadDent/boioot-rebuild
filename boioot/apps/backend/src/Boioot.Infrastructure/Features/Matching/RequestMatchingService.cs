using Boioot.Application.Features.Matching.DTOs;
using Boioot.Application.Features.Matching.Interfaces;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Matching;

/// <summary>
/// Core matching engine: finds users whose UserCoverage overlaps with a BuyerRequest.
/// Fast path: when BuyerRequest.CityId is set, uses ID-based joins (O(1) lookup).
/// Fallback: when CityId is null (old requests), normalizes City string → resolves to Guid.
/// Scoring: custom + neighborhood = 100, city_wide = 60, province_wide = 50.
/// </summary>
public class RequestMatchingService : IRequestMatchingService
{
    private readonly BoiootDbContext _db;

    public RequestMatchingService(BoiootDbContext db)
    {
        _db = db;
    }

    public async Task<List<MatchResultDto>> GetMatchesAsync(
        Guid buyerRequestId,
        CancellationToken ct = default)
    {
        // ── 1. Load the BuyerRequest ──────────────────────────────────────────
        var request = await _db.BuyerRequests
            .AsNoTracking()
            .Where(r => r.Id == buyerRequestId && r.IsPublished && r.Status == "Open")
            .Select(r => new
            {
                r.Id,
                r.Title,
                r.City,
                r.Neighborhood,
                r.CityId,
                r.NeighborhoodId,
                r.UserId
            })
            .FirstOrDefaultAsync(ct);

        if (request is null)
            return [];

        // ── 2. Resolve CityId ─────────────────────────────────────────────────
        var cityId = request.CityId;

        if (cityId is null && !string.IsNullOrWhiteSpace(request.City))
        {
            // Fallback: normalize city string → look up in LocationCities
            var normalized = request.City.Trim().ToLowerInvariant();
            cityId = await _db.LocationCities
                .AsNoTracking()
                .Where(c => c.IsActive && c.NormalizedName == normalized)
                .Select(c => (Guid?)c.Id)
                .FirstOrDefaultAsync(ct);
        }

        if (cityId is null)
            return []; // cannot match without a city

        var neighborhoodId = request.NeighborhoodId;

        if (neighborhoodId is null && !string.IsNullOrWhiteSpace(request.Neighborhood))
        {
            var normalized = request.Neighborhood.Trim().ToLowerInvariant();
            neighborhoodId = await _db.LocationNeighborhoods
                .AsNoTracking()
                .Where(n => n.IsActive && n.NormalizedName == normalized)
                .Select(n => (Guid?)n.Id)
                .FirstOrDefaultAsync(ct);
        }

        // ── 3. Resolve Province of the request's city (for province_wide match) ─
        var cityProvince = await _db.LocationCities
            .AsNoTracking()
            .Where(c => c.Id == cityId)
            .Select(c => (string?)c.Province)
            .FirstOrDefaultAsync(ct);

        // ── 4. Query UserCoverages that match ─────────────────────────────────
        // Include: city_wide/custom where CityId matches
        //        + province_wide where Province matches the request city's province
        var coverages = await _db.Set<global::Boioot.Domain.Entities.UserCoverage>()
            .AsNoTracking()
            .Include(uc => uc.User)
            .Include(uc => uc.City)
            .Include(uc => uc.Neighborhood)
            .Where(uc =>
                uc.UserId != request.UserId
                && (
                    (uc.CoverageType != "province_wide" && uc.CityId == cityId)
                    || (uc.CoverageType == "province_wide"
                        && cityProvince != null
                        && uc.Province == cityProvince)
                ))
            .ToListAsync(ct);

        if (coverages.Count == 0)
            return [];

        // ── 5. Score and build results ────────────────────────────────────────
        var scored = new List<(int score, global::Boioot.Domain.Entities.UserCoverage uc)>();

        foreach (var uc in coverages)
        {
            if (uc.CoverageType == "province_wide")
            {
                // Province-wide: least specific — receives requests from any city in the province
                scored.Add((50, uc));
            }
            else if (uc.CoverageType == "city_wide")
            {
                scored.Add((60, uc));
            }
            else if (uc.CoverageType == "custom")
            {
                if (neighborhoodId.HasValue && uc.NeighborhoodId == neighborhoodId)
                    scored.Add((100, uc));
                else
                    scored.Add((60, uc)); // covers the city but wrong neighborhood
            }
        }

        // ── 6. Deduplicate by UserId (keep highest score per user) ─────────────
        var byUser = scored
            .GroupBy(x => x.uc.UserId)
            .Select(g => g.OrderByDescending(x => x.score).First())
            .OrderByDescending(x => x.score)
            .ThenBy(x => x.uc.CreatedAt)
            .ToList();

        // ── 7. Map to DTOs ────────────────────────────────────────────────────
        return byUser.Select(x =>
        {
            var (score, uc) = x;
            var reason = score == 100
                ? $"يغطي {uc.City?.Name ?? ""} — {uc.Neighborhood?.Name ?? ""}"
                : uc.CoverageType == "province_wide"
                    ? $"يغطي كامل محافظة {uc.Province ?? ""}"
                    : $"يغطي كامل {uc.City?.Name ?? ""}";

            return new MatchResultDto
            {
                UserId           = uc.UserId,
                UserName         = uc.User?.FullName ?? "",
                UserPhone        = uc.User?.Phone ?? "",
                MatchScore       = score,
                MatchReason      = reason,
                CoverageType     = uc.CoverageType,
                CityName         = uc.CoverageType == "province_wide"
                                       ? $"{uc.Province ?? ""} - كل المدن"
                                       : uc.City?.Name ?? "",
                NeighborhoodName = uc.Neighborhood?.Name,
            };
        }).ToList();
    }
}
