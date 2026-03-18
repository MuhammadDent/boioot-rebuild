using Boioot.Application.Features.Blog.DTOs;

namespace Boioot.Application.Features.Blog.DTOs.Public;

/// <summary>
/// Returned by GET /api/blog/posts/{slug}.
/// Includes full Content and SEO fields. Excludes internal audit fields.
/// </summary>
public class PublicBlogPostDetail
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Excerpt { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public bool IsFeatured { get; set; }
    public int? ReadTimeMinutes { get; set; }
    public int ViewCount { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public DateTime? PublishedAt { get; set; }
    public List<BlogCategoryResponse> Categories { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}
