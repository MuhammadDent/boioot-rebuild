namespace Boioot.Domain.Entities;

/// <summary>
/// Extra profile data for users with role Broker or Office.
/// PK is UserId (stored as string — the Guid text representation of User.Id).
/// No EF navigation property — joins are done manually in controllers to avoid
/// Guid↔string FK type conflict.
/// </summary>
public class AgencyProfile
{
    public string UserId    { get; set; } = string.Empty;
    public string? Bio      { get; set; }
    public string? City     { get; set; }
    public string? LogoUrl  { get; set; }

    /// <summary>Admin must approve before the profile appears on the public /agencies page.</summary>
    public bool IsVisible  { get; set; } = false;

    /// <summary>Pinned to top of results and shown with a "مميز" badge.</summary>
    public bool IsFeatured { get; set; } = false;

    /// <summary>Lower numbers appear first in the public listing.</summary>
    public int  SortOrder  { get; set; } = 0;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
