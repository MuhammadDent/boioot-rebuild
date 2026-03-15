"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
  dashboardRequestsApi,
  DASHBOARD_REQUESTS_PAGE_SIZE,
} from "@/features/dashboard/requests/api";
import { normalizeError } from "@/lib/api";
import type { DashboardRequestItem } from "@/types";

// ─── Status display maps ───────────────────────────────────────────────────────

const REQUEST_STATUS_LABELS: Record<string, string> = {
  New:       "جديد",
  Contacted: "تم التواصل",
  Qualified: "مؤهّل",
  Closed:    "مغلق",
};

const REQUEST_STATUS_BADGE: Record<string, string> = {
  New:       "badge badge-blue",
  Contacted: "badge badge-yellow",
  Qualified: "badge badge-green",
  Closed:    "badge badge-gray",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardRequestsPage() {
  const { user, isLoading } = useProtectedRoute({
    allowedRoles: ["Admin", "CompanyOwner", "Agent"],
  });

  const [requests, setRequests]     = useState<DashboardRequestItem[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  const load = useCallback(async (p: number) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await dashboardRequestsApi.getList(p, DASHBOARD_REQUESTS_PAGE_SIZE);
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
    if (!isLoading && user) load(1);
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem",
        }}>
          <div>
            <Link href="/dashboard" style={{
              fontSize: "0.82rem", color: "var(--color-text-secondary)",
              marginBottom: "0.35rem", display: "block",
            }}>
              ← لوحة التحكم
            </Link>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
              الطلبات والاستفسارات
            </h1>
            {totalCount > 0 && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                {totalCount} طلب مسجّل
              </p>
            )}
          </div>
        </div>

        {/* ── Fetch error ── */}
        {fetchError && (
          <div style={{
            background: "#ffebee", color: "#c62828",
            padding: "0.75rem 1rem", borderRadius: "8px",
            marginBottom: "1rem", fontSize: "0.9rem",
          }}>
            {fetchError}
          </div>
        )}

        {/* ── Loading ── */}
        {fetching && (
          <p style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "3rem 0" }}>
            جارٍ التحميل...
          </p>
        )}

        {/* ── Empty state ── */}
        {!fetching && !fetchError && requests.length === 0 && (
          <div className="form-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5"
              style={{ opacity: 0.35, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
              لا توجد طلبات واستفسارات بعد.
            </p>
          </div>
        )}

        {/* ── Requests list ── */}
        {!fetching && requests.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {requests.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && !fetching && (
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            gap: "0.75rem", marginTop: "2rem",
          }}>
            <button
              className="btn"
              style={{ padding: "0.4rem 1rem" }}
              disabled={page <= 1}
              onClick={() => load(page - 1)}
            >
              السابق
            </button>
            <span style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
              صفحة {page} من {totalPages}
            </span>
            <button
              className="btn"
              style={{ padding: "0.4rem 1rem" }}
              disabled={page >= totalPages}
              onClick={() => load(page + 1)}
            >
              التالي
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Request row ──────────────────────────────────────────────────────────────

function RequestRow({ request: r }: { request: DashboardRequestItem }) {
  const subject = r.propertyTitle ?? r.projectTitle ?? "—";
  const subjectLabel = r.propertyTitle ? "عقار" : r.projectTitle ? "مشروع" : null;

  return (
    <div className="form-card" style={{ padding: "1rem 1.25rem" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: "1rem", flexWrap: "wrap",
      }}>

        {/* ── Info ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.45rem", flexWrap: "wrap" }}>
            <p style={{
              fontWeight: 700, fontSize: "1rem", margin: 0,
              color: "var(--color-text-primary)",
            }}>
              {r.name}
            </p>
            <span className={REQUEST_STATUS_BADGE[r.status] ?? "badge badge-gray"}>
              {REQUEST_STATUS_LABELS[r.status] ?? r.status}
            </span>
          </div>

          <p style={{ margin: "0 0 0.35rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            📞 {r.phone}
          </p>

          {subjectLabel && (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
              {subjectLabel}: {subject}
            </p>
          )}

          <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
            {new Date(r.createdAt).toLocaleDateString("ar-SY", {
              year: "numeric", month: "short", day: "numeric",
            })}
          </p>
        </div>

        {/* ── Action ── */}
        <Link
          href={`/dashboard/requests/${r.id}`}
          className="btn btn-sm"
          style={{
            textDecoration: "none", flexShrink: 0,
            border: "1.5px solid var(--color-border)",
            backgroundColor: "transparent",
            color: "var(--color-text-primary)", borderRadius: "8px",
          }}
        >
          عرض التفاصيل
        </Link>

      </div>
    </div>
  );
}
