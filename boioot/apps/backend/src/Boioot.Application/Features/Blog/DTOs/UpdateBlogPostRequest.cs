namespace Boioot.Application.Features.Blog.DTOs;

public class UpdateBlogPostRequest
{
    public string? Title { get; set; }
    public string? Slug { get; set; }
    public string? Excerpt { get; set; }
    public string? Content { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? CoverImageAlt { get; set; }
    public List<string>? Tags { get; set; }
    public bool? IsFeatured { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public int? ReadTimeMinutes { get; set; }
    public List<Guid>? CategoryIds { get; set; }
}
