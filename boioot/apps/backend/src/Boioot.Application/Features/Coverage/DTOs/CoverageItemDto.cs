namespace Boioot.Application.Features.Coverage.DTOs;

public class CoverageItemDto
{
    public Guid    Id               { get; set; }
    public Guid    CityId           { get; set; }
    public string  CityName         { get; set; } = string.Empty;
    public Guid?   NeighborhoodId   { get; set; }
    public string? NeighborhoodName { get; set; }
    public string  CoverageType     { get; set; } = string.Empty;
    public DateTime AddedAt         { get; set; }
}
