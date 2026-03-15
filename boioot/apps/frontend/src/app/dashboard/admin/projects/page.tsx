"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import {
  adminApi,
  type AdminProjectsParams,
} from "@/features/admin/api";
import { ADMIN_PAGE_SIZE, ADMIN_PROJECT_STATUS_BADGE } from "@/features/admin/constants";
import {
  PROJECT_STATUS_LABELS,
  formatStartingPrice,
} from "@/features/projects/constants";
import { SYRIAN_CITIES } from "@/features/properties/constants";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { normalizeError } from "@/lib/api";
import type { ProjectResponse } from "@/types";

const PROJECT_STATUSES = ["Upcoming", "UnderConstruction", "Completed"] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminProjectsPage() {
  const { user, isLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });

  const [projects, setProjects]     = useState<ProjectResponse[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingCity, setPendingCity]     = useState("");

  const appliedFiltersRef = useRef<AdminProjectsParams>({});

  const load = useCallback(async (p: number, params: AdminProjectsParams = {}) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await adminApi.getProjects(p, ADMIN_PAGE_SIZE, params);
      setProjects(result.items);
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
    const params: AdminProjectsParams = {};
    if (pendingStatus) params.status = pendingStatus;
    if (pendingCity)   params.city   = pendingCity;
    appliedFiltersRef.current = params;
    load(1, params);
  }

  function handleReset() {
    setPendingStatus("");
    setPendingCity("");
    appliedFiltersRef.current = {};
    load(1, {});
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
            المشاريع — عرض الكل
          </h1>
          {totalCount > 0 && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              {totalCount} مشروع
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
              {PROJECT_STATUSES.map(s => (
                <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 160 }}>
            <label className="form-label" style={{ margin: 0 }}>المدينة</label>
            <select
              className="form-input"
              style={{ padding: "0.45rem 0.75rem" }}
              value={pendingCity}
              onChange={e => setPendingCity(e.target.value)}
            >
              <option value="">كل المدن</option>
              {SYRIAN_CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
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
        <InlineBanner message={fetchError} />

        {/* ── Loading ── */}
        {fetching && <LoadingRow />}

        {/* ── Empty ── */}
        {!fetching && !fetchError && projects.length === 0 && (
          <div className="form-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
              لا توجد مشاريع مطابقة لهذه المعايير.
            </p>
          </div>
        )}

        {/* ── Projects list ── */}
        {!fetching && projects.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {projects.map(p => (
              <ProjectRow key={p.id} project={p} />
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

// ─── Project Row ──────────────────────────────────────────────────────────────

function ProjectRow({ project: p }: { project: ProjectResponse }) {
  return (
    <div className="form-card" style={{ padding: "1rem 1.25rem" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          display: "flex", alignItems: "center",
          gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap",
        }}>
          <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0, color: "var(--color-text-primary)" }}>
            {p.title}
          </p>
          <span className={ADMIN_PROJECT_STATUS_BADGE[p.status] ?? "badge badge-gray"}>
            {PROJECT_STATUS_LABELS[p.status] ?? p.status}
          </span>
          <span className={p.isPublished ? "badge badge-green" : "badge badge-gray"}>
            {p.isPublished ? "منشور" : "مسودة"}
          </span>
        </div>

        <div style={{
          display: "flex", gap: "0.75rem", flexWrap: "wrap",
          fontSize: "0.82rem", color: "var(--color-text-secondary)",
        }}>
          <span>📍 {p.city}</span>
          <span>·</span>
          <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>
            {formatStartingPrice(p.startingPrice ?? null)}
          </span>
          <span>·</span>
          <span>الشركة: {p.companyName}</span>
          <span>·</span>
          <span>{new Date(p.createdAt).toLocaleDateString("ar-SY", {
            year: "numeric", month: "short", day: "numeric",
          })}</span>
        </div>
      </div>
    </div>
  );
}
