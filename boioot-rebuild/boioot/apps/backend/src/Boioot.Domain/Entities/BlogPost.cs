using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class BlogPost : BaseEntity, ISoftDeletable
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Excerpt { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public string? CoverImageAlt { get; set; }
    public string? Tags { get; set; }
    public BlogPostStatus Status { get; set; } = BlogPostStatus.Draft;
    public DateTime? PublishedAt { get; set; }
    public bool IsFeatured { get; set; } = false;

    // ── SEO raw/stored fields ─────────────────────────────────────────────────
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }

    // ── SEO modes ─────────────────────────────────────────────────────────────
    // Values: "Auto" | "Template" | "Custom"
    public string SeoTitleMode { get; set; } = "Auto";
    public string SeoDescriptionMode { get; set; } = "Auto";

    // Unified SEO mode — controls meta title, meta description, OG title, OG description
    public string SeoMode { get; set; } = "Auto";

    // Values: "Auto" | "Custom"
    public string SlugMode { get; set; } = "Auto";

    // ── Open Graph custom fields ───────────────────────────────────────────────
    public string? OgTitle { get; set; }
    public string? OgDescription { get; set; }

    public int? ReadTimeMinutes { get; set; }
    public int ViewCount { get; set; } = 0;
    public bool IsDeleted { get; set; } = false;

    public Guid CreatedByUserId { get; set; }
    public Guid? UpdatedByUserId { get; set; }
    public Guid? PublishedByUserId { get; set; }

    public User CreatedBy { get; set; } = null!;
    public User? UpdatedBy { get; set; }
    public User? PublishedBy { get; set; }

    public ICollection<BlogPostCategory> BlogPostCategories { get; set; } = new List<BlogPostCategory>();
}
