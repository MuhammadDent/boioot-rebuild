namespace Boioot.Domain.Entities;

/// <summary>
/// Stores the geographic coverage area registered by a user (agent/broker).
/// CoverageType = "city_wide"      → covers the entire city (CityId required, NeighborhoodId null).
/// CoverageType = "custom"         → covers a specific neighborhood (both CityId + NeighborhoodId required).
/// CoverageType = "province_wide"  → covers ALL cities in a province (CityId null, Province required).
/// </summary>
public class UserCoverage : BaseEntity
{
    public Guid   UserId         { get; set; }

    /// <summary>Null for province_wide coverage.</summary>
    public Guid?  CityId         { get; set; }

    /// <summary>Set for province_wide coverage (e.g. "درعا"). Null for city_wide / custom.</summary>
    public string? Province      { get; set; }

    public Guid?  NeighborhoodId { get; set; }

    /// <summary>"city_wide" | "custom" | "province_wide"</summary>
    public string CoverageType { get; set; } = "city_wide";

    public User                  User         { get; set; } = null!;
    public LocationCity?         City         { get; set; }
    public LocationNeighborhood? Neighborhood { get; set; }
}
