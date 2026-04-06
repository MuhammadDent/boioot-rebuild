using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Blog.DTOs;

public class BlogPostDetailResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Excerpt { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public string? CoverImageAlt { get; set; }
    public List<string> Tags { get; set; } = new();
    public BlogPostStatus Status { get; set; }
    public bool IsFeatured { get; set; }
    public int? ReadTimeMinutes { get; set; }
    public int ViewCount { get; set; }

    // Raw stored SEO values
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

    // Resolved SEO (computed at fetch time)
    public string ResolvedSeoTitle { get; set; } = string.Empty;
    public string ResolvedSeoDescription { get; set; } = string.Empty;

    public DateTime? PublishedAt { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public Guid? UpdatedByUserId { get; set; }
    public Guid? PublishedByUserId { get; set; }
    public bool IsDeleted { get; set; }
    public List<BlogCategoryResponse> Categories { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
