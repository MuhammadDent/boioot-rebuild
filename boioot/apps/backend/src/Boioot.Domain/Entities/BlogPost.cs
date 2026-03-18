using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class BlogPost : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Excerpt { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public BlogPostStatus Status { get; set; } = BlogPostStatus.Draft;
    public Guid AuthorId { get; set; }
    public Guid CategoryId { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public int ReadingTime { get; set; } = 0;
    public bool IsFeatured { get; set; } = false;

    public User Author { get; set; } = null!;
    public BlogCategory Category { get; set; } = null!;
}
