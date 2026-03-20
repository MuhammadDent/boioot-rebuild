"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { blogAdminApi } from "@/features/admin/blog-api";
import { BlogStatusBadge } from "./BlogStatusBadge";
import { normalizeError } from "@/lib/api";
import { tokenStorage } from "@/lib/token";
import { SEO_VARIABLES } from "@/lib/seo-resolver";
import type {
  BlogPostDetailResponse,
  BlogCategoryResponse,
  BlogSeoSettingsDto,
  SlugMode,
} from "@/types";

type SeoMode = "Auto" | "Template" | "Custom";

const RichTextEditor = dynamic(
  () => import("./RichTextEditor").then((m) => ({ default: m.RichTextEditor })),
  { ssr: false }
);

const SeoPreview = dynamic(() => import("./SeoPreview"), { ssr: false });

const ClientDate = dynamic(() => import("./ClientDate"), { ssr: false });

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
  alt: string;
  onAltChange: (alt: string) => void;
  disabled?: boolean;
}

function CoverImageField({ url, onUrlChange, alt, onAltChange, disabled }: CoverImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    setUploading(true); setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const token = tokenStorage.getToken();
      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
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

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }

  return (
    <div>
      {/* Large drop zone */}
      {url ? (
        /* Preview */
        <div style={{ position: "relative", marginBottom: "0.75rem" }}>
          <img
            src={url}
            alt="غلاف المقال"
            style={{ width: "100%", borderRadius: 10, maxHeight: 200, objectFit: "cover", display: "block" }}
            onError={e => (e.currentTarget.style.display = "none")}
          />
          <div style={{ position: "absolute", top: 8, left: 8, display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              style={{
                background: "rgba(0,0,0,0.6)", color: "#fff",
                border: "none", borderRadius: 6, padding: "0.25rem 0.6rem",
                fontSize: "0.75rem", cursor: "pointer",
              }}
            >
              تغيير
            </button>
            <button
              type="button"
              onClick={() => onUrlChange("")}
              disabled={disabled}
              style={{
                background: "rgba(0,0,0,0.6)", color: "#fff",
                border: "none", borderRadius: 6, padding: "0.25rem 0.6rem",
                fontSize: "0.75rem", cursor: "pointer",
              }}
            >
              ✕ إزالة
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            width: "100%", minHeight: 160,
            border: `2px dashed ${dragging ? "var(--color-primary)" : "var(--color-border, #d1d5db)"}`,
            borderRadius: 10,
            background: dragging ? "#f0fdf4" : "var(--color-bg-secondary, #f9fafb)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "0.5rem",
            cursor: disabled || uploading ? "default" : "pointer",
            transition: "border-color 0.15s, background 0.15s",
            marginBottom: "0.5rem",
          }}
        >
          {uploading ? (
            <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>⏳ جاري الرفع...</p>
          ) : (
            <>
              {/* Image placeholder icon */}
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={dragging ? "var(--color-primary)" : "#9ca3af"} strokeWidth="1.2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
              <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: dragging ? "var(--color-primary)" : "var(--color-text-secondary)" }}>
                انقر لرفع الصورة
              </p>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                أو اسحب وأفلت الصورة هنا · JPG، PNG، WebP (حتى 10MB)
              </p>
            </>
          )}
        </div>
      )}

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

      {/* URL fallback */}
      <input
        value={url}
        onChange={e => onUrlChange(e.target.value)}
        style={{ ...inputStyle, fontSize: "0.82rem" }}
        placeholder="أو أدخل رابط الصورة مباشرة: https://..."
        disabled={disabled || uploading}
        dir="ltr"
      />

      {/* Alt text */}
      <div style={{ marginTop: "0.5rem" }}>
        <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <span>النص البديل للغلاف (Alt Text)</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--color-text-secondary)" }}>— للـ SEO</span>
        </label>
        <input
          type="text"
          value={alt}
          onChange={e => onAltChange(e.target.value)}
          style={inputStyle}
          placeholder="مثال: صورة غلاف مقال عن العقارات في دمشق"
          disabled={disabled || uploading}
        />
      </div>

      {uploadError && (
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "var(--color-error)" }}>
          {uploadError}
        </p>
      )}
    </div>
  );
}

// ── Tags Input ────────────────────────────────────────────────────────────────

interface TagsInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

function TagsInput({ tags, onChange, disabled }: TagsInputProps) {
  const [input, setInput] = useState("");

  const addTag = useCallback((raw: string) => {
    const tag = raw.trim().replace(/^#/, "");
    if (!tag || tags.includes(tag) || tags.length >= 20) return;
    onChange([...tags, tag]);
    setInput("");
  }, [tags, onChange]);

  const removeTag = useCallback((t: string) => {
    onChange(tags.filter(x => x !== t));
  }, [tags, onChange]);

  useEffect(() => {
    if (input.endsWith(",")) {
      const raw = input.slice(0, -1);
      if (raw.trim()) addTag(raw);
      else setInput("");
    }
  }, [input, addTag]);

  return (
    <div>
      <label style={labelStyle}>
        الهاشتاغات
        <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--color-text-secondary)", marginRight: "0.4rem" }}>
          (اضغط Enter أو فاصلة للإضافة)
        </span>
      </label>

      {/* Chips */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
          {tags.map(t => (
            <span key={t} style={{
              display: "inline-flex", alignItems: "center", gap: "0.3rem",
              background: "var(--color-primary-light, #e8f5e9)",
              color: "var(--color-primary)",
              borderRadius: 20, padding: "0.22rem 0.7rem",
              fontSize: "0.82rem", fontWeight: 600,
            }}>
              #{t}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "inherit", padding: 0, lineHeight: 1,
                    fontSize: "0.9rem", opacity: 0.7,
                  }}
                  title={`إزالة #${t}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); addTag(input); }
          if (e.key === "Backspace" && !input && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
          }
        }}
        placeholder={tags.length === 0 ? "مثال: عقارات، دمشق، شقق" : "أضف هاشتاغ..."}
        disabled={disabled}
        style={{ ...inputStyle, fontSize: "0.88rem" }}
        dir="rtl"
      />
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

// ── SEO character-counter helpers ─────────────────────────────────────────────

interface SeoStatus { color: string; hint: string; pct: number; }

function getSeoTitleStatus(len: number): SeoStatus {
  if (len === 0)    return { color: "#9ca3af", hint: "أدخل العنوان",    pct: 0 };
  if (len < 40)     return { color: "#ef4444", hint: "قصير جداً",       pct: (len / 40) * 45 };
  if (len < 50)     return { color: "#f59e0b", hint: "قصير نسبياً",     pct: 45 + ((len - 40) / 10) * 20 };
  if (len <= 60)    return { color: "#22c55e", hint: "مثالي ✓",          pct: 65 + ((len - 50) / 10) * 25 };
  if (len <= 70)    return { color: "#f59e0b", hint: "طويل نسبياً",     pct: 90 + ((len - 60) / 10) * 7 };
  return             { color: "#ef4444", hint: "طويل جداً — اختصره",   pct: 100 };
}

function getSeoDescStatus(len: number): SeoStatus {
  if (len === 0)    return { color: "#9ca3af", hint: "أدخل الوصف",      pct: 0 };
  if (len < 120)    return { color: "#ef4444", hint: "قصير جداً",       pct: (len / 120) * 45 };
  if (len < 140)    return { color: "#f59e0b", hint: "قصير نسبياً",     pct: 45 + ((len - 120) / 20) * 20 };
  if (len <= 160)   return { color: "#22c55e", hint: "مثالي ✓",          pct: 65 + ((len - 140) / 20) * 25 };
  if (len <= 180)   return { color: "#f59e0b", hint: "طويل نسبياً",     pct: 90 + ((len - 160) / 20) * 7 };
  return             { color: "#ef4444", hint: "طويل جداً — اختصره",   pct: 100 };
}

function SeoCounter({
  len, max, status,
}: { len: number; max: number; status: SeoStatus }) {
  return (
    <div style={{ marginTop: "0.3rem" }}>
      <div style={{
        height: 3, background: "#e5e7eb", borderRadius: 99,
        overflow: "hidden", marginBottom: "0.22rem",
      }}>
        <div style={{
          height: "100%",
          width: `${Math.min(status.pct, 100)}%`,
          background: status.color,
          borderRadius: 99,
          transition: "width 0.25s ease, background-color 0.25s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{
          fontSize: "0.71rem", color: status.color, fontWeight: 500,
          transition: "color 0.25s ease",
        }}>
          {status.hint}
        </span>
        <span style={{
          fontSize: "0.71rem", color: status.color, fontWeight: 600,
          transition: "color 0.25s ease", fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.01em",
        }}>
          {len} / {max}
        </span>
      </div>
    </div>
  );
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
  const [coverImageAlt,  setCoverImageAlt]  = useState(initialData?.coverImageAlt  ?? "");
  const [tags,           setTags]           = useState<string[]>(initialData?.tags ?? []);
  const [isFeatured,     setIsFeatured]     = useState(initialData?.isFeatured     ?? false);
  const [seoTitle,       setSeoTitle]       = useState(initialData?.seoTitle       ?? "");
  const [seoDescription, setSeoDescription] = useState(initialData?.seoDescription ?? "");
  const [readTimeMinutes,setReadTimeMinutes]= useState(
    initialData?.readTimeMinutes != null ? String(initialData.readTimeMinutes) : ""
  );
  const [selectedCatIds, setSelectedCatIds] = useState<string[]>(
    initialData?.categories.map(c => c.id) ?? []
  );

  // ── Local categories (can grow when user adds new ones) ───────────────────
  const [localCategories, setLocalCategories] = useState<BlogCategoryResponse[]>(categories);
  const [showAddCatForm,  setShowAddCatForm]  = useState(false);
  const [newCatName,      setNewCatName]      = useState("");
  const [addingCat,       setAddingCat]       = useState(false);
  const [addCatError,     setAddCatError]     = useState("");
  const [catRequired,     setCatRequired]     = useState(false);

  const [seoMode,  setSeoMode]  = useState<SeoMode>(initialData?.seoMode ?? "Auto");
  const [ogTitle,  setOgTitle]  = useState(initialData?.ogTitle  ?? "");
  const [ogDescription, setOgDescription] = useState(initialData?.ogDescription ?? "");
  const [slugMode, setSlugMode] = useState<SlugMode>(initialData?.slugMode ?? "Auto");
  const [showVars, setShowVars] = useState(false);

  const [seoSettings,    setSeoSettings]    = useState<BlogSeoSettingsDto | null>(null);

  const [currentPost, setCurrentPost] = useState<BlogPostDetailResponse | null>(initialData ?? null);
  const currentStatus = currentPost?.status ?? "Draft";

  const [saving,    setSaving]    = useState(false);
  const [actioning, setActioning] = useState<"publish" | "unpublish" | "archive" | "delete" | null>(null);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  // ── Helpers ────────────────────────────────────────────────────────────────

  function buildPayload() {
    const isCustom = seoMode === "Custom";
    return {
      title:          title.trim(),
      slug:           slug.trim() || undefined,
      excerpt:        excerpt.trim() || undefined,
      content,
      coverImageUrl:  coverImageUrl.trim() || undefined,
      coverImageAlt:  coverImageAlt.trim() || undefined,
      tags:           tags.length > 0 ? tags : undefined,
      categoryIds:    selectedCatIds,
      isFeatured,
      seoMode,
      seoTitle:       isCustom ? (seoTitle.trim() || undefined) : undefined,
      seoDescription: isCustom ? (seoDescription.trim() || undefined) : undefined,
      ogTitle:        isCustom ? (ogTitle.trim() || undefined) : undefined,
      ogDescription:  isCustom ? (ogDescription.trim() || undefined) : undefined,
      seoTitleMode:   seoMode,
      seoDescriptionMode: seoMode,
      slugMode,
      readTimeMinutes: readTimeMinutes ? parseInt(readTimeMinutes) : undefined,
    };
  }

  function applyResult(post: BlogPostDetailResponse) {
    setCurrentPost(post);
    setSlug(post.slug);
    setSeoMode(post.seoMode ?? "Auto");
    setOgTitle(post.ogTitle ?? "");
    setOgDescription(post.ogDescription ?? "");
    setSlugMode(post.slugMode ?? "Auto");
    onSaved(post);
  }

  function toggleCategory(id: string) {
    setSelectedCatIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setCatRequired(false);
  }

  // ── Add new category inline ───────────────────────────────────────────────

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setAddingCat(true); setAddCatError("");
    try {
      const created = await blogAdminApi.createCategory({
        name: newCatName.trim(),
        isActive: true,
        sortOrder: localCategories.length,
      });
      setLocalCategories(prev => [...prev, created]);
      setSelectedCatIds(prev => [...prev, created.id]);
      setNewCatName("");
      setShowAddCatForm(false);
      setCatRequired(false);
    } catch (e) {
      setAddCatError(normalizeError(e));
    } finally {
      setAddingCat(false);
    }
  }

  // ── Publish validation ────────────────────────────────────────────────────

  function validateForPublish(): boolean {
    if (selectedCatIds.length === 0) {
      setCatRequired(true);
      setError("يجب اختيار تصنيف واحد على الأقل قبل نشر المقال.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false;
    }
    return true;
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
    if (!validateForPublish()) return;
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

  async function handleSaveAndPublish() {
    if (!validateForPublish()) return;
    setActioning("publish"); setError(""); setSuccess("");
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
      const published = await blogAdminApi.publishPost(post.id);
      applyResult(published);
      setSuccess("تم نشر المقال بنجاح ✓");
      onSaved(published);
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

  // ── Load SEO settings on mount ────────────────────────────────────────────
  useEffect(() => {
    blogAdminApi.getSeoSettings()
      .then(setSeoSettings)
      .catch(() => {});
  }, []);

  // ── SEO preview helpers (client-only — passed to SeoPreview) ────────────
  const siteName = seoSettings?.siteName ?? "بيوت";
  const firstCatName = selectedCatIds.length > 0
    ? (categories.find(c => c.id === selectedCatIds[0])?.name ?? "")
    : "";

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
            <label style={labelStyle}>
              الملخص (Excerpt)
              <span style={{
                fontSize: "0.7rem", fontWeight: 500, padding: "0.1rem 0.4rem",
                borderRadius: 4, background: "#fff3e0", color: "#e65100",
                marginRight: "0.4rem", verticalAlign: "middle",
              }}>موصى به للنشر</span>
            </label>
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
              {/* Primary save action */}
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "100%" }}>
                {saving ? "جاري الحفظ..." : isEdit ? "حفظ التغييرات" : "حفظ مسودة"}
              </button>

              {/* Publish — show for new posts AND draft edits */}
              {currentStatus !== "Published" && currentStatus !== "Archived" && (
                <>
                  {/* Publish requirements mini-checklist */}
                  <div style={{
                    fontSize: "0.75rem", padding: "0.5rem 0.6rem",
                    background: "var(--color-bg-muted, #f9fafb)",
                    border: "1px solid var(--color-border, #e5e7eb)",
                    borderRadius: 7, color: "var(--color-text-secondary)",
                  }}>
                    <p style={{ margin: "0 0 0.3rem", fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.76rem" }}>
                      متطلبات النشر:
                    </p>
                    {[
                      { label: "العنوان",            ok: title.trim().length > 0 },
                      { label: "المحتوى",            ok: content.trim().length > 0 },
                      { label: "تصنيف واحد على الأقل", ok: selectedCatIds.length > 0 },
                    ].map(({ label, ok }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginBottom: "0.15rem" }}>
                        <span style={{ color: ok ? "#22c55e" : "#ef4444", fontWeight: 700, fontSize: "0.8rem" }}>
                          {ok ? "✓" : "✗"}
                        </span>
                        <span style={{ color: ok ? "var(--color-text-primary)" : "#ef4444" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleSaveAndPublish}
                    disabled={busy}
                    style={{ width: "100%", background: "#2e7d32", borderColor: "#2e7d32", color: "#fff", fontWeight: 600 }}
                  >
                    {actioning === "publish" ? "جاري النشر..." : "نشر المقال ▶"}
                  </button>
                </>
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
                {currentPost.publishedAt && (
                  <> · نُشر <ClientDate iso={currentPost.publishedAt} /></>
                )}
              </p>
            )}
          </div>

          {/* Categories */}
          <div style={{
            ...cardStyle,
            border: catRequired
              ? "1.5px solid #ef4444"
              : "1px solid var(--color-border, #e5e7eb)",
          }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem" }}>
                التصنيفات
                <span style={{ color: "#ef4444", marginRight: "0.2rem" }}>*</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 400, color: "var(--color-text-secondary)", marginRight: "0.35rem" }}>
                  (مطلوب للنشر)
                </span>
              </p>
              <button
                type="button"
                onClick={() => { setShowAddCatForm(v => !v); setAddCatError(""); setNewCatName(""); }}
                disabled={busy}
                style={{
                  fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: 6,
                  border: "1px solid var(--color-primary)", color: "var(--color-primary)",
                  background: "transparent", cursor: busy ? "not-allowed" : "pointer",
                  fontWeight: 600, whiteSpace: "nowrap",
                }}
              >
                {showAddCatForm ? "إلغاء" : "+ تصنيف جديد"}
              </button>
            </div>

            {/* Inline add form */}
            {showAddCatForm && (
              <div
                style={{
                  marginBottom: "0.75rem", padding: "0.6rem 0.75rem",
                  background: "var(--color-bg-muted, #f9fafb)",
                  borderRadius: 8, border: "1px solid var(--color-border, #e5e7eb)",
                }}
              >
                <label style={{ ...labelStyle, marginBottom: "0.3rem" }}>اسم التصنيف الجديد</label>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <input
                    autoFocus
                    value={newCatName}
                    onChange={e => { setNewCatName(e.target.value); setAddCatError(""); }}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleAddCategory(); } }}
                    placeholder="مثال: نصائح عقارية"
                    disabled={addingCat}
                    style={{ ...inputStyle, fontSize: "0.88rem", flex: 1 }}
                    dir="rtl"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddCategory()}
                    disabled={addingCat || !newCatName.trim()}
                    style={{
                      padding: "0.4rem 0.9rem", borderRadius: 7, border: "none",
                      background: "var(--color-primary)", color: "#fff",
                      fontWeight: 600, fontSize: "0.85rem",
                      cursor: (addingCat || !newCatName.trim()) ? "not-allowed" : "pointer",
                      opacity: (addingCat || !newCatName.trim()) ? 0.6 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {addingCat ? "..." : "إضافة"}
                  </button>
                </div>
                {addCatError && (
                  <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "#ef4444" }}>{addCatError}</p>
                )}
              </div>
            )}

            {/* Category list */}
            {localCategories.length === 0 && !showAddCatForm ? (
              <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", margin: 0 }}>
                لا توجد تصنيفات — أضف تصنيفاً من الزر أعلاه.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {localCategories.map(cat => (
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

            {/* Required validation message */}
            {catRequired && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#ef4444", fontWeight: 500 }}>
                ⚠ يجب اختيار تصنيف واحد على الأقل
              </p>
            )}
          </div>

          {/* Tags */}
          <div style={cardStyle}>
            <TagsInput tags={tags} onChange={setTags} disabled={busy} />
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

            <div style={{ marginBottom: "0.3rem" }}>
              <label style={labelStyle}>
                صورة الغلاف
                <span style={{
                  fontSize: "0.7rem", fontWeight: 500, padding: "0.1rem 0.4rem",
                  borderRadius: 4, background: "#fff3e0", color: "#e65100",
                  marginRight: "0.4rem", verticalAlign: "middle",
                }}>موصى به للنشر</span>
              </label>
            </div>
            <CoverImageField
              url={coverImageUrl}
              onUrlChange={setCoverImageUrl}
              alt={coverImageAlt}
              onAltChange={setCoverImageAlt}
              disabled={busy}
            />
          </div>

          {/* SEO */}
          <div style={cardStyle}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem" }}>تحسين محركات البحث (SEO)</p>
              <a href="/dashboard/admin/blog/seo-settings" target="_blank" style={{ fontSize: "0.75rem", color: "var(--color-primary)" }}>
                إعدادات عامة ⚙
              </a>
            </div>

            {/* ── Slug / URL ── */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>رابط الصفحة (Slug)</label>
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  {(["Auto", "Custom"] as const).map(m => (
                    <button key={m} type="button"
                      onClick={() => { setSlugMode(m); if (m === "Auto") setSlug(""); }}
                      disabled={busy || (m === "Custom" && isPublished)}
                      style={{
                        fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: 4, cursor: "pointer", border: "1px solid",
                        borderColor: slugMode === m ? "var(--color-primary)" : "var(--color-border, #e5e7eb)",
                        background: slugMode === m ? "var(--color-primary)" : "transparent",
                        color: slugMode === m ? "#fff" : "var(--color-text-secondary)",
                        opacity: (m === "Custom" && isPublished) ? 0.5 : 1,
                      }}>
                      {m === "Auto" ? "تلقائي" : "مخصص"}
                    </button>
                  ))}
                </div>
              </div>
              {slugMode === "Custom" ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>/blog/</span>
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
              ) : (
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-text-secondary)", fontFamily: "monospace", padding: "0.4rem 0.6rem", background: "var(--color-bg-muted, #f9fafb)", borderRadius: 6 }} dir="ltr">
                  /blog/{slug || <em style={{ color: "#aaa" }}>يُولَّد من العنوان</em>}
                </p>
              )}
              {isPublished && <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "var(--color-warning, #b45309)" }}>الرابط مقفل بعد النشر</p>}
            </div>

            {/* ── Unified SEO Mode selector ── */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ ...labelStyle, marginBottom: "0.4rem" }}>وضع الـ SEO</label>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--color-border, #e5e7eb)" }}>
                {([
                  { value: "Auto",     ar: "تلقائي",  hint: "يُولَّد من العنوان والملخص" },
                  { value: "Template", ar: "قالب",     hint: "يستخدم قوالب الموقع" },
                  { value: "Custom",   ar: "مخصص",    hint: "حقول مخصصة لكل مقال" },
                ] as const).map(({ value, ar, hint }, i) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSeoMode(value)}
                    disabled={busy}
                    title={hint}
                    style={{
                      flex: 1,
                      padding: "0.45rem 0",
                      fontSize: "0.82rem",
                      fontWeight: seoMode === value ? 700 : 400,
                      border: "none",
                      borderRight: i < 2 ? "1.5px solid var(--color-border, #e5e7eb)" : "none",
                      background: seoMode === value ? "var(--color-primary)" : "transparent",
                      color: seoMode === value ? "#fff" : "var(--color-text-secondary)",
                      cursor: busy ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {ar}
                  </button>
                ))}
              </div>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.74rem", color: "var(--color-text-secondary)" }}>
                {seoMode === "Auto" && "سيُولَّد العنوان والوصف تلقائياً من بيانات المقال."}
                {seoMode === "Template" && "سيُستخدم القالب العالمي مع استبدال المتغيرات تلقائياً."}
                {seoMode === "Custom" && "يمكنك تحديد عنوان ووصف مخصص لكل حقل."}
              </p>
            </div>

            {/* ── Template mode: show active templates ── */}
            {seoMode === "Template" && (
              <div style={{
                background: "var(--color-bg-muted, #f9fafb)",
                border: "1px solid var(--color-border, #e5e7eb)",
                borderRadius: 8, padding: "0.6rem 0.75rem", marginBottom: "1rem",
                fontSize: "0.78rem", color: "var(--color-text-secondary)",
              }}>
                <p style={{ margin: "0 0 0.3rem", fontWeight: 600 }}>القوالب النشطة:</p>
                <p style={{ margin: "0 0 0.2rem", fontFamily: "monospace" }}>
                  <span style={{ color: "#888" }}>عنوان: </span>
                  {seoSettings?.defaultPostSeoTitleTemplate ?? "{PostTitle} | {SiteName}"}
                </p>
                <p style={{ margin: "0 0 0.2rem", fontFamily: "monospace" }}>
                  <span style={{ color: "#888" }}>وصف: </span>
                  {seoSettings?.defaultPostSeoDescriptionTemplate ?? "{Excerpt}"}
                </p>
                <p style={{ margin: "0 0 0.2rem", fontFamily: "monospace" }}>
                  <span style={{ color: "#888" }}>OG عنوان: </span>
                  {seoSettings?.defaultOgTitleTemplate ?? "{PostTitle} | {SiteName}"}
                </p>
                <p style={{ margin: 0, fontFamily: "monospace" }}>
                  <span style={{ color: "#888" }}>OG وصف: </span>
                  {seoSettings?.defaultOgDescriptionTemplate ?? "{Excerpt}"}
                </p>
              </div>
            )}

            {/* ── Custom mode: 4 input fields ── */}
            {seoMode === "Custom" && (
              <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Meta Title */}
                {(() => { const s = getSeoTitleStatus(seoTitle.length); return (
                <div>
                  <label style={labelStyle}>
                    عنوان Meta
                    <span style={{ fontWeight: 400, fontSize: "0.72rem", marginRight: "0.3rem", color: "var(--color-text-secondary)" }}>(يظهر في نتائج البحث)</span>
                  </label>
                  <input
                    value={seoTitle}
                    onChange={e => setSeoTitle(e.target.value)}
                    style={{ ...inputStyle, borderColor: seoTitle.length > 0 ? s.color : undefined, transition: "border-color 0.25s ease" }}
                    placeholder={`مثال: ${title || "عنوان المقال"} | ${siteName}`}
                    disabled={busy}
                  />
                  <SeoCounter len={seoTitle.length} max={60} status={s} />
                </div>
                ); })()}

                {/* Meta Description */}
                {(() => { const s = getSeoDescStatus(seoDescription.length); return (
                <div>
                  <label style={labelStyle}>
                    وصف Meta
                    <span style={{ fontWeight: 400, fontSize: "0.72rem", marginRight: "0.3rem", color: "var(--color-text-secondary)" }}>(يظهر في نتائج البحث)</span>
                  </label>
                  <textarea
                    value={seoDescription}
                    onChange={e => setSeoDescription(e.target.value)}
                    style={{ ...inputStyle, minHeight: 65, resize: "vertical", borderColor: seoDescription.length > 0 ? s.color : undefined, transition: "border-color 0.25s ease" }}
                    placeholder={excerpt || "وصف مختصر يظهر في نتائج البحث..."}
                    disabled={busy}
                  />
                  <SeoCounter len={seoDescription.length} max={160} status={s} />
                </div>
                ); })()}

                {/* OG Title */}
                {(() => { const s = getSeoTitleStatus(ogTitle.length); return (
                <div>
                  <label style={labelStyle}>
                    عنوان OG
                    <span style={{ fontWeight: 400, fontSize: "0.72rem", marginRight: "0.3rem", color: "var(--color-text-secondary)" }}>(يظهر عند المشاركة)</span>
                  </label>
                  <input
                    value={ogTitle}
                    onChange={e => setOgTitle(e.target.value)}
                    style={{ ...inputStyle, borderColor: ogTitle.length > 0 ? s.color : undefined, transition: "border-color 0.25s ease" }}
                    placeholder="سيُستخدم عنوان Meta كقيمة افتراضية"
                    disabled={busy}
                  />
                  <SeoCounter len={ogTitle.length} max={60} status={s} />
                </div>
                ); })()}

                {/* OG Description */}
                {(() => { const s = getSeoDescStatus(ogDescription.length); return (
                <div>
                  <label style={labelStyle}>
                    وصف OG
                    <span style={{ fontWeight: 400, fontSize: "0.72rem", marginRight: "0.3rem", color: "var(--color-text-secondary)" }}>(يظهر عند المشاركة)</span>
                  </label>
                  <textarea
                    value={ogDescription}
                    onChange={e => setOgDescription(e.target.value)}
                    style={{ ...inputStyle, minHeight: 65, resize: "vertical", borderColor: ogDescription.length > 0 ? s.color : undefined, transition: "border-color 0.25s ease" }}
                    placeholder="سيُستخدم وصف Meta كقيمة افتراضية"
                    disabled={busy}
                  />
                  <SeoCounter len={ogDescription.length} max={160} status={s} />
                </div>
                ); })()}
              </div>
            )}

            {/* ── Variables helper (collapsible) ── */}
            {seoMode !== "Auto" && (
              <div style={{ marginBottom: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowVars(v => !v)}
                  style={{
                    background: "none", border: "none", padding: 0, cursor: "pointer",
                    fontSize: "0.75rem", color: "var(--color-primary)", fontWeight: 600,
                    display: "flex", alignItems: "center", gap: "0.3rem",
                  }}
                >
                  <span>{showVars ? "▲" : "▼"}</span>
                  المتغيرات المتاحة
                </button>
                {showVars && (
                  <div style={{
                    marginTop: "0.4rem",
                    background: "var(--color-bg-muted, #f9fafb)",
                    border: "1px solid var(--color-border, #e5e7eb)",
                    borderRadius: 8, padding: "0.6rem 0.75rem",
                  }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {SEO_VARIABLES.map(({ key, label }) => (
                        <span
                          key={key}
                          title={label}
                          style={{
                            background: "#e8f5e9", color: "var(--color-primary)",
                            borderRadius: 4, padding: "0.18rem 0.45rem",
                            fontSize: "0.72rem", fontFamily: "monospace",
                            cursor: "help", fontWeight: 600,
                          }}
                        >
                          {key}
                        </span>
                      ))}
                    </div>
                    <p style={{ margin: "0.4rem 0 0", fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>
                      مرّر على المتغير لرؤية معناه. يمكن استخدام هذه المتغيرات في القوالب العالمية.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── SEO Preview (client-only, no SSR) ── */}
            <SeoPreview
              seoMode={seoMode}
              title={title}
              excerpt={excerpt}
              seoTitle={seoTitle}
              seoDescription={seoDescription}
              ogTitle={ogTitle}
              ogDescription={ogDescription}
              seoSettings={seoSettings}
              previewUrl={`/blog/${slug || "url-slug"}`}
              coverImageUrl={coverImageUrl}
              firstCatName={firstCatName}
            />
          </div>

        </div>
      </div>
    </form>
  );
}
