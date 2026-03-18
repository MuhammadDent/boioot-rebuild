namespace Boioot.Application.Features.Blog.DTOs;

public class CreateBlogPostRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? Excerpt { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public bool IsFeatured { get; set; } = false;
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public int? ReadTimeMinutes { get; set; }
    public List<Guid> CategoryIds { get; set; } = new();
}
