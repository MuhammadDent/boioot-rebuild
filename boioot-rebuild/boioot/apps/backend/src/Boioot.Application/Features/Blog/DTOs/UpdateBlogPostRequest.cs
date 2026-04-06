namespace Boioot.Application.Features.Blog.DTOs;

public class UpdateBlogPostRequest
{
    public string? Title { get; set; }
    public string? Slug { get; set; }
    public string? Excerpt { get; set; }
    public string? Content { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? CoverImageAlt { get; set; }
    public List<string>? Tags { get; set; }
    public bool? IsFeatured { get; set; }

    // Raw SEO fields (used only when mode is Custom)
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }

    // SEO modes (null = don't change)
    public string? SeoTitleMode { get; set; }
    public string? SeoDescriptionMode { get; set; }
    public string? SlugMode { get; set; }

    // Unified SEO mode + OG fields (null = don't change)
    public string? SeoMode { get; set; }
    public string? OgTitle { get; set; }
    public string? OgDescription { get; set; }

    public int? ReadTimeMinutes { get; set; }
    public List<Guid>? CategoryIds { get; set; }
}
