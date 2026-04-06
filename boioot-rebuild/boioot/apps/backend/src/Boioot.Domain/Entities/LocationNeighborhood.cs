namespace Boioot.Domain.Entities;

public class LocationNeighborhood : BaseEntity
{
    public string Name           { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public string City           { get; set; } = string.Empty;
    public bool   IsActive       { get; set; } = true;
}
