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
    const res = await fetch(`${base}/public/pages/footer-links`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  },

  async adminGetAll(): Promise<StaticPageAdmin[]> {
    const res = await fetch(`${base}/admin/pages`, { credentials: "include" });
    if (!res.ok) throw new Error("فشل في تحميل الصفحات");
    return res.json();
  },

  async adminCreate(payload: UpsertStaticPagePayload): Promise<StaticPageAdmin> {
    const res = await fetch(`${base}/admin/pages`, {
      method:      "POST",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message ?? "فشل الإنشاء");
    }
    return res.json();
  },

  async adminUpdate(id: string, payload: UpsertStaticPagePayload): Promise<StaticPageAdmin> {
    const res = await fetch(`${base}/admin/pages/${id}`, {
      method:      "PUT",
      credentials: "include",
      headers:     { "Content-Type": "application/json" },
      body:        JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message ?? "فشل التحديث");
    }
    return res.json();
  },

  async adminDelete(id: string): Promise<void> {
    const res = await fetch(`${base}/admin/pages/${id}`, {
      method:      "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { message?: string }).message ?? "فشل الحذف");
    }
  },
};
