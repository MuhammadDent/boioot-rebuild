"use client";

import { resolveTemplate } from "@/lib/seo-resolver";
import type { BlogSeoSettingsDto } from "@/types";

type SeoMode = "Auto" | "Template" | "Custom";

export interface SeoPreviewProps {
  seoMode: SeoMode;
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  seoSettings: BlogSeoSettingsDto | null;
  previewUrl: string;
  coverImageUrl: string;
  firstCatName: string;
}

export default function SeoPreview({
  seoMode,
  title,
  excerpt,
  seoTitle,
  seoDescription,
  ogTitle,
  ogDescription,
  seoSettings,
  previewUrl,
  coverImageUrl,
  firstCatName,
}: SeoPreviewProps) {
  const siteName = seoSettings?.siteName ?? "بيوت";

  const seoVars: Record<string, string> = {
    PostTitle:   title || "",
    Excerpt:     excerpt || "",
    Category:    firstCatName,
    SiteName:    siteName,
    AuthorName:  "",
    PublishDate: new Date().toLocaleDateString("ar-SY", {
      year: "numeric", month: "long", day: "numeric",
    }),
  };

  const autoMetaTitle = `${title || "عنوان المقال"} | ${siteName}`;
  const autoMetaDesc  = excerpt || "";

  const previewMetaTitle = (() => {
    if (seoMode === "Custom") return seoTitle.trim() || autoMetaTitle;
    if (seoMode === "Template")
      return resolveTemplate(
        seoSettings?.defaultPostSeoTitleTemplate ?? "{PostTitle} | {SiteName}",
        seoVars
      ).trim() || autoMetaTitle;
    return autoMetaTitle;
  })();

  const previewMetaDesc = (() => {
    if (seoMode === "Custom") return seoDescription.trim() || autoMetaDesc;
    if (seoMode === "Template")
      return resolveTemplate(
        seoSettings?.defaultPostSeoDescriptionTemplate ?? "{Excerpt}",
        seoVars
      ).trim() || autoMetaDesc;
    return autoMetaDesc;
  })();

  const previewOgTitle = (() => {
    if (seoMode === "Custom") return ogTitle.trim() || previewMetaTitle;
    if (seoMode === "Template")
      return resolveTemplate(
        seoSettings?.defaultOgTitleTemplate ?? "{PostTitle} | {SiteName}",
        seoVars
      ).trim() || autoMetaTitle;
    return autoMetaTitle;
  })();

  const previewOgDesc = (() => {
    if (seoMode === "Custom") return ogDescription.trim() || previewMetaDesc;
    if (seoMode === "Template")
      return resolveTemplate(
        seoSettings?.defaultOgDescriptionTemplate ?? "{Excerpt}",
        seoVars
      ).trim() || autoMetaDesc;
    return autoMetaDesc;
  })();

  return (
    <>
      {/* ── Google Search Preview ── */}
      <div style={{ borderTop: "1px solid var(--color-border, #e5e7eb)", paddingTop: "0.75rem", marginBottom: "0.85rem" }}>
        <p style={{ margin: "0 0 0.45rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span>🔍</span> معاينة نتيجة البحث
        </p>
        <div style={{ background: "#fff", border: "1px solid #dfe1e5", borderRadius: 10, padding: "0.75rem 1rem", fontFamily: "arial, sans-serif" }}>
          <div style={{ color: "#1a0dab", fontSize: "1rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.1rem" }}>
            {previewMetaTitle}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.2rem" }}>
            <span style={{ color: "#006621", fontSize: "0.78rem" }} dir="ltr">boioot.sy{previewUrl}</span>
            <span style={{ color: "#70757a", fontSize: "0.75rem" }}>›</span>
          </div>
          <div style={{ color: "#545454", fontSize: "0.84rem", lineHeight: 1.5, display: "-webkit-box", overflow: "hidden", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {previewMetaDesc || <span style={{ color: "#aaa", fontStyle: "italic" }}>لا يوجد وصف — أضف ملخصاً للمقال</span>}
          </div>
        </div>
      </div>

      {/* ── OG Card Preview ── */}
      <div>
        <p style={{ margin: "0 0 0.45rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span>📤</span> معاينة بطاقة المشاركة (OG)
        </p>
        <div style={{ border: "1px solid #dfe1e5", borderRadius: 10, overflow: "hidden", background: "#fff", fontSize: "0.84rem" }}>
          <div style={{
            width: "100%", height: 90,
            background: coverImageUrl
              ? `url(${coverImageUrl}) center/cover no-repeat`
              : "linear-gradient(135deg, #e8f5e9, #c8e6c9)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {!coverImageUrl && <span style={{ fontSize: "1.5rem", opacity: 0.4 }}>🏠</span>}
          </div>
          <div style={{ padding: "0.6rem 0.75rem" }}>
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.72rem", color: "#888", textTransform: "uppercase" }} dir="ltr">boioot.sy</p>
            <p style={{ margin: "0 0 0.15rem", fontWeight: 700, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {previewOgTitle}
            </p>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#606060", display: "-webkit-box", overflow: "hidden", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {previewOgDesc || <span style={{ color: "#aaa", fontStyle: "italic" }}>لا يوجد وصف OG</span>}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
