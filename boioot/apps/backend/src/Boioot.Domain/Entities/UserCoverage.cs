namespace Boioot.Domain.Entities;

/// <summary>
/// Stores the geographic coverage area registered by a user (agent/broker).
/// CoverageType = "city_wide"  → covers the entire city (CityId required, NeighborhoodId null).
/// CoverageType = "custom"     → covers a specific neighborhood (both CityId + NeighborhoodId required).
/// </summary>
public class UserCoverage : BaseEntity
{
    public Guid   UserId         { get; set; }
    public Guid   CityId         { get; set; }
    public Guid?  NeighborhoodId { get; set; }

    /// <summary>"city_wide" | "custom"</summary>
    public string CoverageType { get; set; } = "city_wide";

    public User                  User         { get; set; } = null!;
    public LocationCity          City         { get; set; } = null!;
    public LocationNeighborhood? Neighborhood { get; set; }
}
