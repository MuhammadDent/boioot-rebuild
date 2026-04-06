namespace Boioot.Domain.Entities;

/// <summary>
/// Master catalog of property amenities / features (e.g. balcony, pool, gym).
/// Keys are stable English identifiers — never rename after seeding.
/// </summary>
public class PropertyAmenity : BaseEntity
{
    /// <summary>Stable English key. Used as the canonical identifier in all logic.</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Arabic display label shown in the UI.</summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>Arabic group name for UI grouping (e.g. داخلية / خارجية / موقع).</summary>
    public string GroupAr { get; set; } = string.Empty;

    /// <summary>Display order within the group.</summary>
    public int Order { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<PropertyAmenitySelection> Selections { get; set; } = [];
}
