using Boioot.Application.Features.Matching.DTOs;

namespace Boioot.Application.Features.Matching.Interfaces;

/// <summary>
/// Core matching engine: finds users whose coverage areas overlap with a given BuyerRequest.
/// Scoring: custom coverage with neighborhood match = 100pts, city-wide coverage = 60pts.
/// </summary>
public interface IRequestMatchingService
{
    /// <summary>
    /// Returns a scored, sorted list of users who cover the city/neighborhood of the given BuyerRequest.
    /// Uses fast ID-based path when BuyerRequest.CityId is set; falls back to string normalization.
    /// </summary>
    Task<List<MatchResultDto>> GetMatchesAsync(Guid buyerRequestId, CancellationToken ct = default);
}
