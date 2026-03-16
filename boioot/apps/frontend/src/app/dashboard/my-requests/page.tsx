"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { api, normalizeError } from "@/lib/api";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_BADGE,
} from "@/features/dashboard/requests/constants";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import type { RequestResponse, PagedResult } from "@/types";

const PAGE_SIZE = 10;

const myRequestsApi = {
  getList(page: number, pageSize: number): Promise<PagedResult<RequestResponse>> {
    return api.get(`/requests/my?page=${page}&pageSize=${pageSize}`);
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyRequestsPage() {
  const { user, isLoading } = useProtectedRoute();

  const [requests, setRequests]     = useState<RequestResponse[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  const load = useCallback(async (p: number) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await myRequestsApi.getList(p, PAGE_SIZE);
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
    <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "2rem" }}>
      {/* Header */}
      <div style={{
        backgroundColor: "#fff",
        borderBottom: "1px solid #e2e8f0",
        padding: "1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <DashboardBackLink href="/dashboard" />
        <div>
          <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
            طلباتي
          </h1>
          {!fetching && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
              {totalCount} طلب مُرسَل
            </p>
          )}
        </div>
      </div>

      <div style={{ padding: "1rem 1.25rem" }}>
        <InlineBanner message={fetchError} />

        {/* Loading skeleton */}
        {fetching && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                height: 90, borderRadius: 12,
                background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
              }} />
            ))}
          </div>
        )}

        {/* Empty state */}
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
              يمكنك إرسال طلب استفسار عن أي عقار أو مشروع
            </p>
            <Link href="/" style={{
              display: "inline-block", padding: "0.6rem 1.5rem",
              backgroundColor: "var(--color-primary)", color: "#fff",
              borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.9rem",
            }}>
              تصفح العقارات
            </Link>
          </div>
        )}

        {/* Requests list */}
        {!fetching && requests.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {requests.map(req => (
              <div key={req.id} style={{
                backgroundColor: "#fff",
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                padding: "1rem 1.1rem",
              }}>
                {/* Title row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>
                    {req.propertyTitle ?? req.projectTitle ?? "طلب استفسار"}
                  </span>
                  <span className={REQUEST_STATUS_BADGE[req.status] ?? "badge badge-gray"} style={{ fontSize: "0.72rem" }}>
                    {REQUEST_STATUS_LABELS[req.status] ?? req.status}
                  </span>
                </div>

                {/* Company */}
                {req.companyName && (
                  <p style={{ margin: "0 0 0.3rem", fontSize: "0.8rem", color: "#64748b" }}>
                    🏢 {req.companyName}
                  </p>
                )}

                {/* Message preview */}
                {req.message && (
                  <p style={{
                    margin: "0.3rem 0", fontSize: "0.82rem", color: "#475569",
                    backgroundColor: "#f8fafc", borderRadius: 8, padding: "0.5rem 0.75rem",
                    borderRight: "3px solid #e2e8f0",
                  }}>
                    {req.message.length > 120 ? req.message.slice(0, 120) + "…" : req.message}
                  </p>
                )}

                {/* Date + link */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    {new Date(req.createdAt).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  {req.propertyId && (
                    <Link href={`/properties/${req.propertyId}`} style={{
                      fontSize: "0.78rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600,
                    }}>
                      عرض العقار ←
                    </Link>
                  )}
                  {req.projectId && (
                    <Link href={`/projects/${req.projectId}`} style={{
                      fontSize: "0.78rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600,
                    }}>
                      عرض المشروع ←
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!fetching && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
            <button
              disabled={page <= 1}
              onClick={() => load(page - 1)}
              style={{
                padding: "0.5rem 1rem", borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: page <= 1 ? "#f8fafc" : "#fff",
                color: page <= 1 ? "#94a3b8" : "#1e293b",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 600,
              }}
            >
              السابق
            </button>
            <span style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem", color: "#64748b" }}>
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => load(page + 1)}
              style={{
                padding: "0.5rem 1rem", borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: page >= totalPages ? "#f8fafc" : "#fff",
                color: page >= totalPages ? "#94a3b8" : "#1e293b",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 600,
              }}
            >
              التالي
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
