using Boioot.Application.Features.Blog.DTOs;
using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Blog.Interfaces;

public interface IBlogService
{
    // ── Admin: Posts ──────────────────────────────────────────────────────────
    Task<List<BlogPostSummaryResponse>> AdminGetPostsAsync(BlogPostStatus? status, Guid? categoryId, CancellationToken ct = default);
    Task<BlogPostDetailResponse> AdminGetPostByIdAsync(Guid id, CancellationToken ct = default);
    Task<BlogPostDetailResponse> AdminCreatePostAsync(Guid authorId, CreateBlogPostRequest request, CancellationToken ct = default);
    Task<BlogPostDetailResponse> AdminUpdatePostAsync(Guid id, UpdateBlogPostRequest request, CancellationToken ct = default);
    Task AdminDeletePostAsync(Guid id, CancellationToken ct = default);
    Task<BlogPostDetailResponse> AdminPublishPostAsync(Guid id, CancellationToken ct = default);
    Task<BlogPostDetailResponse> AdminUnpublishPostAsync(Guid id, CancellationToken ct = default);
    Task<BlogPostDetailResponse> AdminArchivePostAsync(Guid id, CancellationToken ct = default);

    // ── Admin: Categories ─────────────────────────────────────────────────────
    Task<List<BlogCategoryResponse>> AdminGetCategoriesAsync(CancellationToken ct = default);
    Task<BlogCategoryResponse> AdminGetCategoryByIdAsync(Guid id, CancellationToken ct = default);
    Task<BlogCategoryResponse> AdminCreateCategoryAsync(CreateBlogCategoryRequest request, CancellationToken ct = default);
    Task<BlogCategoryResponse> AdminUpdateCategoryAsync(Guid id, UpdateBlogCategoryRequest request, CancellationToken ct = default);
    Task AdminDeleteCategoryAsync(Guid id, CancellationToken ct = default);

    // ── Public: Posts ─────────────────────────────────────────────────────────
    Task<List<BlogPostSummaryResponse>> PublicGetPostsAsync(string? categorySlug, string? search, int page, int pageSize, CancellationToken ct = default);
    Task<BlogPostDetailResponse> PublicGetPostBySlugAsync(string slug, CancellationToken ct = default);

    // ── Public: Categories ────────────────────────────────────────────────────
    Task<List<BlogCategoryResponse>> PublicGetCategoriesAsync(CancellationToken ct = default);
    Task<List<BlogPostSummaryResponse>> PublicGetPostsByCategorySlugAsync(string categorySlug, int page, int pageSize, CancellationToken ct = default);
}
