using Boioot.Application.Features.Blog.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/blog")]
[AllowAnonymous]
public class PublicBlogController : BaseController
{
    private readonly IBlogService _blog;

    public PublicBlogController(IBlogService blog)
    {
        _blog = blog;
    }

    /// <summary>
    /// GET /api/blog/posts
    /// Published posts, ordered by PublishedAt desc.
    /// Filters: categorySlug, isFeatured.
    /// Paginated: page, pageSize (max 50).
    /// </summary>
    [HttpGet("posts")]
    public async Task<IActionResult> GetPosts(
        [FromQuery] string? categorySlug = null,
        [FromQuery] bool? isFeatured = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        var result = await _blog.PublicGetPostsAsync(categorySlug, isFeatured, page, pageSize, ct);
        return Ok(result);
    }

    /// <summary>GET /api/blog/posts/{slug} — single published post by slug</summary>
    [HttpGet("posts/{slug}")]
    public async Task<IActionResult> GetPost(string slug, CancellationToken ct)
    {
        var result = await _blog.PublicGetPostBySlugAsync(slug, ct);
        return Ok(result);
    }

    /// <summary>GET /api/blog/categories — active categories with published post counts</summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
    {
        var result = await _blog.PublicGetCategoriesAsync(ct);
        return Ok(result);
    }

    /// <summary>
    /// GET /api/blog/categories/{categorySlug}/posts
    /// Published posts in a specific active category, ordered by PublishedAt desc.
    /// </summary>
    [HttpGet("categories/{categorySlug}/posts")]
    public async Task<IActionResult> GetPostsByCategory(
        string categorySlug,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        var result = await _blog.PublicGetPostsByCategorySlugAsync(categorySlug, page, pageSize, ct);
        return Ok(result);
    }
}
