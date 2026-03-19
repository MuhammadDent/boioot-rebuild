using Boioot.Application.Common.Models;
using Boioot.Application.Features.Blog.DTOs;
using Boioot.Application.Features.Blog.DTOs.Public;

namespace Boioot.Application.Features.Blog.Interfaces;

public interface IBlogService
{
    // ── Admin: Posts ──────────────────────────────────────────────────────────
    Task<PagedResult<BlogPostSummaryResponse>> AdminGetPostsAsync(AdminBlogPostQuery query, CancellationToken ct = default);
    Task<BlogPostDetailResponse> AdminGetPostByIdAsync(Guid id, CancellationToken ct = default);
    Task<BlogPostDetailResponse> AdminCreatePostAsync(Guid createdByUserId, CreateBlogPostRequest request, CancellationToken ct = default);
    Task<BlogPostDetailResponse> AdminUpdatePostAsync(Guid id, Guid updatedByUserId, UpdateBlogPostRequest request, CancellationToken ct = default);
    Task AdminDeletePostAsync(Guid id, CancellationToken ct = default);
    Task<BlogPostDetailResponse> AdminPublishPostAsync(Guid id, Guid publishedByUserId, CancellationToken ct = default);
    Task<BlogPostDetailResponse> AdminUnpublishPostAsync(Guid id, CancellationToken ct = default);
    Task<BlogPostDetailResponse> AdminArchivePostAsync(Guid id, CancellationToken ct = default);

    // ── Admin: Categories ─────────────────────────────────────────────────────
    Task<List<BlogCategoryResponse>> AdminGetCategoriesAsync(CancellationToken ct = default);
    Task<BlogCategoryResponse> AdminGetCategoryByIdAsync(Guid id, CancellationToken ct = default);
    Task<BlogCategoryResponse> AdminCreateCategoryAsync(CreateBlogCategoryRequest request, CancellationToken ct = default);
    Task<BlogCategoryResponse> AdminUpdateCategoryAsync(Guid id, UpdateBlogCategoryRequest request, CancellationToken ct = default);
    Task AdminDeleteCategoryAsync(Guid id, CancellationToken ct = default);

    // ── Admin: Blog SEO Settings ──────────────────────────────────────────────
    Task<BlogSeoSettingsDto> GetBlogSeoSettingsAsync(CancellationToken ct = default);
    Task<BlogSeoSettingsDto> UpdateBlogSeoSettingsAsync(UpdateBlogSeoSettingsRequest request, CancellationToken ct = default);

    // ── Public: Posts (separate DTOs — no internal fields, no content in list) ─
    Task<PagedResult<PublicBlogPostSummary>> PublicGetPostsAsync(string? categorySlug, bool? isFeatured, int page, int pageSize, CancellationToken ct = default);
    Task<PublicBlogPostDetail> PublicGetPostBySlugAsync(string slug, CancellationToken ct = default);

    // ── Public: Categories ────────────────────────────────────────────────────
    Task<List<BlogCategoryResponse>> PublicGetCategoriesAsync(CancellationToken ct = default);
    Task<PagedResult<PublicBlogPostSummary>> PublicGetPostsByCategorySlugAsync(string categorySlug, int page, int pageSize, CancellationToken ct = default);
}
