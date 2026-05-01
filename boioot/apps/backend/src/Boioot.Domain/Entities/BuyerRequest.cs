namespace Boioot.Domain.Entities;

public class BuyerRequest : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string PropertyType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Neighborhood { get; set; }

    /// <summary>
    /// Structured city ID from LocationCities. Additive — null for requests created before this field.
    /// Used by the matching engine for fast ID-based lookups.
    /// </summary>
    public Guid? CityId { get; set; }

    /// <summary>
    /// Structured neighborhood ID from LocationNeighborhoods. Additive — null when not specified.
    /// Used by the matching engine for precise neighborhood matching.
    /// </summary>
    public Guid? NeighborhoodId { get; set; }
    public bool IsPublished { get; set; } = true;

    // Moderation status: Open | Closed | Reviewed
    public string Status { get; set; } = "Open";
    public string? ReferenceNumber { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }
}
