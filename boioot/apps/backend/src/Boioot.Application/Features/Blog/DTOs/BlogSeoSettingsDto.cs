namespace Boioot.Application.Features.Blog.DTOs;

public class BlogSeoSettingsDto
{
    public string SiteName { get; set; } = "بيوت";
    public string DefaultPostSeoTitleTemplate { get; set; } = "{PostTitle} | {SiteName}";
    public string DefaultPostSeoDescriptionTemplate { get; set; } = "{Excerpt}";
    public string DefaultBlogListSeoTitle { get; set; } = "المدونة | بيوت";
    public string DefaultBlogListSeoDescription { get; set; } = "";
    public string DefaultOgTitleTemplate { get; set; } = "{PostTitle} | {SiteName}";
    public string DefaultOgDescriptionTemplate { get; set; } = "{Excerpt}";
}
