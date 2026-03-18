"use client";

import { useState, useRef } from "react";
import { blogAdminApi } from "@/features/admin/blog-api";
import { BlogStatusBadge } from "./BlogStatusBadge";
import { RichTextEditor } from "./RichTextEditor";
import { normalizeError } from "@/lib/api";
import type { BlogPostDetailResponse, BlogCategoryResponse } from "@/types";

// ── Shared input styles ────────────────────────────────────────────────────────

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

// ── Cover Image Upload ────────────────────────────────────────────────────────

interface CoverImageFieldProps {
  url: string;
  onUrlChange: (url: string) => void;
  disabled?: boolean;
}

function CoverImageField({ url, onUrlChange, disabled }: CoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFile(file: File) {
    setUploading(true); setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "فشل رفع الصورة");
      }
      const data = await res.json() as { url: string };
      onUrlChange(data.url);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label style={labelStyle}>صورة الغلاف</label>

      {/* Preview */}
      {url && (
        <div style={{ position: "relative", marginBottom: "0.75rem" }}>
          <img
            src={url}
            alt="غلاف المقال"
            style={{ width: "100%", borderRadius: 8, maxHeight: 160, objectFit: "cover" }}
            onError={e => (e.currentTarget.style.display = "none")}
          />
          <button
            type="button"
            onClick={() => onUrlChange("")}
            disabled={disabled}
            style={{
              position: "absolute", top: 6, left: 6,
              background: "rgba(0,0,0,0.55)", color: "#fff",
              border: "none", borderRadius: 6, padding: "0.2rem 0.5rem",
              fontSize: "0.75rem", cursor: "pointer",
            }}
          >
            ✕ إزالة
          </button>
        </div>
      )}

      {/* Upload from device */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        style={{
          width: "100%", padding: "0.6rem", borderRadius: 8,
          border: "1.5px dashed var(--color-border, #e5e7eb)",
          background: "var(--color-bg-secondary, #f9fafb)",
          cursor: disabled || uploading ? "default" : "pointer",
          fontSize: "0.85rem", color: "var(--color-text-secondary)",
          marginBottom: "0.5rem",
        }}
      >
        {uploading ? "⏳ جاري الرفع..." : "📁 رفع صورة من الجهاز"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {/* Manual URL fallback */}
      <input
        value={url}
        onChange={e => onUrlChange(e.target.value)}
        style={{ ...inputStyle, fontSize: "0.82rem" }}
        placeholder="أو أدخل رابط الصورة: https://..."
        disabled={disabled || uploading}
        dir="ltr"
      />

      {uploadError && (
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "var(--color-error)" }}>
          {uploadError}
        </p>
      )}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface BlogPostFormProps {
  postId?: string;
  initialData?: BlogPostDetailResponse;
  categories: BlogCategoryResponse[];
  onSaved: (post: BlogPostDetailResponse) => void;
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

  const [title,          setTitle]          = useState(initialData?.title          ?? "");
  const [slug,           setSlug]           = useState(initialData?.slug           ?? "");
  const [excerpt,        setExcerpt]        = useState(initialData?.excerpt        ?? "");
  const [content,        setContent]        = useState(initialData?.content        ?? "");
  const [coverImageUrl,  setCoverImageUrl]  = useState(initialData?.coverImageUrl  ?? "");
  const [isFeatured,     setIsFeatured]     = useState(initialData?.isFeatured     ?? false);
  const [seoTitle,       setSeoTitle]       = useState(initialData?.seoTitle       ?? "");
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription ?? "");
  const [readTimeMinutes,setReadTimeMinutes]= useState(
    initialData?.readTimeMinutes != null ? String(initialData.readTimeMinutes) : ""
  );
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>(
    initialData?.categories.map(c => c.id) ?? []
  );

  const [currentPost, setCurrentPost] = useState<BlogPostDetailResponse | null>(initialData ?? null);
  const currentStatus = currentPost?.status ?? "Draft";

  const [saving,    setSaving]    = useState(false);
  const [actioning, setActioning] = useState<"publish" | "unpublish" | "archive" | "delete" | null>(null);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  // ── Helpers ────────────────────────────────────────────────────────────────

  function buildPayload() {
    return {
      title:           title.trim(),
      slug:            slug.trim() || undefined,
      excerpt:         excerpt.trim() || undefined,
      content:         content,
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
          content,
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
    setActioning("publish"); setError(""); setSuccess("");
    try {
      const updated = await blogAdminApi.updatePost(currentPost.id, buildPayload());
      const published = await blogAdminApi.publishPost(updated.id);
      applyResult(published);
      setSuccess("تم نشر المقال بنجاح ✓");
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
      {/* Banners */}
      {error && (
        <div style={{ background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error, #c62828)", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem" }}>
          {success}
        </div>
      )}

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.25rem", alignItems: "start" }}>

        {/* ── MAIN CONTENT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Title + Slug */}
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
            <div>
              <label style={labelStyle}>
                الـ Slug (رابط المقال)
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
                  ...inputStyle, fontFamily: "monospace",
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

          {/* Rich Text Content */}
          <div style={cardStyle}>
            <label style={{ ...labelStyle, marginBottom: "0.6rem" }}>المحتوى *</label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="اكتب محتوى المقال هنا..."
              disabled={busy}
              minHeight={450}
            />
          </div>

        </div>

        {/* ── SIDEBAR ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Actions */}
          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem" }}>الحالة والإجراءات</p>
              {currentPost && <BlogStatusBadge status={currentStatus} />}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
                {saving ? "جاري الحفظ..." : isEdit ? "حفظ التغييرات" : "حفظ المسودة"}
              </button>
              {currentStatus === "Draft" && isEdit && (
                <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={busy} style={{ width: "100%", background: "#2e7d32", borderColor: "#2e7d32" }}>
                  {actioning === "publish" ? "جاري النشر..." : "نشر المقال"}
                </button>
              )}
              {currentStatus === "Published" && (
                <button type="button" className="btn" onClick={handleUnpublish} disabled={busy} style={{ width: "100%" }}>
                  {actioning === "unpublish" ? "جاري الإرجاع..." : "إلغاء النشر (→ مسودة)"}
                </button>
              )}
              {(currentStatus === "Draft" || currentStatus === "Published") && isEdit && (
                <button type="button" className="btn" onClick={handleArchive} disabled={busy} style={{ width: "100%", color: "#f57f17", borderColor: "#f57f17" }}>
                  {actioning === "archive" ? "جاري الأرشفة..." : "أرشفة"}
                </button>
              )}
              {isEdit && (
                <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={busy} style={{ width: "100%", marginTop: "0.25rem" }}>
                  {actioning === "delete" ? "جاري الحذف..." : "حذف نهائياً"}
                </button>
              )}
            </div>

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
                لا توجد تصنيفات.{" "}
                <a href="/dashboard/admin/blog/categories" style={{ color: "var(--color-primary)" }}>أضف تصنيفات</a>
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {categories.map(cat => (
                  <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", cursor: "pointer", opacity: !cat.isActive ? 0.5 : 1 }}>
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

          {/* Cover Image + Settings */}
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

            <CoverImageField
              url={coverImageUrl}
              onUrlChange={setCoverImageUrl}
              disabled={busy}
            />
          </div>

          {/* SEO */}
          <div style={cardStyle}>
            <p style={{ margin: "0 0 0.75rem", fontWeight: 700, fontSize: "0.92rem" }}>تحسين محركات البحث (SEO)</p>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>
                عنوان الصفحة (Page Title)
              </label>
              <input
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value)}
                style={inputStyle}
                placeholder={title || "اختياري — يُعرض في نتائج البحث"}
                disabled={busy}
              />
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: seoTitle.length > 60 ? "var(--color-error)" : "var(--color-text-secondary)" }}>
                {seoTitle.length} / 60 حرف
              </p>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>رابط الصفحة (SEO URL)</label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                  /blog/
                </span>
                <input
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  style={{ ...inputStyle, fontFamily: "monospace", fontSize: "0.82rem" }}
                  placeholder="url-slug"
                  readOnly={isPublished}
                  disabled={busy}
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>وصف الصفحة (Page Description)</label>
              <textarea
                value={seoDescription}
                onChange={e => setSeoDescription(e.target.value)}
                style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                placeholder={excerpt || "وصف مختصر لنتائج البحث (150–160 حرفاً مثالياً)"}
                disabled={busy}
              />
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: seoDescription.length > 160 ? "var(--color-error)" : "var(--color-text-secondary)" }}>
                {seoDescription.length} / 160 حرف
              </p>
            </div>
          </div>

        </div>
      </div>
    </form>
  );
}
