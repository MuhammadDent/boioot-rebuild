"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { api, normalizeError } from "@/lib/api";
import { InlineBanner } from "@/components/dashboard/InlineBanner";

const PAGE_SIZE = 10;

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Apartment: "شقة سكنية",
  Villa:     "فيلا",
  Office:    "مكتب",
  Shop:      "محل تجاري",
  Land:      "أرض",
  Building:  "بناء كامل",
};

interface BuyerRequest {
  id: string;
  title: string;
  propertyType: string;
  description: string;
  city?: string;
  neighborhood?: string;
  isPublished: boolean;
  createdAt: string;
}

interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const buyerRequestsApi = {
  getMyList(page: number, pageSize: number): Promise<PagedResult<BuyerRequest>> {
    return api.get(`/buyer-requests/my?page=${page}&pageSize=${pageSize}`);
  },
  deleteRequest(id: string): Promise<void> {
    return api.delete(`/buyer-requests/${id}`);
  },
};

export default function MyRequestsPage() {
  const router  = useRouter();
  const { user, isLoading, logout } = useProtectedRoute();

  const [requests, setRequests]     = useState<BuyerRequest[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const load = useCallback(async (p: number) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await buyerRequestsApi.getMyList(p, PAGE_SIZE);
      setRequests(result.items);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
      setPage(p);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      load(1);
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("success") === "1") {
          setSuccessMsg("تم نشر طلبك بنجاح!");
          setTimeout(() => setSuccessMsg(""), 4000);
          window.history.replaceState({}, "", "/dashboard/my-requests");
        }
      }
    }
  }, [isLoading, user, load]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد أنك تريد حذف هذا الطلب؟")) return;
    setDeletingId(id);
    setDeleteError("");
    try {
      await buyerRequestsApi.deleteRequest(id);
      setSuccessMsg("تم حذف الطلب بنجاح.");
      setTimeout(() => setSuccessMsg(""), 3500);
      load(page);
    } catch (e) {
      setDeleteError(normalizeError(e));
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading || !user) return null;

  return (
    <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "2rem" }}>

      {/* ── Sticky Header ── */}
      <div style={{
        backgroundColor: "#fff",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{
          padding: "0.75rem 1.25rem",
          display: "flex", alignItems: "center", gap: "0.6rem",
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "#f1f5f9", border: "none", borderRadius: 8,
              width: 36, height: 36, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
              طلباتي
            </h1>
            {!fetching && (
              <p style={{ margin: 0, fontSize: "0.74rem", color: "#64748b" }}>
                {totalCount} طلب منشور
              </p>
            )}
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: "#fee2e2", border: "none", borderRadius: 8,
              padding: "0.4rem 0.85rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "0.35rem",
              color: "#dc2626", fontSize: "0.78rem", fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            خروج
          </button>
        </div>

        {/* Quick nav */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "0 1rem", borderTop: "1px solid #f1f5f9",
          overflowX: "auto", scrollbarWidth: "none",
        }}>
          {[
            { href: "/",              label: "الرئيسية" },
            { href: "/dashboard",     label: "ملفي الشخصي" },
            { href: "/daily-rentals", label: "الإيجار اليومي" },
            { href: "/projects",      label: "المشاريع" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              textDecoration: "none", color: "#475569",
              fontSize: "0.8rem", fontWeight: 600,
              padding: "0.5rem 0.9rem", whiteSpace: "nowrap", display: "inline-block",
            }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: "1rem 1.25rem" }}>

        {/* Success */}
        {successMsg && (
          <div style={{
            backgroundColor: "#f0fdf4", border: "1px solid #86efac",
            borderRadius: 10, padding: "0.75rem 1rem",
            color: "#166534", fontSize: "0.85rem", fontWeight: 600,
            marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            {successMsg}
          </div>
        )}

        {/* Add button */}
        <Link
          href="/dashboard/my-requests/new"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "0.5rem", width: "100%",
            padding: "0.75rem",
            backgroundColor: "var(--color-primary)", color: "#fff",
            border: "none", borderRadius: 12,
            fontWeight: 700, fontSize: "0.92rem",
            marginBottom: "1rem", cursor: "pointer",
            fontFamily: "inherit", textDecoration: "none",
            boxShadow: "0 2px 8px rgba(34,197,94,0.25)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          أضف طلب جديد
        </Link>

        {fetchError && (
          <div className="error-banner" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <span>{fetchError}</span>
            <button className="btn btn-outline btn-sm" onClick={() => load(page)}>
              إعادة المحاولة
            </button>
          </div>
        )}
        <InlineBanner message={deleteError} />

        {/* Skeleton */}
        {fetching && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                height: 100, borderRadius: 12,
                background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
              }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!fetching && requests.length === 0 && !fetchError && (
          <div style={{
            backgroundColor: "#fff", borderRadius: 16, padding: "2.5rem 1.5rem",
            textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
            <p style={{ margin: "0 0 0.4rem", fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>
              لا توجد طلبات بعد
            </p>
            <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#64748b" }}>
              انشر طلبك وسيتواصل معك الوسطاء والملاك
            </p>
          </div>
        )}

        {/* List */}
        {!fetching && requests.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {requests.map(req => (
              <div key={req.id} style={{
                backgroundColor: "#fff", borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: "1rem 1.1rem",
              }}>
                {/* Title row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.4rem" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem", color: "#1e293b", lineHeight: 1.4 }}>
                    {req.title}
                  </p>
                  <span style={{
                    flexShrink: 0,
                    backgroundColor: "#f0fdf4", color: "#15803d",
                    border: "1px solid #86efac",
                    borderRadius: 20, padding: "0.15rem 0.65rem",
                    fontSize: "0.72rem", fontWeight: 700,
                  }}>
                    {PROPERTY_TYPE_LABELS[req.propertyType] ?? req.propertyType}
                  </span>
                </div>

                {/* Description */}
                <p style={{
                  margin: "0 0 0.5rem",
                  fontSize: "0.82rem", color: "#64748b", lineHeight: 1.5,
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>
                  {req.description}
                </p>

                {/* Location + date */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  {(req.city || req.neighborhood) && (
                    <span style={{ fontSize: "0.76rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      {[req.city, req.neighborhood].filter(Boolean).join(" / ")}
                    </span>
                  )}
                  <span style={{ fontSize: "0.74rem", color: "#94a3b8", marginRight: "auto" }}>
                    {new Date(req.createdAt).toLocaleDateString("en-GB", { year: "numeric", month: "numeric", day: "numeric" })}
                  </span>
                  <button
                    onClick={() => handleDelete(req.id)}
                    disabled={deletingId === req.id}
                    style={{
                      background: "none", border: "none",
                      color: "#ef4444", fontSize: "0.75rem",
                      cursor: deletingId === req.id ? "not-allowed" : "pointer",
                      fontFamily: "inherit", fontWeight: 600,
                      opacity: deletingId === req.id ? 0.5 : 1,
                      padding: "0.2rem 0.4rem",
                    }}
                  >
                    {deletingId === req.id ? "جارٍ الحذف..." : "حذف"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!fetching && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
            <button
              onClick={() => load(page - 1)}
              disabled={page <= 1}
              style={{
                background: page <= 1 ? "#f1f5f9" : "#fff",
                border: "1px solid #e2e8f0", borderRadius: 8,
                padding: "0.45rem 0.9rem",
                color: page <= 1 ? "#94a3b8" : "#1e293b",
                fontSize: "0.82rem", fontWeight: 600,
                cursor: page <= 1 ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              السابق
            </button>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => load(page + 1)}
              disabled={page >= totalPages}
              style={{
                background: page >= totalPages ? "#f1f5f9" : "#fff",
                border: "1px solid #e2e8f0", borderRadius: 8,
                padding: "0.45rem 0.9rem",
                color: page >= totalPages ? "#94a3b8" : "#1e293b",
                fontSize: "0.82rem", fontWeight: 600,
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              التالي
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
