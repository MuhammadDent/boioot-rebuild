"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { api, normalizeError } from "@/lib/api";
import { adminApi } from "@/features/admin/api";
import { RefBadge } from "@/features/admin/RefBadge";
import type { PagedResult } from "@/types";

// ─── Edit modal ───────────────────────────────────────────────────────────────
const PROPERTY_TYPE_OPTS: { value: string; label: string }[] = [
  { value: "Apartment", label: "شقة سكنية" },
  { value: "Villa",     label: "فيلا" },
  { value: "Office",    label: "مكتب" },
  { value: "Shop",      label: "محل تجاري" },
  { value: "Land",      label: "أرض" },
  { value: "Building",  label: "بناء كامل" },
];

interface EditForm {
  title: string;
  description: string;
  propertyType: string;
  city: string;
  neighborhood: string;
}

function EditRequestModal({
  request,
  onClose,
  onSaved,
}: {
  request: BuyerRequest;
  onClose: () => void;
  onSaved: (updated: Partial<BuyerRequest>) => void;
}) {
  const [form, setForm] = useState<EditForm>({
    title:        request.title,
    description:  request.description,
    propertyType: request.propertyType,
    city:         request.city ?? "",
    neighborhood: request.neighborhood ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function handleSave() {
    if (!form.title.trim()) { setError("العنوان مطلوب"); return; }
    setSaving(true); setError("");
    try {
      await adminApi.adminUpdateBuyerRequest(request.id, {
        title:        form.title.trim(),
        description:  form.description.trim(),
        propertyType: form.propertyType,
        city:         form.city.trim() || undefined,
        neighborhood: form.neighborhood.trim() || undefined,
      });
      onSaved({
        title:        form.title.trim(),
        description:  form.description.trim(),
        propertyType: form.propertyType,
        city:         form.city.trim() || undefined,
        neighborhood: form.neighborhood.trim() || undefined,
      });
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 1200,
    backgroundColor: "rgba(15,23,42,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1rem",
  };

  const sheetStyle: React.CSSProperties = {
    backgroundColor: "#fff", borderRadius: 16,
    width: "100%", maxWidth: 520,
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    padding: "1.5rem",
    direction: "rtl",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: "0.88rem",
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={sheetStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>تعديل الطلب</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#94a3b8" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.3rem" }}>العنوان *</label>
            <input style={inputStyle} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.3rem" }}>نوع العقار</label>
            <select style={inputStyle} value={form.propertyType} onChange={e => setForm(p => ({ ...p, propertyType: e.target.value }))}>
              {PROPERTY_TYPE_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.3rem" }}>المدينة</label>
              <input style={inputStyle} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="دمشق" />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.3rem" }}>الحي</label>
              <input style={inputStyle} value={form.neighborhood} onChange={e => setForm(p => ({ ...p, neighborhood: e.target.value }))} placeholder="المزة" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "0.3rem" }}>الوصف</label>
            <textarea
              style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>

        {error && <p style={{ color: "#dc2626", fontSize: "0.82rem", margin: "0.75rem 0 0" }}>{error}</p>}

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: "0.55rem", borderRadius: 8, border: "none",
              backgroundColor: "var(--color-primary, #0f766e)", color: "#fff",
              fontWeight: 700, fontSize: "0.88rem", cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "0.55rem 1.25rem", borderRadius: 8, border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc", color: "#475569",
              fontWeight: 600, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

interface BuyerRequest {
  id: string;
  referenceNumber?: string | null;
  title: string;
  propertyType: string;
  description: string;
  city?: string;
  neighborhood?: string;
  userName: string;
  userId: string;
  commentsCount: number;
  createdAt: string;
  isPublished: boolean;
  status?: string;
}

// ─── Status badge config ───────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  Open:     { label: "مفتوح",     bg: "#f0fdf4", color: "#15803d" },
  Closed:   { label: "مغلق",      bg: "#f1f5f9", color: "#64748b" },
  Reviewed: { label: "تمت المراجعة", bg: "#fefce8", color: "#a16207" },
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Apartment: "شقة سكنية",
  Villa:     "فيلا",
  Office:    "مكتب",
  Shop:      "محل تجاري",
  Land:      "أرض",
  Building:  "بناء كامل",
};

const PROPERTY_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Apartment: { bg: "#eff6ff", color: "#1d4ed8" },
  Villa:     { bg: "#f0fdf4", color: "#15803d" },
  Office:    { bg: "#fff7ed", color: "#c2410c" },
  Shop:      { bg: "#fdf4ff", color: "#7e22ce" },
  Land:      { bg: "#fefce8", color: "#a16207" },
  Building:  { bg: "#f8fafc", color: "#334155" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBuyerRequestsPage() {
  useProtectedRoute({ allowedRoles: ["Admin"] });

  const [requests,    setRequests]    = useState<BuyerRequest[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [editingRequest,     setEditingRequest]     = useState<BuyerRequest | null>(null);
  const [togglingPublishedId, setTogglingPublishedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchPage = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        page: String(p), pageSize: String(PAGE_SIZE),
        ...(q ? { search: q } : {}),
      });
      const result = await api.get<PagedResult<BuyerRequest>>(
        `/buyer-requests/admin?${qs}`
      );
      setRequests(result.items ?? []);
      setTotal(result.totalCount ?? 0);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(page, search); }, [page, search, fetchPage]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  const [settingStatusId, setSettingStatusId] = useState<string | null>(null);

  async function handleTogglePublished(r: BuyerRequest) {
    setTogglingPublishedId(r.id);
    setDeleteError("");
    try {
      await adminApi.adminSetBuyerRequestPublished(r.id, !r.isPublished);
      setRequests(prev => prev.map(x => x.id === r.id ? { ...x, isPublished: !r.isPublished } : x));
    } catch (err) {
      setDeleteError(normalizeError(err));
    } finally {
      setTogglingPublishedId(null);
    }
  }

  function handleEditSaved(id: string, updated: Partial<BuyerRequest>) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    setEditingRequest(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟ سيُحذف مع جميع تعليقاته.")) return;
    setDeletingId(id);
    setDeleteError("");
    try {
      await adminApi.adminDeleteBuyerRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      setDeleteError(normalizeError(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetStatus(id: string, status: string) {
    setSettingStatusId(id);
    setDeleteError("");
    try {
      await adminApi.adminSetBuyerRequestStatus(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (err) {
      setDeleteError(normalizeError(err));
    } finally {
      setSettingStatusId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" style={{ padding: "1.5rem", maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <DashboardBackLink href="/dashboard/admin" label="لوحة الإدارة" />

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>
            طلبات السوق العقاري
          </h1>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
            الطلبات المنشورة من قِبَل المستخدمين على الصفحة العامة
            {!loading && <strong style={{ color: "#0f172a" }}> — {total} طلب</strong>}
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.4rem" }}>
          <input
            ref={searchRef}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="بحث بالعنوان أو المدينة..."
            style={{
              padding: "0.45rem 0.8rem", borderRadius: 8,
              border: "1px solid #e2e8f0", fontSize: "0.85rem",
              fontFamily: "inherit", outline: "none", width: 220,
            }}
          />
          <button
            type="submit"
            style={{
              backgroundColor: "var(--color-primary)", color: "#fff",
              border: "none", borderRadius: 8, padding: "0.45rem 1rem",
              fontWeight: 700, fontSize: "0.82rem", cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            بحث
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}
              style={{
                background: "#f1f5f9", border: "none", borderRadius: 8,
                padding: "0.45rem 0.75rem", fontSize: "0.78rem",
                color: "#64748b", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              مسح
            </button>
          )}
        </form>
      </div>

      <InlineBanner message={error || deleteError} />

      {/* KPI strip */}
      <div style={{
        display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap",
      }}>
        {[
          { label: "إجمالي الطلبات", value: total, color: "#1d4ed8", bg: "#eff6ff" },
        ].map(k => (
          <div key={k.label} style={{
            backgroundColor: k.bg, borderRadius: 12,
            padding: "0.75rem 1.2rem",
            display: "flex", flexDirection: "column", gap: "0.1rem",
          }}>
            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: k.color }}>{loading ? "—" : k.value}</span>
            <span style={{ fontSize: "0.75rem", color: "#475569" }}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: "#fff", borderRadius: 14,
        boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["رقم المرجع", "الطلب", "النوع", "الموقع", "الناشر", "الحالة", "النشر", "التعليقات", "التاريخ", ""].map((h, i) => (
                <th key={i} style={{
                  padding: "0.7rem 0.9rem", textAlign: "right",
                  fontWeight: 700, color: "#475569", fontSize: "0.78rem",
                  whiteSpace: "nowrap",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                  جارٍ التحميل...
                </td>
              </tr>
            )}
            {!loading && requests.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                  {search ? "لا توجد نتائج لهذا البحث" : "لا توجد طلبات بعد"}
                </td>
              </tr>
            )}
            {!loading && requests.map((r, idx) => {
              const colors = PROPERTY_TYPE_COLORS[r.propertyType] ?? { bg: "#f8fafc", color: "#334155" };
              return (
                <tr key={r.id} style={{
                  borderBottom: idx < requests.length - 1 ? "1px solid #f1f5f9" : "none",
                  transition: "background 0.1s",
                }}>
                  {/* Reference Number */}
                  <td style={{ padding: "0.75rem 0.9rem" }}>
                    <RefBadge value={r.referenceNumber} />
                  </td>
                  {/* Title */}
                  <td style={{ padding: "0.75rem 0.9rem", maxWidth: 260 }}>
                    <Link
                      href={`/requests/${r.id}`}
                      target="_blank"
                      style={{ fontWeight: 700, color: "#0f172a", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {r.title}
                    </Link>
                    <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.description?.substring(0, 60)}{(r.description?.length ?? 0) > 60 ? "..." : ""}
                    </p>
                  </td>

                  {/* Type */}
                  <td style={{ padding: "0.75rem 0.9rem", whiteSpace: "nowrap" }}>
                    <span style={{
                      backgroundColor: colors.bg, color: colors.color,
                      borderRadius: 16, padding: "0.18rem 0.65rem",
                      fontWeight: 700, fontSize: "0.74rem",
                    }}>
                      {PROPERTY_TYPE_LABELS[r.propertyType] ?? r.propertyType}
                    </span>
                  </td>

                  {/* Location */}
                  <td style={{ padding: "0.75rem 0.9rem", color: "#475569", whiteSpace: "nowrap", fontSize: "0.8rem" }}>
                    {[r.city, r.neighborhood].filter(Boolean).join(" / ") || "—"}
                  </td>

                  {/* Publisher */}
                  <td style={{ padding: "0.75rem 0.9rem", whiteSpace: "nowrap" }}>
                    <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.82rem" }}>{r.userName}</span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: "0.75rem 0.9rem", whiteSpace: "nowrap" }}>
                    {(() => {
                      const cfg = STATUS_CONFIG[r.status ?? "Open"] ?? STATUS_CONFIG.Open;
                      return (
                        <span style={{
                          backgroundColor: cfg.bg, color: cfg.color,
                          borderRadius: 20, padding: "0.15rem 0.6rem",
                          fontSize: "0.74rem", fontWeight: 700,
                        }}>
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </td>

                  {/* isPublished toggle */}
                  <td style={{ padding: "0.75rem 0.9rem", whiteSpace: "nowrap", textAlign: "center" }}>
                    <button
                      onClick={() => handleTogglePublished(r)}
                      disabled={togglingPublishedId === r.id}
                      title={r.isPublished ? "إخفاء من العموم" : "نشر للعموم"}
                      style={{
                        padding: "0.25rem 0.6rem", borderRadius: 20, border: "none",
                        backgroundColor: r.isPublished ? "#dcfce7" : "#f1f5f9",
                        color: r.isPublished ? "#15803d" : "#64748b",
                        fontSize: "0.73rem", fontWeight: 700,
                        cursor: togglingPublishedId === r.id ? "not-allowed" : "pointer",
                        fontFamily: "inherit", opacity: togglingPublishedId === r.id ? 0.6 : 1,
                      }}
                    >
                      {togglingPublishedId === r.id ? "..." : r.isPublished ? "منشور" : "مخفي"}
                    </button>
                  </td>

                  {/* Comments count */}
                  <td style={{ padding: "0.75rem 0.9rem", textAlign: "center", color: "#64748b" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "0.25rem",
                      fontSize: "0.8rem",
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      {r.commentsCount}
                    </span>
                  </td>

                  {/* Date */}
                  <td style={{ padding: "0.75rem 0.9rem", color: "#94a3b8", whiteSpace: "nowrap", fontSize: "0.78rem" }}>
                    {new Date(r.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                    })}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "0.75rem 0.9rem" }}>
                    <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <Link
                        href={`/requests/${r.id}`}
                        target="_blank"
                        style={{
                          padding: "0.3rem 0.65rem", borderRadius: 6,
                          backgroundColor: "#f0f9ff", color: "#0ea5e9",
                          fontWeight: 700, fontSize: "0.74rem",
                          textDecoration: "none", whiteSpace: "nowrap",
                        }}
                      >
                        عرض
                      </Link>
                      {/* Edit button */}
                      <button
                        onClick={() => setEditingRequest(r)}
                        style={{
                          padding: "0.3rem 0.65rem", borderRadius: 6,
                          backgroundColor: "#f5f3ff", color: "#7c3aed",
                          border: "none", fontWeight: 700, fontSize: "0.74rem",
                          cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                        }}
                      >
                        تعديل
                      </button>
                      {/* Status quick-change buttons */}
                      {(["Open", "Closed", "Reviewed"] as const).map(s => {
                        const cfg = STATUS_CONFIG[s];
                        const isCurrent = (r.status ?? "Open") === s;
                        const busy = settingStatusId === r.id;
                        if (isCurrent) return null;
                        return (
                          <button
                            key={s}
                            onClick={() => handleSetStatus(r.id, s)}
                            disabled={busy}
                            title={cfg.label}
                            style={{
                              padding: "0.3rem 0.55rem", borderRadius: 6,
                              backgroundColor: cfg.bg, color: cfg.color,
                              border: "none", fontWeight: 700, fontSize: "0.72rem",
                              cursor: busy ? "not-allowed" : "pointer",
                              fontFamily: "inherit", whiteSpace: "nowrap",
                              opacity: busy ? 0.6 : 1,
                            }}
                          >
                            {busy ? "..." : cfg.label}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={!!deletingId}
                        style={{
                          padding: "0.3rem 0.65rem", borderRadius: 6,
                          backgroundColor: "#fef2f2",
                          color: "#ef4444", border: "none",
                          fontWeight: 700, fontSize: "0.74rem",
                          cursor: deletingId ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          opacity: deletingId === r.id ? 0.6 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {deletingId === r.id ? "..." : "حذف"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editingRequest && (
        <EditRequestModal
          request={editingRequest}
          onClose={() => setEditingRequest(null)}
          onSaved={(updated) => handleEditSaved(editingRequest.id, updated)}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", justifyContent: "center", gap: "0.4rem",
          marginTop: "1.25rem", flexWrap: "wrap",
        }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: "0.4rem 0.9rem", borderRadius: 8,
              border: "1px solid #e2e8f0", background: "#fff",
              fontSize: "0.82rem", cursor: page === 1 ? "not-allowed" : "pointer",
              color: page === 1 ? "#94a3b8" : "#0f172a", fontFamily: "inherit",
            }}
          >
            السابق
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
            .reduce<(number | "…")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} style={{ padding: "0.4rem 0.4rem", color: "#94a3b8", fontSize: "0.82rem" }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  style={{
                    padding: "0.4rem 0.8rem", borderRadius: 8,
                    border: "1px solid #e2e8f0", fontFamily: "inherit",
                    background: p === page ? "var(--color-primary)" : "#fff",
                    color: p === page ? "#fff" : "#0f172a",
                    fontWeight: p === page ? 700 : 400,
                    fontSize: "0.82rem", cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              )
            )}

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: "0.4rem 0.9rem", borderRadius: 8,
              border: "1px solid #e2e8f0", background: "#fff",
              fontSize: "0.82rem", cursor: page === totalPages ? "not-allowed" : "pointer",
              color: page === totalPages ? "#94a3b8" : "#0f172a", fontFamily: "inherit",
            }}
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
