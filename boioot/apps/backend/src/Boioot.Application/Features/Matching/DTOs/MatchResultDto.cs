namespace Boioot.Application.Features.Matching.DTOs;

/// <summary>A single matched user returned by the matching engine.</summary>
public class MatchResultDto
{
    public Guid   UserId       { get; set; }
    public string UserName     { get; set; } = string.Empty;
    public string UserPhone    { get; set; } = string.Empty;

    /// <summary>100 = neighborhood match, 60 = city-wide match.</summary>
    public int    MatchScore   { get; set; }

    /// <summary>Human-readable reason for the match (Arabic).</summary>
    public string MatchReason  { get; set; } = string.Empty;

    /// <summary>"city_wide" | "custom"</summary>
    public string CoverageType { get; set; } = string.Empty;

    /// <summary>City name that matched.</summary>
    public string CityName     { get; set; } = string.Empty;

    /// <summary>Neighborhood name that matched (null for city_wide).</summary>
    public string? NeighborhoodName { get; set; }
}
