"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
  adminApi,
  type AdminPropertiesParams,
} from "@/features/admin/api";
import { ADMIN_PAGE_SIZE, PROPERTY_STATUS_BADGE } from "@/features/admin/constants";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  SYRIAN_CITIES,
  formatPrice,
} from "@/features/properties/constants";
import { normalizeError } from "@/lib/api";
import type { PropertyResponse } from "@/types";

const PROPERTY_STATUSES = ["Available", "Inactive", "Sold", "Rented"] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPropertiesPage() {
  const { user, isLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });

  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingCity, setPendingCity]     = useState("");

  const appliedFiltersRef = useRef<AdminPropertiesParams>({});

  const load = useCallback(async (p: number, params: AdminPropertiesParams = {}) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await adminApi.getProperties(p, ADMIN_PAGE_SIZE, params);
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
    if (!isLoading && user) load(1, {});
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  function handleSearch() {
    const params: AdminPropertiesParams = {};
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
          <Link href="/dashboard" style={{
            fontSize: "0.82rem", color: "var(--color-text-secondary)",
            marginBottom: "0.35rem", display: "block",
          }}>
            ← لوحة التحكم
          </Link>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
            العقارات — عرض الكل
          </h1>
          {totalCount > 0 && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              {totalCount} عقار
            </p>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div className="form-card" style={{
          marginBottom: "1.25rem",
          display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 140 }}>
            <label className="form-label" style={{ margin: 0 }}>الحالة</label>
            <select
              className="form-input"
              style={{ padding: "0.45rem 0.75rem" }}
              value={pendingStatus}
              onChange={e => setPendingStatus(e.target.value)}
            >
              <option value="">الكل</option>
              {PROPERTY_STATUSES.map(s => (
                <option key={s} value={s}>{PROPERTY_STATUS_LABELS[s]}</option>
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
        {!fetching && !fetchError && properties.length === 0 && (
          <div className="form-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
              لا توجد عقارات مطابقة لهذه المعايير.
            </p>
          </div>
        )}

        {/* ── Properties list ── */}
        {!fetching && properties.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {properties.map(p => (
              <PropertyRow key={p.id} property={p} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && !fetching && (
          <Pagination
            page={page} totalPages={totalPages}
            onPrev={() => load(page - 1, appliedFiltersRef.current)}
            onNext={() => load(page + 1, appliedFiltersRef.current)}
          />
        )}

      </div>
    </div>
  );
}

// ─── Property Row ─────────────────────────────────────────────────────────────

function PropertyRow({ property: p }: { property: PropertyResponse }) {
  return (
    <div className="form-card" style={{ padding: "1rem 1.25rem" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: "1rem", flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center",
            gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap",
          }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0, color: "var(--color-text-primary)" }}>
              {p.title}
            </p>
            <span className={PROPERTY_STATUS_BADGE[p.status] ?? "badge badge-gray"}>
              {PROPERTY_STATUS_LABELS[p.status] ?? p.status}
            </span>
          </div>

          <div style={{
            display: "flex", gap: "0.6rem", flexWrap: "wrap",
            fontSize: "0.82rem", color: "var(--color-text-secondary)", marginBottom: "0.3rem",
          }}>
            <span>📍 {p.city}</span>
            <span>·</span>
            <span>{PROPERTY_TYPE_LABELS[p.type] ?? p.type}</span>
            <span>·</span>
            <span>{LISTING_TYPE_LABELS[p.listingType] ?? p.listingType}</span>
          </div>

          <div style={{
            display: "flex", gap: "0.75rem", flexWrap: "wrap",
            fontSize: "0.82rem", color: "var(--color-text-secondary)",
          }}>
            <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>
              {formatPrice(p.price)}
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
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, onPrev, onNext,
}: {
  page: number; totalPages: number;
  onPrev: () => void; onNext: () => void;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      gap: "0.75rem", marginTop: "2rem",
    }}>
      <button className="btn" style={{ padding: "0.4rem 1rem" }} disabled={page <= 1} onClick={onPrev}>
        السابق
      </button>
      <span style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
        صفحة {page} من {totalPages}
      </span>
      <button className="btn" style={{ padding: "0.4rem 1rem" }} disabled={page >= totalPages} onClick={onNext}>
        التالي
      </button>
    </div>
  );
}
