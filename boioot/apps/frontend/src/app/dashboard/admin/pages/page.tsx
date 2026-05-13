"use client";

import { useState, useEffect } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { staticPagesApi } from "@/features/pages/api";
import { normalizeError } from "@/lib/api";
import type { StaticPageAdmin, UpsertStaticPagePayload } from "@/features/pages/types";

const FOOTER_SECTION_LABELS: Record<string, string> = {
  support: "الدعم",
  policy:  "السياسات",
};

const BLANK_FORM: UpsertStaticPagePayload = {
  slug:              "",
  titleAr:           "",
  contentAr:         "",
  metaDescriptionAr: "",
  isActive:          true,
  showInFooter:      false,
  footerSection:     null,
  sortOrder:         0,
};

export default function AdminPagesPage() {
  const { isLoading: authLoading } = useProtectedRoute({ requiredPermission: "settings.view" });

  const [pages,      setPages]      = useState<StaticPageAdmin[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [notice,     setNotice]     = useState("");

  const [editPage,   setEditPage]   = useState<StaticPageAdmin | null>(null);
  const [form,       setForm]       = useState<UpsertStaticPagePayload>(BLANK_FORM);
  const [saving,     setSaving]     = useState(false);
  const [formError,  setFormError]  = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [deleting,   setDeleting]   = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await staticPagesApi.adminGetAll();
      setPages(data);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }

  function startEdit(page: StaticPageAdmin) {
    setEditPage(page);
    setShowCreate(false);
    setForm({
      slug:              page.slug,
      titleAr:           page.titleAr,
      contentAr:         page.contentAr ?? "",
      metaDescriptionAr: page.metaDescriptionAr ?? "",
      isActive:          page.isActive,
      showInFooter:      page.showInFooter,
      footerSection:     page.footerSection ?? null,
      sortOrder:         page.sortOrder,
    });
    setFormError("");
  }

  function startCreate() {
    setEditPage(null);
    setShowCreate(true);
    setForm(BLANK_FORM);
    setFormError("");
  }

  function cancelForm() {
    setEditPage(null);
    setShowCreate(false);
    setFormError("");
  }

  async function handleSave() {
    if (!form.slug.trim() || !form.titleAr.trim()) {
      setFormError("الرابط والعنوان حقول إجبارية");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      if (editPage) {
        const updated = await staticPagesApi.adminUpdate(editPage.id, {
          ...form,
          slug: form.slug.trim().toLowerCase(),
          contentAr: form.contentAr || null,
          metaDescriptionAr: form.metaDescriptionAr || null,
        });
        setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
        setNotice("تم حفظ التغييرات بنجاح ✓");
      } else {
        const created = await staticPagesApi.adminCreate({
          ...form,
          slug: form.slug.trim().toLowerCase(),
          contentAr: form.contentAr || null,
          metaDescriptionAr: form.metaDescriptionAr || null,
        });
        setPages(prev => [...prev, created]);
        setNotice("تمت إضافة الصفحة بنجاح ✓");
      }
      cancelForm();
    } catch (e) {
      setFormError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(page: StaticPageAdmin) {
    if (!confirm(`هل تريد حذف صفحة "${page.titleAr}"؟`)) return;
    setDeleting(page.id);
    try {
      await staticPagesApi.adminDelete(page.id);
      setPages(prev => prev.filter(p => p.id !== page.id));
      setNotice("تم الحذف بنجاح");
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setDeleting(null);
    }
  }

  if (authLoading) return null;

  const formOpen = showCreate || editPage !== null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1rem" }}>
      <DashboardBackLink href="/dashboard/admin" label="لوحة تحكم الأدمن" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 900, color: "var(--color-text-primary)", margin: 0 }}>
            إدارة الصفحات الثابتة
          </h1>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
            صفحات السياسات والدعم والمحتوى الثابت
          </p>
        </div>
        {!formOpen && (
          <button
            type="button"
            onClick={startCreate}
            style={{
              padding: "0.6rem 1.2rem", borderRadius: "var(--radius-md)",
              background: "var(--color-primary)", color: "#fff",
              border: "none", fontFamily: "inherit", fontWeight: 700,
              fontSize: "0.9rem", cursor: "pointer",
            }}
          >
            + صفحة جديدة
          </button>
        )}
      </div>

      {notice && <InlineBanner type="success" message={notice} onDismiss={() => setNotice("")} />}
      {error  && <InlineBanner type="error"   message={error}  onDismiss={() => setError("")}  />}

      {/* ── Form ── */}
      {formOpen && (
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)", padding: "1.5rem", marginBottom: "2rem",
        }}>
          <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
            {editPage ? `تعديل: ${editPage.titleAr}` : "إضافة صفحة جديدة"}
          </h2>

          {formError && <InlineBanner type="error" message={formError} onDismiss={() => setFormError("")} />}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                الرابط (slug) *
              </span>
              <input
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="مثال: privacy-policy"
                disabled={editPage?.isSystem}
                style={{
                  padding: "0.55rem 0.75rem", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)", fontSize: "0.9rem",
                  fontFamily: "inherit", background: editPage?.isSystem ? "#f8fafc" : "var(--color-surface)",
                  direction: "ltr", textAlign: "left",
                }}
              />
              {editPage?.isSystem && (
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  🔒 رابط الصفحات النظامية لا يمكن تغييره
                </span>
              )}
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                العنوان بالعربية *
              </span>
              <input
                value={form.titleAr}
                onChange={e => setForm(f => ({ ...f, titleAr: e.target.value }))}
                placeholder="مثال: سياسة الخصوصية"
                style={{
                  padding: "0.55rem 0.75rem", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)", fontSize: "0.9rem", fontFamily: "inherit",
                }}
              />
            </label>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
              وصف مختصر (meta description)
            </span>
            <input
              value={form.metaDescriptionAr ?? ""}
              onChange={e => setForm(f => ({ ...f, metaDescriptionAr: e.target.value }))}
              placeholder="وصف قصير للصفحة يظهر في نتائج البحث"
              style={{
                padding: "0.55rem 0.75rem", borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)", fontSize: "0.9rem", fontFamily: "inherit",
              }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
              المحتوى (HTML)
            </span>
            <textarea
              value={form.contentAr ?? ""}
              onChange={e => setForm(f => ({ ...f, contentAr: e.target.value }))}
              rows={8}
              placeholder="<p>محتوى الصفحة هنا...</p>"
              style={{
                padding: "0.6rem 0.75rem", borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)", fontSize: "0.88rem",
                fontFamily: "monospace", resize: "vertical", direction: "ltr", textAlign: "left",
              }}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", marginBottom: "1.25rem", alignItems: "end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                قسم الفوتر
              </span>
              <select
                value={form.footerSection ?? ""}
                onChange={e => setForm(f => ({ ...f, footerSection: e.target.value || null }))}
                style={{
                  padding: "0.55rem 0.75rem", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)", fontSize: "0.9rem", fontFamily: "inherit",
                  background: "var(--color-surface)",
                }}
              >
                <option value="">— بدون —</option>
                <option value="support">الدعم</option>
                <option value="policy">السياسات</option>
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-secondary)" }}>
                ترتيب الظهور
              </span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                style={{
                  padding: "0.55rem 0.75rem", borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)", fontSize: "0.9rem", fontFamily: "inherit",
                  direction: "ltr",
                }}
              />
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", paddingBottom: "0.1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                />
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>نشطة</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.showInFooter}
                  onChange={e => setForm(f => ({ ...f, showInFooter: e.target.checked }))}
                />
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>ظهور في الفوتر</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "0.55rem 1.2rem", borderRadius: "var(--radius-md)",
                  background: "var(--color-primary)", color: "#fff",
                  border: "none", fontFamily: "inherit", fontWeight: 700,
                  fontSize: "0.88rem", cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                style={{
                  padding: "0.55rem 0.9rem", borderRadius: "var(--radius-md)",
                  background: "transparent", color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border)", fontFamily: "inherit",
                  fontSize: "0.88rem", cursor: "pointer",
                }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <LoadingRow />
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border)", background: "var(--color-bg-secondary)" }}>
                {["الصفحة", "الرابط", "الفوتر", "الحالة", "نظامية", "إجراءات"].map(h => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.05em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                    لا توجد صفحات بعد
                  </td>
                </tr>
              )}
              {pages.map((page, idx) => (
                <tr
                  key={page.id}
                  style={{ borderBottom: "1px solid var(--color-border)", background: idx % 2 === 0 ? "var(--color-surface)" : "var(--color-bg-secondary)" }}
                >
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 700, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
                    {page.titleAr}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", color: "var(--color-text-secondary)", direction: "ltr", textAlign: "left" }}>
                    /{page.slug}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.82rem" }}>
                    {page.showInFooter && page.footerSection ? (
                      <span style={{
                        background: "#eff6ff", color: "#1d4ed8",
                        padding: "0.15rem 0.55rem", borderRadius: "999px",
                        fontSize: "0.75rem", fontWeight: 600,
                      }}>
                        {FOOTER_SECTION_LABELS[page.footerSection] ?? page.footerSection}
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)", fontSize: "0.78rem" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span style={{
                      background: page.isActive ? "#dcfce7" : "#f1f5f9",
                      color:      page.isActive ? "#15803d" : "#64748b",
                      padding: "0.15rem 0.6rem", borderRadius: "999px",
                      fontSize: "0.75rem", fontWeight: 700,
                    }}>
                      {page.isActive ? "نشطة" : "مخفية"}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", color: "var(--color-text-muted)", textAlign: "center" }}>
                    {page.isSystem ? "🔒" : "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        type="button"
                        onClick={() => startEdit(page)}
                        style={{
                          padding: "0.3rem 0.7rem", borderRadius: "var(--radius-md)",
                          border: "1px solid var(--color-border)", background: "var(--color-surface)",
                          fontSize: "0.78rem", fontFamily: "inherit", cursor: "pointer",
                          color: "var(--color-text-secondary)", fontWeight: 600,
                        }}
                      >
                        تعديل
                      </button>
                      {!page.isSystem && (
                        <button
                          type="button"
                          onClick={() => handleDelete(page)}
                          disabled={deleting === page.id}
                          style={{
                            padding: "0.3rem 0.7rem", borderRadius: "var(--radius-md)",
                            border: "1px solid #fca5a5", background: "#fff5f5",
                            fontSize: "0.78rem", fontFamily: "inherit", cursor: "pointer",
                            color: "#dc2626", fontWeight: 600,
                          }}
                        >
                          {deleting === page.id ? "..." : "حذف"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
