namespace Boioot.Application.Features.Blog.DTOs;

public class CreateBlogPostRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Excerpt { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public string? CoverImageAlt { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsFeatured { get; set; } = false;

    // Raw SEO fields (used only when mode is Custom)
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }

    // SEO modes
    public string SeoTitleMode { get; set; } = "Auto";
    public string SeoDescriptionMode { get; set; } = "Auto";
    public string SlugMode { get; set; } = "Auto";

    // Unified SEO mode + OG fields
    public string SeoMode { get; set; } = "Auto";
    public string? OgTitle { get; set; }
    public string? OgDescription { get; set; }

    public int? ReadTimeMinutes { get; set; }
    public List<Guid> CategoryIds { get; set; } = new();
}
