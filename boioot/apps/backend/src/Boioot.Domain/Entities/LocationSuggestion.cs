namespace Boioot.Domain.Entities;

public class LocationSuggestion : BaseEntity
{
    public string Name     { get; set; } = string.Empty;
    public string Type     { get; set; } = string.Empty;  // "city" | "neighborhood"
    public Guid?  ParentId { get; set; }                  // CityId for neighborhood suggestions
    public string Status   { get; set; } = "pending";
}
