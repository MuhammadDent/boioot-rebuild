import { api } from "@/lib/api";
import type {
  PagedResult,
  PublicBlogPostSummary,
  PublicBlogPostDetail,
  PublicBlogCategory,
} from "@/types";

export const publicBlogApi = {
  getPosts(params?: {
    page?: number;
    pageSize?: number;
    categorySlug?: string;
    isFeatured?: boolean;
  }): Promise<PagedResult<PublicBlogPostSummary>> {
    const qs = new URLSearchParams();
    if (params?.page)         qs.set("page",         String(params.page));
    if (params?.pageSize)     qs.set("pageSize",     String(params.pageSize));
    if (params?.categorySlug) qs.set("categorySlug", params.categorySlug);
    if (params?.isFeatured)   qs.set("isFeatured",   "true");
    const q = qs.toString();
    return api.get(`/blog/posts${q ? "?" + q : ""}`);
  },

  getPost(slug: string): Promise<PublicBlogPostDetail> {
    return api.get(`/blog/posts/${slug}`);
  },

  getCategories(): Promise<PublicBlogCategory[]> {
    return api.get("/blog/categories");
  },
};
