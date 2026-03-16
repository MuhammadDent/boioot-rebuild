"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { api, normalizeError } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";

const PAGE_SIZE = 12;

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Apartment: "شقة سكنية",
  Villa:     "فيلا",
  Office:    "مكتب",
  Shop:      "محل تجاري",
  Land:      "أرض",
  Building:  "بناء كامل",
};

const PROPERTY_TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Apartment: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  Villa:     { bg: "#f0fdf4", color: "#15803d", border: "#86efac" },
  Office:    { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  Shop:      { bg: "#fdf4ff", color: "#7e22ce", border: "#e9d5ff" },
  Land:      { bg: "#fefce8", color: "#a16207", border: "#fde68a" },
  Building:  { bg: "#f8fafc", color: "#334155", border: "#cbd5e1" },
};

interface BuyerRequest {
  id: string;
  title: string;
  propertyType: string;
  description: string;
  city?: string;
  neighborhood?: string;
  userName: string;
  commentsCount: number;
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

// ─── Inner (needs Suspense for useSearchParams) ───────────────────────────────
function RequestsContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  const typeParam = searchParams.get("type") || "";
  const cityParam = searchParams.get("city") || "";
  const pageParam = Number(searchParams.get("page") || "1");

  const [requests, setRequests]     = useState<BuyerRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext]       = useState(false);
  const [hasPrev, setHasPrev]       = useState(false);

  // Draft filters (local, not yet applied)
  const [draftType, setDraftType] = useState(typeParam);
  const [draftCity, setDraftCity] = useState(cityParam);

  // Sync draft when URL changes
  useEffect(() => {
    setDraftType(typeParam);
    setDraftCity(cityParam);
  }, [typeParam, cityParam]);

  // Fetch
  useEffect(() => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    params.set("page",     String(pageParam));
    params.set("pageSize", String(PAGE_SIZE));

    api.get<PagedResult<BuyerRequest>>(`/buyer-requests?${params}`)
      .then(res => {
        let items = res.items;
        if (typeParam) items = items.filter(r => r.propertyType === typeParam);
        if (cityParam) items = items.filter(r => r.city?.includes(cityParam));
        setRequests(items);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
        setHasNext(res.hasNext);
        setHasPrev(res.hasPrevious);
      })
      .catch(e => setError(normalizeError(e)))
      .finally(() => setLoading(false));
  }, [typeParam, cityParam, pageParam]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (draftType) params.set("type", draftType);
    if (draftCity) params.set("city", draftCity);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  function clearFilters() {
    setDraftType("");
    setDraftCity("");
    router.push(pathname);
  }

  function goPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasActiveFilters = !!(typeParam || cityParam);

  return (
    <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "3rem" }}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #065f46 0%, #047857 60%, #059669 100%)",
        padding: "2.5rem 1.25rem 2rem",
        textAlign: "center",
      }}>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 800, color: "#fff" }}>
          طلبات العقارات
        </h1>
        <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem", color: "#a7f3d0" }}>
          تصفّح طلبات المشترين والمستأجرين — تواصل معهم مباشرة
        </p>

        {/* Add request CTA */}
        <Link
          href="/dashboard/my-requests/new"
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            backgroundColor: "#fff", color: "#065f46",
            borderRadius: 30, padding: "0.6rem 1.4rem",
            fontWeight: 700, fontSize: "0.9rem", textDecoration: "none",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          أضف طلبك الآن
        </Link>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: "#fff", borderBottom: "1px solid #e2e8f0",
        padding: "0.85rem 1.25rem",
        position: "sticky", top: 68, zIndex: 9,
      }}>
        <form onSubmit={applyFilters} style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>

          {/* Type filter */}
          <select
            value={draftType}
            onChange={e => setDraftType(e.target.value)}
            style={{
              flex: 1, minWidth: 130,
              border: "1.5px solid #e2e8f0", borderRadius: 8,
              padding: "0.5rem 0.75rem", fontSize: "0.83rem",
              color: "#334155", backgroundColor: "#fff",
              fontFamily: "inherit", outline: "none",
            }}
          >
            <option value="">كل الفئات</option>
            {Object.entries(PROPERTY_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          {/* City filter */}
          <input
            type="text"
            placeholder="ابحث بالمدينة..."
            value={draftCity}
            onChange={e => setDraftCity(e.target.value)}
            style={{
              flex: 1, minWidth: 130,
              border: "1.5px solid #e2e8f0", borderRadius: 8,
              padding: "0.5rem 0.75rem", fontSize: "0.83rem",
              color: "#334155", backgroundColor: "#fff",
              fontFamily: "inherit", outline: "none",
            }}
          />

          <button
            type="submit"
            style={{
              backgroundColor: "var(--color-primary)", color: "#fff",
              border: "none", borderRadius: 8,
              padding: "0.5rem 1.1rem", fontWeight: 700,
              fontSize: "0.83rem", cursor: "pointer",
              fontFamily: "inherit", whiteSpace: "nowrap",
            }}
          >
            بحث
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                backgroundColor: "#f1f5f9", color: "#64748b",
                border: "none", borderRadius: 8,
                padding: "0.5rem 0.9rem", fontWeight: 600,
                fontSize: "0.83rem", cursor: "pointer",
                fontFamily: "inherit", whiteSpace: "nowrap",
              }}
            >
              مسح
            </button>
          )}
        </form>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: "1.25rem" }}>

        {/* Count + active filter tags */}
        {!loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
              {totalCount} طلب
            </span>
            {typeParam && (
              <span style={{
                backgroundColor: "#eff6ff", color: "#1d4ed8",
                border: "1px solid #bfdbfe", borderRadius: 20,
                padding: "0.15rem 0.7rem", fontSize: "0.75rem", fontWeight: 600,
              }}>
                {PROPERTY_TYPE_LABELS[typeParam] ?? typeParam}
              </span>
            )}
            {cityParam && (
              <span style={{
                backgroundColor: "#f0fdf4", color: "#15803d",
                border: "1px solid #86efac", borderRadius: 20,
                padding: "0.15rem 0.7rem", fontSize: "0.75rem", fontWeight: 600,
              }}>
                📍 {cityParam}
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "0.75rem 1rem",
            color: "#dc2626", fontSize: "0.85rem", marginBottom: "1rem",
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <Spinner />
          </div>
        )}

        {/* Empty */}
        {!loading && requests.length === 0 && !error && (
          <div style={{
            backgroundColor: "#fff", borderRadius: 16, padding: "3rem 1.5rem",
            textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
            <p style={{ margin: "0 0 0.4rem", fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>
              لا توجد طلبات
            </p>
            <p style={{ margin: "0 0 1.5rem", fontSize: "0.85rem", color: "#64748b" }}>
              {hasActiveFilters ? "جرّب تغيير معايير البحث" : "كن أول من ينشر طلبه"}
            </p>
            <Link
              href="/dashboard/my-requests/new"
              style={{
                display: "inline-block",
                backgroundColor: "var(--color-primary)", color: "#fff",
                borderRadius: 10, padding: "0.65rem 1.5rem",
                fontWeight: 700, fontSize: "0.9rem", textDecoration: "none",
              }}
            >
              أضف طلبك الآن
            </Link>
          </div>
        )}

        {/* Cards grid */}
        {!loading && requests.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}>
            {requests.map(req => {
              const colors = PROPERTY_TYPE_COLORS[req.propertyType] ?? PROPERTY_TYPE_COLORS.Building;
              return (
                <Link
                  key={req.id}
                  href={`/requests/${req.id}`}
                  style={{
                    backgroundColor: "#fff", borderRadius: 14,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                    padding: "1.1rem 1.2rem",
                    display: "flex", flexDirection: "column", gap: "0.6rem",
                    textDecoration: "none", color: "inherit",
                    transition: "box-shadow 0.15s, transform 0.15s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.07)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  {/* Type badge + date */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{
                      backgroundColor: colors.bg, color: colors.color,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 20, padding: "0.18rem 0.7rem",
                      fontSize: "0.74rem", fontWeight: 700,
                    }}>
                      {PROPERTY_TYPE_LABELS[req.propertyType] ?? req.propertyType}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      {new Date(req.createdAt).toLocaleDateString("ar-SY", { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", lineHeight: 1.45 }}>
                    {req.title}
                  </h2>

                  {/* Description */}
                  <p style={{
                    margin: 0, fontSize: "0.82rem", color: "#64748b", lineHeight: 1.55,
                    display: "-webkit-box", WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {req.description}
                  </p>

                  {/* Footer */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    paddingTop: "0.5rem", borderTop: "1px solid #f1f5f9", marginTop: "auto",
                  }}>
                    {/* Location */}
                    {(req.city || req.neighborhood) && (
                      <span style={{ fontSize: "0.76rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.2rem", flex: 1, minWidth: 0, overflow: "hidden" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0 }}>
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {[req.city, req.neighborhood].filter(Boolean).join(" / ")}
                        </span>
                      </span>
                    )}

                    {/* Comments count */}
                    <span style={{ fontSize: "0.74rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.25rem", flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      {req.commentsCount}
                    </span>

                    {/* Publisher */}
                    <span style={{ fontSize: "0.74rem", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.2rem", flexShrink: 0 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                      {req.userName}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{
            display: "flex", justifyContent: "center",
            alignItems: "center", gap: "0.5rem", marginTop: "2rem",
          }}>
            <button
              onClick={() => goPage(pageParam - 1)}
              disabled={!hasPrev}
              style={{
                background: hasPrev ? "#fff" : "#f1f5f9",
                border: "1px solid #e2e8f0", borderRadius: 8,
                padding: "0.5rem 1rem",
                color: hasPrev ? "#1e293b" : "#94a3b8",
                fontSize: "0.82rem", fontWeight: 600,
                cursor: hasPrev ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              السابق
            </button>
            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
              {pageParam} / {totalPages}
            </span>
            <button
              onClick={() => goPage(pageParam + 1)}
              disabled={!hasNext}
              style={{
                background: hasNext ? "#fff" : "#f1f5f9",
                border: "1px solid #e2e8f0", borderRadius: 8,
                padding: "0.5rem 1rem",
                color: hasNext ? "#1e293b" : "#94a3b8",
                fontSize: "0.82rem", fontWeight: 600,
                cursor: hasNext ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              التالي
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page export (Suspense required for useSearchParams) ──────────────────────
export default function RequestsPage() {
  return (
    <Suspense fallback={
      <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    }>
      <RequestsContent />
    </Suspense>
  );
}
