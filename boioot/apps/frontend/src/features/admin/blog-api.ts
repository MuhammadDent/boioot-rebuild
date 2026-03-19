import { api } from "@/lib/api";
import type {
  PagedResult,
  BlogPostSummaryResponse,
  BlogPostDetailResponse,
  BlogCategoryResponse,
  BlogSeoSettingsDto,
  CreateBlogPostRequest,
  UpdateBlogPostRequest,
  CreateBlogCategoryRequest,
  UpdateBlogCategoryRequest,
  UpdateBlogSeoSettingsRequest,
} from "@/types";

// ── Filter types ──────────────────────────────────────────────────────────────

export interface AdminBlogPostsParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  categoryId?: string;
  sortBy?: string;
  sortDir?: string;
}

// ── Blog Admin API ────────────────────────────────────────────────────────────

export const blogAdminApi = {
  // ── Posts ──────────────────────────────────────────────────────────────────

  getPosts(params: AdminBlogPostsParams): Promise<PagedResult<BlogPostSummaryResponse>> {
    const qs = new URLSearchParams({
      page:     String(params.page),
      pageSize: String(params.pageSize),
    });
    if (params.search)     qs.set("search",     params.search);
    if (params.status)     qs.set("status",     params.status);
    if (params.categoryId) qs.set("categoryId", params.categoryId);
    if (params.sortBy)     qs.set("sortBy",     params.sortBy);
    if (params.sortDir)    qs.set("sortDir",    params.sortDir);
    return api.get(`/admin/blog/posts?${qs}`);
  },

  getPost(id: string): Promise<BlogPostDetailResponse> {
    return api.get(`/admin/blog/posts/${id}`);
  },

  createPost(request: CreateBlogPostRequest): Promise<BlogPostDetailResponse> {
    return api.post("/admin/blog/posts", request);
  },

  updatePost(id: string, request: UpdateBlogPostRequest): Promise<BlogPostDetailResponse> {
    return api.put(`/admin/blog/posts/${id}`, request);
  },

  deletePost(id: string): Promise<void> {
    return api.delete(`/admin/blog/posts/${id}`);
  },

  publishPost(id: string): Promise<BlogPostDetailResponse> {
    return api.post(`/admin/blog/posts/${id}/publish`, {});
  },

  unpublishPost(id: string): Promise<BlogPostDetailResponse> {
    return api.post(`/admin/blog/posts/${id}/unpublish`, {});
  },

  archivePost(id: string): Promise<BlogPostDetailResponse> {
    return api.post(`/admin/blog/posts/${id}/archive`, {});
  },

  // ── SEO Settings ──────────────────────────────────────────────────────────

  getSeoSettings(): Promise<BlogSeoSettingsDto> {
    return api.get("/admin/blog/seo-settings");
  },

  updateSeoSettings(request: UpdateBlogSeoSettingsRequest): Promise<BlogSeoSettingsDto> {
    return api.put("/admin/blog/seo-settings", request);
  },

  // ── Categories ─────────────────────────────────────────────────────────────

  getCategories(): Promise<BlogCategoryResponse[]> {
    return api.get("/admin/blog/categories");
  },

  getCategory(id: string): Promise<BlogCategoryResponse> {
    return api.get(`/admin/blog/categories/${id}`);
  },

  createCategory(request: CreateBlogCategoryRequest): Promise<BlogCategoryResponse> {
    return api.post("/admin/blog/categories", request);
  },

  updateCategory(id: string, request: UpdateBlogCategoryRequest): Promise<BlogCategoryResponse> {
    return api.put(`/admin/blog/categories/${id}`, request);
  },

  deleteCategory(id: string): Promise<void> {
    return api.delete(`/admin/blog/categories/${id}`);
  },
};
