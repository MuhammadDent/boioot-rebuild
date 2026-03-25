namespace Boioot.Application.Features.Content.DTOs;

public class UpdateSiteContentRequest
{
    public string LabelAr { get; set; } = string.Empty;
    public string? LabelEn { get; set; }
    public string? ValueAr { get; set; }
    public string? ValueEn { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;
    public string Type { get; set; } = "text";
}
