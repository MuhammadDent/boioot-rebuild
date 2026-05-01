namespace Boioot.Application.Features.Matching.DTOs;

public class BuyerRequestLeadDto
{
    public Guid    Id              { get; set; }
    public string  Title           { get; set; } = string.Empty;
    public string  PropertyType    { get; set; } = string.Empty;
    public string? City            { get; set; }
    public string? Neighborhood    { get; set; }
    public string  Status          { get; set; } = string.Empty;
    public string? ReferenceNumber { get; set; }
    public DateTime CreatedAt      { get; set; }
}
