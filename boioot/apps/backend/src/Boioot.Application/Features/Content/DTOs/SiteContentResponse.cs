namespace Boioot.Application.Features.Content.DTOs;

public class SiteContentResponse
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Group { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string LabelAr { get; set; } = string.Empty;
    public string? LabelEn { get; set; }
    public string? ValueAr { get; set; }
    public string? ValueEn { get; set; }
    public bool IsActive { get; set; }
    public bool IsSystem { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
