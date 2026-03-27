namespace Boioot.Application.Features.SpecialRequests.DTOs;

public class SpecialRequestTypeResponse
{
    public Guid   Id        { get; set; }
    public string Label     { get; set; } = string.Empty;
    public string Value     { get; set; } = string.Empty;
    public int    SortOrder { get; set; }
    public bool   IsActive  { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
