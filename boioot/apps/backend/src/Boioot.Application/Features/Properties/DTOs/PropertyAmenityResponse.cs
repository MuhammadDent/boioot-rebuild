namespace Boioot.Application.Features.Properties.DTOs;

public class PropertyAmenityResponse
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string GroupAr { get; set; } = string.Empty;
    public int Order { get; set; }
}
