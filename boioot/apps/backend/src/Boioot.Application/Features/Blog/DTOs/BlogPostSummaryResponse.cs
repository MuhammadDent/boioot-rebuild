using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Blog.DTOs;

public class BlogPostSummaryResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Excerpt { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? CoverImageAlt { get; set; }
    public BlogPostStatus Status { get; set; }
    public bool IsFeatured { get; set; }
    public int? ReadTimeMinutes { get; set; }
    public int ViewCount { get; set; }
    public DateTime? PublishedAt { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public List<BlogCategoryResponse> Categories { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
