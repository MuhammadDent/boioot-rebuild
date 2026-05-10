namespace Boioot.Application.Features.Coverage.DTOs;

public class CoverageItemDto
{
    public Guid    Id               { get; set; }
    /// <summary>Null for province_wide coverage.</summary>
    public Guid?   CityId           { get; set; }
    public string  CityName         { get; set; } = string.Empty;
    /// <summary>Set for province_wide coverage.</summary>
    public string? Province         { get; set; }
    public Guid?   NeighborhoodId   { get; set; }
    public string? NeighborhoodName { get; set; }
    public string  CoverageType     { get; set; } = string.Empty;
    public DateTime AddedAt         { get; set; }
}
