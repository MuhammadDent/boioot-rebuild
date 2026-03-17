namespace Boioot.Domain.Entities;

/// <summary>
/// Master catalog of all possible subscription features.
/// Keys are stable identifiers — never change them after seeding.
/// e.g. "featured_listings", "video_upload", "analytics_dashboard"
/// </summary>
public class FeatureDefinition : BaseEntity
{
    /// <summary>Stable internal identifier. Unique. Never rename after creation.</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Human-readable display name (Arabic or English).</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Optional explanation of what this feature provides.</summary>
    public string? Description { get; set; }

    /// <summary>
    /// Logical group for UI grouping and filtering.
    /// e.g. "listing", "analytics", "support", "media", "team"
    /// </summary>
    public string? FeatureGroup { get; set; }

    public bool IsActive { get; set; } = true;
}
