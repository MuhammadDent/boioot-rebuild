namespace Boioot.Application.Features.Blog.DTOs;

public class UpdateBlogPostRequest
{
    public string? Title { get; set; }
    public string? Slug { get; set; }
    public string? Excerpt { get; set; }
    public string? Content { get; set; }
    public string? CoverImageUrl { get; set; }
    public Guid? CategoryId { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public int? ReadingTime { get; set; }
    public bool? IsFeatured { get; set; }
}
