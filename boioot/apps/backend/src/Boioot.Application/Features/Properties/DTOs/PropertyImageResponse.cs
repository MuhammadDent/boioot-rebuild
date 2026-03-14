namespace Boioot.Application.Features.Properties.DTOs;

public class PropertyImageResponse
{
    public Guid Id { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
    public int Order { get; set; }
}
