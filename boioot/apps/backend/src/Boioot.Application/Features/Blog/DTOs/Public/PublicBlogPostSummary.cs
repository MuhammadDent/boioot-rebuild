using Boioot.Application.Features.Blog.DTOs;

namespace Boioot.Application.Features.Blog.DTOs.Public;

/// <summary>
/// Returned by public list endpoints.
/// Does NOT include Content, IsDeleted, or internal audit user IDs.
/// </summary>
public class PublicBlogPostSummary
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Excerpt { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? CoverImageAlt { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsFeatured { get; set; }
    public int? ReadTimeMinutes { get; set; }
    public int ViewCount { get; set; }
    public DateTime? PublishedAt { get; set; }
    public List<BlogCategoryResponse> Categories { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}
