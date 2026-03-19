namespace Boioot.Application.Features.Blog.DTOs;

public class UpdateBlogSeoSettingsRequest
{
    public string? SiteName { get; set; }
    public string? DefaultPostSeoTitleTemplate { get; set; }
    public string? DefaultPostSeoDescriptionTemplate { get; set; }
    public string? DefaultBlogListSeoTitle { get; set; }
    public string? DefaultBlogListSeoDescription { get; set; }
}
