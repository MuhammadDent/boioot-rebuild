"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
  dashboardProjectsApi,
  DASHBOARD_PROJECTS_PAGE_SIZE,
} from "@/features/dashboard/projects/api";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_BADGE,
  formatStartingPrice,
} from "@/features/projects/constants";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { normalizeError } from "@/lib/api";
import type { DashboardProjectItem } from "@/types";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardProjectsPage() {
  const { user, isLoading } = useProtectedRoute({
    allowedRoles: ["Admin", "CompanyOwner", "Agent"],
  });

  const [projects, setProjects] = useState<DashboardProjectItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  // Start true to prevent empty-state flash before the first load completes.
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  // Only Admin and CompanyOwner may create, edit, or delete projects.
  const canManage = user?.role === "Admin" || user?.role === "CompanyOwner";

  const load = useCallback(async (p: number) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await dashboardProjectsApi.getList(
        p,
        DASHBOARD_PROJECTS_PAGE_SIZE
      );
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
    if (!isLoading && user) {
      load(1);
    }
  }, [isLoading, user, load]);

  async function handleDelete(id: string, title: string) {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف المشروع "${title}"؟\nلا يمكن التراجع عن هذا الإجراء.`
      )
    )
      return;

    setDeletingId(id);
    setDeleteError("");
    try {
      await dashboardProjectsApi.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setTotalCount((prev) => prev - 1);
    } catch (e) {
      setDeleteError(normalizeError(e));
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading || !user) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.75rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
            <h1
              style={{
                fontSize: "1.4rem",
                fontWeight: 700,
                margin: 0,
                color: "var(--color-text-primary)",
              }}
            >
              مشاريعي
            </h1>
            {totalCount > 0 && (
              <p
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.85rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                {totalCount} مشروع مسجّل
              </p>
            )}
          </div>

          {canManage && (
            <Link
              href="/dashboard/projects/new"
              className="btn btn-primary"
              style={{
                padding: "0.6rem 1.4rem",
                fontSize: "0.95rem",
                textDecoration: "none",
              }}
            >
              + إضافة مشروع
            </Link>
          )}
        </div>

        {/* ── Delete error ── */}
        <InlineBanner message={deleteError} />

        {/* ── Fetch error ── */}
        <InlineBanner message={fetchError} />

        {/* ── Loading ── */}
        {fetching && <LoadingRow />}

        {/* ── Empty state ── */}
        {!fetching && !fetchError && projects.length === 0 && (
          <div
            className="form-card"
            style={{ textAlign: "center", padding: "3rem 1rem" }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{
                opacity: 0.35,
                marginBottom: "0.75rem",
                color: "var(--color-text-secondary)",
              }}
            >
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            <p
              style={{
                color: "var(--color-text-secondary)",
                margin: "0 0 1rem",
              }}
            >
              لا توجد مشاريع مسجّلة بعد.
            </p>
            {canManage && (
              <Link
                href="/dashboard/projects/new"
                className="btn btn-primary"
                style={{ textDecoration: "none" }}
              >
                إضافة أول مشروع
              </Link>
            )}
          </div>
        )}

        {/* ── Projects list ── */}
        {!fetching && projects.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {projects.map((p) => (
              <ProjectRow
                key={p.id}
                project={p}
                canManage={canManage}
                isDeleting={deletingId === p.id}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && !fetching && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.75rem",
              marginTop: "2rem",
            }}
          >
            <button
              className="btn"
              style={{ padding: "0.4rem 1rem" }}
              disabled={page <= 1}
              onClick={() => load(page - 1)}
            >
              السابق
            </button>
            <span
              style={{
                fontSize: "0.88rem",
                color: "var(--color-text-secondary)",
              }}
            >
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

// ─── Project row ──────────────────────────────────────────────────────────────

function ProjectRow({
  project: p,
  canManage,
  isDeleting,
  onDelete,
}: {
  project: DashboardProjectItem;
  canManage: boolean;
  isDeleting: boolean;
  onDelete: (id: string, title: string) => void;
}) {
  return (
    <div className="form-card" style={{ padding: "1rem 1.25rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        {/* ── Info ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              margin: "0 0 0.45rem",
              color: "var(--color-text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {p.title}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.35rem",
              marginBottom: "0.5rem",
            }}
          >
            <span
              className={`badge ${PROJECT_STATUS_BADGE[p.status] ?? "badge-gray"}`}
            >
              {PROJECT_STATUS_LABELS[p.status] ?? p.status}
            </span>
            <span
              className={`badge ${p.isPublished ? "badge-green" : "badge-gray"}`}
            >
              {p.isPublished ? "منشور" : "غير منشور"}
            </span>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              color: "var(--color-text-secondary)",
            }}
          >
            {formatStartingPrice(p.startingPrice)} &bull; {p.city} &bull;{" "}
            {new Date(p.createdAt).toLocaleDateString("ar-SY", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>

        {/* ── Actions ── */}
        {canManage && (
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              flexShrink: 0,
              alignItems: "center",
            }}
          >
            <Link
              href={`/dashboard/projects/${p.id}/edit`}
              className="btn btn-sm"
              style={{
                textDecoration: "none",
                border: "1.5px solid var(--color-border)",
                backgroundColor: "transparent",
                color: "var(--color-text-primary)",
                borderRadius: "8px",
              }}
            >
              تعديل
            </Link>

            <button
              className="btn btn-sm"
              style={{
                backgroundColor: "transparent",
                border: "1.5px solid var(--color-error)",
                color: "var(--color-error)",
                borderRadius: "8px",
                cursor: isDeleting ? "not-allowed" : "pointer",
                opacity: isDeleting ? 0.6 : 1,
              }}
              disabled={isDeleting}
              onClick={() => onDelete(p.id, p.title)}
            >
              {isDeleting ? "..." : "حذف"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
