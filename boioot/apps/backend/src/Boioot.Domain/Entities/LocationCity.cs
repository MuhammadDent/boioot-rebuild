namespace Boioot.Domain.Entities;

public class LocationCity : BaseEntity
{
    public string Name           { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public string Province       { get; set; } = string.Empty;
    public bool   IsActive       { get; set; } = true;

    /// <summary>
    /// True for admin-seeded/admin-verified cities.
    /// False for user-contributed cities (still visible and usable, but shown after verified ones).
    /// </summary>
    public bool IsVerified { get; set; } = false;

    /// <summary>
    /// Number of times this city has been used in property listings.
    /// Used for secondary sort (popular cities appear higher within the same tier).
    /// </summary>
    public int UsageCount { get; set; } = 0;
}
