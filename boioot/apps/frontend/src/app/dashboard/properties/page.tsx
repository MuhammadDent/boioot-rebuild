"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
  dashboardPropertiesApi,
  DASHBOARD_PROPERTIES_PAGE_SIZE,
} from "@/features/dashboard/properties/api";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  formatPrice,
} from "@/features/properties/constants";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { normalizeError } from "@/lib/api";
import type { DashboardPropertyItem } from "@/types";

// ─── Badge maps ───────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  Available: "badge badge-green",
  Sold:      "badge badge-red",
  Rented:    "badge badge-yellow",
  Inactive:  "badge badge-gray",
};

const LISTING_BADGE: Record<string, string> = {
  Sale: "badge badge-blue",
  Rent: "badge badge-yellow",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPropertiesPage() {
  const { user, isLoading } = useProtectedRoute({
    allowedRoles: ["Admin", "CompanyOwner", "Agent"],
  });

  const [properties, setProperties] = useState<DashboardPropertyItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  // Start as true to prevent empty-state flash before the first load completes.
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  // Admin and CompanyOwner share the same create/delete rights (AdminOrCompanyOwner policy).
  const canManage = user?.role === "Admin" || user?.role === "CompanyOwner";

  const load = useCallback(async (p: number) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await dashboardPropertiesApi.getList(p, DASHBOARD_PROPERTIES_PAGE_SIZE);
      setProperties(result.items);
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
        `هل أنت متأكد من حذف العقار "${title}"؟\nلا يمكن التراجع عن هذا الإجراء.`
      )
    )
      return;

    setDeletingId(id);
    setDeleteError("");
    try {
      await dashboardPropertiesApi.delete(id);
      setProperties((prev) => prev.filter((p) => p.id !== id));
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
              عقاراتي
            </h1>
            {totalCount > 0 && (
              <p
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "0.85rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                {totalCount} عقار مسجّل
              </p>
            )}
          </div>

          {canManage && (
            <Link
              href="/dashboard/properties/new"
              className="btn btn-primary"
              style={{
                padding: "0.6rem 1.4rem",
                fontSize: "0.95rem",
                textDecoration: "none",
              }}
            >
              + إضافة عقار
            </Link>
          )}
        </div>

        {/* ── Delete error ── */}
        <InlineBanner message={deleteError} />

        {/* ── Fetch error ── */}
        <InlineBanner message={fetchError} />

        {/* ── Loading ── */}
        {fetching && (
          <LoadingRow />
        )}

        {/* ── Empty state ── */}
        {!fetching && !fetchError && properties.length === 0 && (
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
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <p
              style={{
                color: "var(--color-text-secondary)",
                margin: "0 0 1rem",
              }}
            >
              لا توجد عقارات مسجّلة بعد.
            </p>
            {canManage && (
              <Link
                href="/dashboard/properties/new"
                className="btn btn-primary"
                style={{ textDecoration: "none" }}
              >
                إضافة أول عقار
              </Link>
            )}
          </div>
        )}

        {/* ── Properties list ── */}
        {!fetching && properties.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {properties.map((p) => (
              <PropertyRow
                key={p.id}
                property={p}
                canDelete={canManage}
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

// ─── Property row ─────────────────────────────────────────────────────────────

function PropertyRow({
  property: p,
  canDelete,
  isDeleting,
  onDelete,
}: {
  property: DashboardPropertyItem;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: (id: string, title: string) => void;
}) {
  return (
    <div
      className="form-card"
      style={{ padding: "1rem 1.25rem" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        {/* ── Left: info ── */}
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

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.5rem" }}>
            <span className={STATUS_BADGE[p.status] ?? "badge badge-gray"}>
              {PROPERTY_STATUS_LABELS[p.status] ?? p.status}
            </span>
            <span className="badge badge-gray">
              {PROPERTY_TYPE_LABELS[p.type] ?? p.type}
            </span>
            <span className={LISTING_BADGE[p.listingType] ?? "badge badge-gray"}>
              {LISTING_TYPE_LABELS[p.listingType] ?? p.listingType}
            </span>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              color: "var(--color-text-secondary)",
            }}
          >
            {formatPrice(p.price)} &bull; {p.city} &bull;{" "}
            {new Date(p.createdAt).toLocaleDateString("ar-SY", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>

        {/* ── Right: actions ── */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexShrink: 0,
            alignItems: "center",
          }}
        >
          <Link
            href={`/dashboard/properties/${p.id}/edit`}
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

          {canDelete && (
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
          )}
        </div>
      </div>
    </div>
  );
}
