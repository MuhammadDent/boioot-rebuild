namespace Boioot.Domain.Entities;

/// <summary>
/// Master catalog of all measurable subscription limits.
/// Keys are stable identifiers — never change them after seeding.
/// e.g. "max_active_listings", "max_agents", "max_images_per_listing"
/// </summary>
public class LimitDefinition : BaseEntity
{
    /// <summary>Stable internal identifier. Unique. Never rename after creation.</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Human-readable display name (Arabic or English).</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Optional explanation of what this limit controls.</summary>
    public string? Description { get; set; }

    /// <summary>
    /// Unit label for the limit value.
    /// e.g. "count", "images", "agents", "projects", "MB"
    /// </summary>
    public string? Unit { get; set; }

    /// <summary>
    /// Data type of the limit value.
    /// e.g. "integer", "decimal"
    /// </summary>
    public string ValueType { get; set; } = "integer";

    /// <summary>
    /// What entity this limit is applied to.
    /// e.g. "account", "user", "listing"
    /// </summary>
    public string? AppliesToScope { get; set; }

    public bool IsActive { get; set; } = true;
}
