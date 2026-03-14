using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class BlogPost : SoftDeletableEntity
{
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? SummaryAr { get; set; }
    public string? SummaryEn { get; set; }
    public string ContentAr { get; set; } = string.Empty;
    public string ContentEn { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public string? Tags { get; set; }
    public BlogPostStatus Status { get; set; } = BlogPostStatus.Draft;
    public bool IsFeatured { get; set; } = false;
    public int ViewsCount { get; set; } = 0;
    public DateTime? PublishedAt { get; set; }
    public string? MetaTitleAr { get; set; }
    public string? MetaTitleEn { get; set; }
    public string? MetaDescriptionAr { get; set; }
    public string? MetaDescriptionEn { get; set; }

    public Guid AuthorId { get; set; }
    public User Author { get; set; } = null!;
}
