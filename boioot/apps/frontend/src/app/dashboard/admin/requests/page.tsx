"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
  adminApi,
  type AdminRequestsParams,
} from "@/features/admin/api";
import { ADMIN_PAGE_SIZE } from "@/features/admin/constants";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_BADGE,
  REQUEST_STATUS_OPTIONS,
} from "@/features/dashboard/requests/constants";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { normalizeError } from "@/lib/api";
import type { RequestResponse } from "@/types";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRequestsPage() {
  const { user, isLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });

  const [requests, setRequests]     = useState<RequestResponse[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [pendingStatus, setPendingStatus] = useState("");

  const appliedFiltersRef = useRef<AdminRequestsParams>({});

  const load = useCallback(async (p: number, params: AdminRequestsParams = {}) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await adminApi.getRequests(p, ADMIN_PAGE_SIZE, params);
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
    if (!isLoading && user) load(1, {});
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  function handleSearch() {
    const params: AdminRequestsParams = {};
    if (pendingStatus) params.status = pendingStatus;
    appliedFiltersRef.current = params;
    load(1, params);
  }

  function handleReset() {
    setPendingStatus("");
    appliedFiltersRef.current = {};
    load(1, {});
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <Link href="/dashboard" style={{
            fontSize: "0.82rem", color: "var(--color-text-secondary)",
            marginBottom: "0.35rem", display: "block",
          }}>
            ← لوحة التحكم
          </Link>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
            الطلبات — عرض الكل
          </h1>
          {totalCount > 0 && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              {totalCount} طلب
            </p>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div className="form-card" style={{
          marginBottom: "1.25rem",
          display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 160 }}>
            <label className="form-label" style={{ margin: 0 }}>الحالة</label>
            <select
              className="form-input"
              style={{ padding: "0.45rem 0.75rem" }}
              value={pendingStatus}
              onChange={e => setPendingStatus(e.target.value)}
            >
              <option value="">الكل</option>
              {REQUEST_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-primary" style={{ padding: "0.45rem 1.2rem" }} onClick={handleSearch}>
              بحث
            </button>
            <button className="btn" style={{ padding: "0.45rem 1rem" }} onClick={handleReset}>
              إعادة ضبط
            </button>
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

        {/* ── Empty ── */}
        {!fetching && !fetchError && requests.length === 0 && (
          <div className="form-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
              لا توجد طلبات مطابقة لهذه المعايير.
            </p>
          </div>
        )}

        {/* ── Requests list ── */}
        {!fetching && requests.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {requests.map(r => (
              <RequestRow key={r.id} request={r} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && !fetching && (
          <AdminPagination
            page={page} totalPages={totalPages}
            onPrev={() => load(page - 1, appliedFiltersRef.current)}
            onNext={() => load(page + 1, appliedFiltersRef.current)}
          />
        )}

      </div>
    </div>
  );
}

// ─── Request Row ──────────────────────────────────────────────────────────────

function RequestRow({ request: r }: { request: RequestResponse }) {
  const subject      = r.propertyTitle ?? r.projectTitle;
  const subjectLabel = r.propertyTitle ? "عقار" : r.projectTitle ? "مشروع" : null;

  return (
    <div className="form-card" style={{ padding: "1rem 1.25rem" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center",
          gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap",
        }}>
          <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0, color: "var(--color-text-primary)" }}>
            {r.name}
          </p>
          <span className={REQUEST_STATUS_BADGE[r.status] ?? "badge badge-gray"}>
            {REQUEST_STATUS_LABELS[r.status] ?? r.status}
          </span>
        </div>

        <div style={{
          display: "flex", gap: "0.75rem", flexWrap: "wrap",
          fontSize: "0.82rem", color: "var(--color-text-secondary)",
        }}>
          <span>📞 {r.phone}</span>
          {subjectLabel && subject && (
            <>
              <span>·</span>
              <span>{subjectLabel}: {subject}</span>
            </>
          )}
          {r.companyName && (
            <>
              <span>·</span>
              <span>الشركة: {r.companyName}</span>
            </>
          )}
          <span>·</span>
          <span>{new Date(r.createdAt).toLocaleDateString("ar-SY", {
            year: "numeric", month: "short", day: "numeric",
          })}</span>
        </div>
      </div>
    </div>
  );
}

