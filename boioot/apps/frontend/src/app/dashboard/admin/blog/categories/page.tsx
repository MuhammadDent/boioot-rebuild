"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { blogAdminApi } from "@/features/admin/blog-api";
import { normalizeError } from "@/lib/api";
import type { BlogCategoryResponse } from "@/types";

// ── Styles ────────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.85rem", fontWeight: 600,
  marginBottom: "0.3rem", color: "var(--color-text-secondary)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.75rem", borderRadius: 8,
  border: "1.5px solid var(--color-border, #e5e7eb)", fontSize: "0.9rem",
  background: "var(--color-bg)", color: "var(--color-text-primary)", boxSizing: "border-box",
};

// ── CategoryForm ──────────────────────────────────────────────────────────────

interface CategoryFormProps {
  initial?: BlogCategoryResponse;
  onSaved: (cat: BlogCategoryResponse) => void;
  onCancel: () => void;
}

function CategoryForm({ initial, onSaved, onCancel }: CategoryFormProps) {
  const isEdit = Boolean(initial);
  const [name,        setName]        = useState(initial?.name        ?? "");
  const [slug,        setSlug]        = useState(initial?.slug        ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive,    setIsActive]    = useState(initial?.isActive    ?? true);
  const [sortOrder,   setSortOrder]   = useState(String(initial?.sortOrder ?? 0));
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("الاسم مطلوب"); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        name:        name.trim(),
        slug:        slug.trim() || undefined,
        description: description.trim() || undefined,
        isActive,
        sortOrder:   parseInt(sortOrder) || 0,
      };
      let result: BlogCategoryResponse;
      if (isEdit && initial) {
        result = await blogAdminApi.updateCategory(initial.id, payload);
      } else {
        result = await blogAdminApi.createCategory({ ...payload, isActive, sortOrder: parseInt(sortOrder) || 0 });
      }
      onSaved(result);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: "var(--color-bg)",
      border: "1.5px solid var(--color-primary)",
      borderRadius: 10,
      padding: "1.25rem",
      marginBottom: "1.25rem",
    }}>
      <h3 style={{ margin: "0 0 1rem", fontWeight: 700, fontSize: "1rem" }}>
        {isEdit ? `تعديل: ${initial!.name}` : "إضافة تصنيف جديد"}
      </h3>

      {error && (
        <div style={{ background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error)", padding: "0.65rem 0.85rem", borderRadius: 8, marginBottom: "0.85rem", fontSize: "0.88rem" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div>
            <label style={labelStyle}>الاسم *</label>
            <input required value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="أخبار عقارية" disabled={saving} />
          </div>
          <div>
            <label style={labelStyle}>Slug (اختياري — يُولَّد تلقائياً)</label>
            <input value={slug} onChange={e => setSlug(e.target.value)} style={{ ...inputStyle, fontFamily: "monospace" }} placeholder="real-estate-news" disabled={saving} dir="ltr" />
          </div>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label style={labelStyle}>الوصف</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} placeholder="وصف مختصر للتصنيف..." disabled={saving} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <div>
            <label style={labelStyle}>ترتيب العرض (رقم أصغر = أولاً)</label>
            <input type="number" min={0} value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ ...inputStyle, width: 100 }} disabled={saving} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "1.5rem" }}>
            <input type="checkbox" id="cat-active" checked={isActive} onChange={e => setIsActive(e.target.checked)} disabled={saving} style={{ width: 16, height: 16 }} />
            <label htmlFor="cat-active" style={{ ...labelStyle, marginBottom: 0, cursor: "pointer" }}>نشط (يظهر في القوائم العامة)</label>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
            {saving ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إضافة التصنيف"}
          </button>
          <button type="button" className="btn" style={{ flex: 1 }} onClick={onCancel} disabled={saving}>إلغاء</button>
        </div>
      </form>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBlogCategoriesPage() {
  const { isLoading: authLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });

  const [categories, setCategories] = useState<BlogCategoryResponse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [showForm,    setShowForm]    = useState(false);
  const [editTarget,  setEditTarget]  = useState<BlogCategoryResponse | null>(null);
  const [deleting,    setDeleting]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setFetchError("");
    try {
      const data = await blogAdminApi.getCategories();
      setCategories(data);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  function openCreate() {
    setEditTarget(null); setActionError(""); setActionSuccess(""); setShowForm(true);
  }

  function openEdit(cat: BlogCategoryResponse) {
    setEditTarget(cat); setActionError(""); setActionSuccess(""); setShowForm(true);
  }

  function closeForm() {
    setShowForm(false); setEditTarget(null);
  }

  function handleSaved(cat: BlogCategoryResponse) {
    if (editTarget) {
      setCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
      setActionSuccess(`تم تحديث تصنيف "${cat.name}" بنجاح`);
    } else {
      setCategories(prev => [...prev, cat]);
      setActionSuccess(`تم إضافة تصنيف "${cat.name}" بنجاح`);
    }
    closeForm();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`هل أنت متأكد من حذف تصنيف "${name}"؟`)) return;
    setDeleting(id); setActionError(""); setActionSuccess("");
    try {
      await blogAdminApi.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      setActionSuccess(`تم حذف التصنيف "${name}" بنجاح`);
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="dash-container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
      <DashboardBackLink href="/dashboard/admin/blog" label="→ إدارة المدونة" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>تصنيفات المدونة</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            {categories.length} تصنيف
          </p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={openCreate}>+ إضافة تصنيف</button>
        )}
      </div>

      <InlineBanner message={fetchError} />

      {actionSuccess && (
        <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem" }}>
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div style={{ background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error)", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem" }}>
          {actionError}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <CategoryForm
          initial={editTarget ?? undefined}
          onSaved={handleSaved}
          onCancel={closeForm}
        />
      )}

      {/* List */}
      {loading ? (
        <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "3rem 0" }}>جاري التحميل...</p>
      ) : categories.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-secondary)" }}>
          <p style={{ fontSize: "1.1rem" }}>لا توجد تصنيفات بعد</p>
          <button className="btn btn-primary" onClick={openCreate}>إضافة أول تصنيف</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {categories.map(cat => (
            <div
              key={cat.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: "1rem",
                padding: "0.9rem 1.1rem",
                borderRadius: 10,
                border: "1px solid var(--color-border, #e5e7eb)",
                background: "var(--color-bg)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.25rem", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>{cat.name}</p>
                  <p style={{ margin: "0.1rem 0 0", fontSize: "0.78rem", fontFamily: "monospace", color: "var(--color-text-secondary)" }}>{cat.slug}</p>
                </div>
                {cat.description && (
                  <p style={{ margin: 0, fontSize: "0.83rem", color: "var(--color-text-secondary)" }}>{cat.description}</p>
                )}
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                  {cat.isActive
                    ? <span className="badge badge-green">نشط</span>
                    : <span className="badge badge-gray">معطل</span>
                  }
                  <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                    {cat.postCount} مقال · ترتيب: {cat.sortOrder}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.4rem" }}>
                <button
                  className="btn"
                  style={{ padding: "0.3rem 0.75rem", fontSize: "0.82rem" }}
                  onClick={() => openEdit(cat)}
                  disabled={Boolean(deleting)}
                >
                  تعديل
                </button>
                <button
                  className="btn"
                  style={{ padding: "0.3rem 0.75rem", fontSize: "0.82rem", color: "var(--color-error)", borderColor: "var(--color-error)" }}
                  onClick={() => handleDelete(cat.id, cat.name)}
                  disabled={deleting === cat.id}
                >
                  {deleting === cat.id ? "..." : "حذف"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
