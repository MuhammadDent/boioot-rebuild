import { api } from "@/lib/api";
import { apiConfig } from "@/lib/api-config";
import type {
  StaticPagePublic,
  FooterLink,
  StaticPageAdmin,
  UpsertStaticPagePayload,
} from "./types";

const base = apiConfig.baseUrl;

export const staticPagesApi = {
  async getBySlug(slug: string): Promise<StaticPagePublic> {
    const res = await fetch(`${base}/public/pages/${slug}`, { cache: "no-store" });
    if (res.status === 404) throw Object.assign(new Error("not_found"), { status: 404 });
    if (!res.ok) throw new Error("فشل في تحميل الصفحة");
    return res.json();
  },

  async getFooterLinks(): Promise<FooterLink[]> {
    try {
      const res = await fetch(`${base}/public/pages/footer-links`, { cache: "no-store" });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  adminGetAll(): Promise<StaticPageAdmin[]> {
    return api.get<StaticPageAdmin[]>("/admin/pages");
  },

  adminCreate(payload: UpsertStaticPagePayload): Promise<StaticPageAdmin> {
    return api.post<StaticPageAdmin>("/admin/pages", payload);
  },

  adminUpdate(id: string, payload: UpsertStaticPagePayload): Promise<StaticPageAdmin> {
    return api.put<StaticPageAdmin>(`/admin/pages/${id}`, payload);
  },

  adminDelete(id: string): Promise<void> {
    return api.delete<void>(`/admin/pages/${id}`);
  },
};
