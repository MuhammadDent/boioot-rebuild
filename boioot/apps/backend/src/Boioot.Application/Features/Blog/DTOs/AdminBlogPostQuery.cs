using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Blog.DTOs;

public class AdminBlogPostQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public BlogPostStatus? Status { get; set; }
    public Guid? CategoryId { get; set; }
    public string SortBy { get; set; } = "createdAt";
    public string SortDir { get; set; } = "desc";
}
