namespace Boioot.Domain.Entities;

/// <summary>
/// Junction table linking a Property to the amenities it has selected.
/// </summary>
public class PropertyAmenitySelection
{
    public Guid PropertyId { get; set; }
    public Guid AmenityId { get; set; }

    public Property Property { get; set; } = null!;
    public PropertyAmenity Amenity { get; set; } = null!;
}
