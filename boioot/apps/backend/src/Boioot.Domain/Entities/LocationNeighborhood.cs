namespace Boioot.Domain.Entities;

public class LocationNeighborhood : BaseEntity
{
    public string Name           { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public string City           { get; set; } = string.Empty;
    public bool   IsActive       { get; set; } = true;

    /// <summary>
    /// True for admin-seeded/admin-verified neighborhoods.
    /// False for user-contributed neighborhoods (still visible and usable, but shown after verified ones).
    /// </summary>
    public bool IsVerified { get; set; } = false;

    /// <summary>
    /// Number of times this neighborhood has been used in property listings.
    /// Used for secondary sort (popular neighborhoods appear higher within the same tier).
    /// </summary>
    public int UsageCount { get; set; } = 0;
}
