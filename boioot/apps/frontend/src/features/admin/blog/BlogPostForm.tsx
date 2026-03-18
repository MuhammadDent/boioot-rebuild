"use client";

import { useState } from "react";
import { blogAdminApi } from "@/features/admin/blog-api";
import { BlogStatusBadge } from "./BlogStatusBadge";
import { normalizeError } from "@/lib/api";
import type { BlogPostDetailResponse, BlogCategoryResponse } from "@/types";

// ── Shared input styles (mirror plans page) ───────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.85rem", fontWeight: 600,
  marginBottom: "0.3rem", color: "var(--color-text-secondary)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.75rem", borderRadius: 8,
  border: "1.5px solid var(--color-border, #e5e7eb)", fontSize: "0.95rem",
  background: "var(--color-bg)", color: "var(--color-text-primary)",
  boxSizing: "border-box",
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-bg)",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: 10,
  padding: "1rem 1.25rem",
  marginBottom: "1rem",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface BlogPostFormProps {
  /** Present for edit, absent for create */
  postId?: string;
  initialData?: BlogPostDetailResponse;
  categories: BlogCategoryResponse[];
  /** Called after any successful save/publish/unpublish/archive */
  onSaved: (post: BlogPostDetailResponse) => void;
  /** Called after successful delete */
  onDeleted?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BlogPostForm({
  postId,
  initialData,
  categories,
  onSaved,
  onDeleted,
}: BlogPostFormProps) {
  const isEdit = Boolean(postId);
  const isPublished = initialData?.status === "Published";

  // Main content fields
  const [title,   setTitle]   = useState(initialData?.title   ?? "");
  const [slug,    setSlug]    = useState(initialData?.slug    ?? "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");

  // Sidebar fields
  const [coverImageUrl,   setCoverImageUrl]   = useState(initialData?.coverImageUrl   ?? "");
  const [isFeatured,      setIsFeatured]      = useState(initialData?.isFeatured      ?? false);
  const [seoTitle,        setSeoTitle]        = useState(initialData?.seoTitle        ?? "");
  const [seoDescription,  setSeoDescription]  = useState(initialData?.seoDescription  ?? "");
  const [readTimeMinutes, setReadTimeMinutes] = useState(
    initialData?.readTimeMinutes != null ? String(initialData.readTimeMinutes) : ""
  );
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>(
    initialData?.categories.map(c => c.id) ?? []
  );

  // Current post state (updated after server actions)
  const [currentPost, setCurrentPost] = useState<BlogPostDetailResponse | null>(
    initialData ?? null
  );
  const currentStatus = currentPost?.status ?? "Draft";

  // Action states
  const [saving,     setSaving]     = useState(false);
  const [actioning,  setActioning]  = useState<"publish" | "unpublish" | "archive" | "delete" | null>(null);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");

  // ── Helpers ────────────────────────────────────────────────────────────────

  function buildPayload() {
    return {
      title:           title.trim(),
      slug:            slug.trim() || undefined,
      excerpt:         excerpt.trim() || undefined,
      content:         content.trim(),
      coverImageUrl:   coverImageUrl.trim() || undefined,
      categoryIds:     selectedCatIds,
      isFeatured,
      seoTitle:        seoTitle.trim() || undefined,
      seoDescription:  seoDescription.trim() || undefined,
      readTimeMinutes: readTimeMinutes ? parseInt(readTimeMinutes) : undefined,
    };
  }

  function applyResult(post: BlogPostDetailResponse) {
    setCurrentPost(post);
    // Sync slug in case server adjusted it
    setSlug(post.slug);
    onSaved(post);
  }

  function toggleCategory(id: string) {
    setSelectedCatIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      let post: BlogPostDetailResponse;
      if (isEdit && postId) {
        post = await blogAdminApi.updatePost(postId, buildPayload());
      } else {
        post = await blogAdminApi.createPost({
          ...buildPayload(),
          title: title.trim(),
          content: content.trim(),
          categoryIds: selectedCatIds,
          isFeatured,
        });
      }
      applyResult(post);
      setSuccess("تم حفظ المسودة بنجاح");
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!currentPost?.id) return;
    // Save first if there are unsaved changes
    setActioning("publish"); setError(""); setSuccess("");
    try {
      // Update then publish in sequence
      const updated = await blogAdminApi.updatePost(currentPost.id, buildPayload());
      const published = await blogAdminApi.publishPost(updated.id);
      applyResult(published);
      setSuccess("تم نشر المقال بنجاح");
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setActioning(null);
    }
  }

  async function handleUnpublish() {
    if (!currentPost?.id) return;
    setActioning("unpublish"); setError(""); setSuccess("");
    try {
      const post = await blogAdminApi.unpublishPost(currentPost.id);
      applyResult(post);
      setSuccess("تم إرجاع المقال إلى المسودة");
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setActioning(null);
    }
  }

  async function handleArchive() {
    if (!currentPost?.id) return;
    if (!confirm("هل تريد أرشفة هذا المقال؟ لن يظهر للزوار بعد الأرشفة.")) return;
    setActioning("archive"); setError(""); setSuccess("");
    try {
      const post = await blogAdminApi.archivePost(currentPost.id);
      applyResult(post);
      setSuccess("تم أرشفة المقال");
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setActioning(null);
    }
  }

  async function handleDelete() {
    if (!currentPost?.id) return;
    if (!confirm("هل أنت متأكد من حذف هذا المقال؟ لا يمكن التراجع.")) return;
    setActioning("delete"); setError("");
    try {
      await blogAdminApi.deletePost(currentPost.id);
      onDeleted?.();
    } catch (e) {
      setError(normalizeError(e));
      setActioning(null);
    }
  }

  const busy = saving || actioning !== null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSaveDraft} style={{ width: "100%" }}>
      {/* Error / Success */}
      {error && (
        <div style={{
          background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error, #c62828)",
          padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem",
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          background: "#e8f5e9", color: "#2e7d32",
          padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem",
        }}>
          {success}
        </div>
      )}

      {/* Two-column layout: main content + sidebar */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gap: "1.25rem",
        alignItems: "start",
      }}>

        {/* ── MAIN CONTENT AREA ───────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Title */}
          <div style={cardStyle}>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>العنوان *</label>
              <input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ ...inputStyle, fontSize: "1.1rem", fontWeight: 600 }}
                placeholder="عنوان المقال..."
                disabled={busy}
              />
            </div>

            {/* Slug — read-only when Published */}
            <div>
              <label style={labelStyle}>
                الـ Slug
                {isPublished && (
                  <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginRight: "0.4rem" }}>
                    (مقفل — المقال منشور)
                  </span>
                )}
              </label>
              <input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                style={{
                  ...inputStyle,
                  fontFamily: "monospace",
                  background: isPublished ? "var(--color-bg-secondary, #f9fafb)" : "var(--color-bg)",
                  color: isPublished ? "var(--color-text-secondary)" : "var(--color-text-primary)",
                }}
                placeholder="سيُولَّد تلقائياً من العنوان إذا تُرك فارغاً"
                readOnly={isPublished}
                disabled={busy}
                dir="ltr"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div style={cardStyle}>
            <label style={labelStyle}>الملخص (Excerpt)</label>
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              placeholder="وصف مختصر يظهر في قوائم المقالات..."
              disabled={busy}
            />
          </div>

          {/* Content */}
          <div style={cardStyle}>
            <label style={labelStyle}>المحتوى *</label>
            <textarea
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{ ...inputStyle, minHeight: 450, resize: "vertical", lineHeight: 1.7, fontFamily: "inherit" }}
              placeholder="اكتب محتوى المقال هنا..."
              disabled={busy}
            />
          </div>

        </div>

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Actions card */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem" }}>الحالة والإجراءات</p>
              {currentPost && <BlogStatusBadge status={currentStatus} />}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {/* Save Draft — always shown */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy}
                style={{ width: "100%" }}
              >
                {saving ? "جاري الحفظ..." : isEdit ? "حفظ التغييرات" : "حفظ المسودة"}
              </button>

              {/* Publish — shown when Draft or Archived (via unpublish first) */}
              {(currentStatus === "Draft") && isEdit && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handlePublish}
                  disabled={busy}
                  style={{ width: "100%", background: "#2e7d32", borderColor: "#2e7d32" }}
                >
                  {actioning === "publish" ? "جاري النشر..." : "نشر المقال"}
                </button>
              )}

              {/* Unpublish — shown when Published */}
              {currentStatus === "Published" && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleUnpublish}
                  disabled={busy}
                  style={{ width: "100%" }}
                >
                  {actioning === "unpublish" ? "جاري الإرجاع..." : "إلغاء النشر (→ مسودة)"}
                </button>
              )}

              {/* Archive — shown when Draft or Published */}
              {(currentStatus === "Draft" || currentStatus === "Published") && isEdit && (
                <button
                  type="button"
                  className="btn"
                  onClick={handleArchive}
                  disabled={busy}
                  style={{ width: "100%", color: "var(--color-warning, #f57f17)", borderColor: "var(--color-warning, #f57f17)" }}
                >
                  {actioning === "archive" ? "جاري الأرشفة..." : "أرشفة"}
                </button>
              )}

              {/* Delete — shown in edit mode only */}
              {isEdit && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={busy}
                  style={{ width: "100%", marginTop: "0.25rem" }}
                >
                  {actioning === "delete" ? "جاري الحذف..." : "حذف نهائياً"}
                </button>
              )}
            </div>

            {/* View count info */}
            {currentPost && (
              <p style={{ margin: "0.75rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                {currentPost.viewCount} مشاهدة
                {currentPost.publishedAt && ` · نُشر ${new Date(currentPost.publishedAt).toLocaleDateString("ar-SY")}`}
              </p>
            )}
          </div>

          {/* Categories */}
          <div style={cardStyle}>
            <p style={{ margin: "0 0 0.75rem", fontWeight: 700, fontSize: "0.92rem" }}>التصنيفات</p>
            {categories.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", margin: 0 }}>
                لا توجد تصنيفات. أضف تصنيفات من{" "}
                <a href="/dashboard/admin/blog/categories" style={{ color: "var(--color-primary)" }}>
                  صفحة التصنيفات
                </a>.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {categories.map(cat => (
                  <label key={cat.id} style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    fontSize: "0.9rem", cursor: "pointer",
                    opacity: !cat.isActive ? 0.5 : 1,
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedCatIds.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      disabled={busy}
                    />
                    {cat.name}
                    {!cat.isActive && <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>(معطل)</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Featured + Cover Image */}
          <div style={cardStyle}>
            <p style={{ margin: "0 0 0.75rem", fontWeight: 700, fontSize: "0.92rem" }}>الإعدادات</p>

            <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={e => setIsFeatured(e.target.checked)}
                disabled={busy}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>مقال مميز ⭐</span>
            </label>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>وقت القراءة (دقائق)</label>
              <input
                type="number"
                min={0}
                value={readTimeMinutes}
                onChange={e => setReadTimeMinutes(e.target.value)}
                style={{ ...inputStyle, width: 100 }}
                placeholder="5"
                disabled={busy}
              />
            </div>

            <div>
              <label style={labelStyle}>رابط صورة الغلاف</label>
              <input
                value={coverImageUrl}
                onChange={e => setCoverImageUrl(e.target.value)}
                style={{ ...inputStyle, fontSize: "0.85rem" }}
                placeholder="https://..."
                disabled={busy}
                dir="ltr"
              />
              {coverImageUrl && (
                <img
                  src={coverImageUrl}
                  alt="غلاف المقال"
                  style={{ marginTop: "0.5rem", width: "100%", borderRadius: 6, maxHeight: 140, objectFit: "cover" }}
                  onError={e => (e.currentTarget.style.display = "none")}
                />
              )}
            </div>
          </div>

          {/* SEO */}
          <div style={cardStyle}>
            <p style={{ margin: "0 0 0.75rem", fontWeight: 700, fontSize: "0.92rem" }}>تحسين محركات البحث (SEO)</p>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>عنوان SEO</label>
              <input
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value)}
                style={inputStyle}
                placeholder="اختياري — يُعرض في نتائج البحث"
                disabled={busy}
              />
            </div>

            <div>
              <label style={labelStyle}>وصف SEO</label>
              <textarea
                value={seoDescription}
                onChange={e => setSeoDescription(e.target.value)}
                style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                placeholder="وصف مختصر لنتائج البحث (150–160 حرفاً مثالياً)"
                disabled={busy}
              />
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: seoDescription.length > 160 ? "var(--color-error)" : "var(--color-text-secondary)" }}>
                {seoDescription.length} / 160 حرف
              </p>
            </div>
          </div>

        </div>
      </div>
    </form>
  );
}
