namespace Boioot.Application.Features.Blog.DTOs;

public class CreateBlogPostRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Excerpt { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public Guid CategoryId { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public int ReadingTime { get; set; } = 0;
    public bool IsFeatured { get; set; } = false;
}
