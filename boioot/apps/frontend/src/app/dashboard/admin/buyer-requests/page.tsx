"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { api, normalizeError } from "@/lib/api";
import type { PagedResult } from "@/types";

interface BuyerRequest {
  id: string;
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
}

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

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟ سيُحذف مع جميع تعليقاته.")) return;
    setDeletingId(id);
    setDeleteError("");
    try {
      await api.delete(`/buyer-requests/admin/${id}`);
      setRequests(prev => prev.filter(r => r.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (err) {
      setDeleteError(normalizeError(err));
    } finally {
      setDeletingId(null);
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
              {["الطلب", "النوع", "الموقع", "الناشر", "التعليقات", "التاريخ", ""].map((h, i) => (
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
                <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                  جارٍ التحميل...
                </td>
              </tr>
            )}
            {!loading && requests.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
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
                  <td style={{ padding: "0.75rem 0.9rem", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
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
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        style={{
                          padding: "0.3rem 0.65rem", borderRadius: 6,
                          backgroundColor: deletingId === r.id ? "#fef2f2" : "#fef2f2",
                          color: "#ef4444", border: "none",
                          fontWeight: 700, fontSize: "0.74rem",
                          cursor: deletingId === r.id ? "not-allowed" : "pointer",
                          fontFamily: "inherit",
                          opacity: deletingId === r.id ? 0.6 : 1,
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
