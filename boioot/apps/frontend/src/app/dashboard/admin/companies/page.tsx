"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import {
  adminApi,
  type AdminCompaniesParams,
} from "@/features/admin/api";
import { ADMIN_PAGE_SIZE } from "@/features/admin/constants";
import { useCities } from "@/hooks/useCities";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { normalizeError } from "@/lib/api";
import type { AdminCompanyResponse } from "@/types";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCompaniesPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "companies.view" });
  const { cities } = useCities();

  const [companies, setCompanies]   = useState<AdminCompanyResponse[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState("");

  const [pendingCity, setPendingCity]           = useState("");
  const [pendingVerified, setPendingVerified]   = useState("");

  const appliedFiltersRef = useRef<AdminCompaniesParams>({});

  const load = useCallback(async (p: number, params: AdminCompaniesParams = {}) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await adminApi.getCompanies(p, ADMIN_PAGE_SIZE, params);
      setCompanies(result.items);
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
    const params: AdminCompaniesParams = {};
    if (pendingCity)        params.city       = pendingCity;
    if (pendingVerified !== "") params.isVerified = pendingVerified === "true";
    appliedFiltersRef.current = params;
    setActionError("");
    load(1, params);
  }

  function handleReset() {
    setPendingCity("");
    setPendingVerified("");
    appliedFiltersRef.current = {};
    setActionError("");
    load(1, {});
  }

  async function handleToggleVerify(companyId: string, currentIsVerified: boolean) {
    if (actionLoading) return;
    setActionLoading(companyId);
    setActionError("");
    try {
      const updated = await adminApi.verifyCompany(companyId, !currentIsVerified);
      setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
            إدارة الشركات
          </h1>
          {totalCount > 0 && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              {totalCount} شركة
            </p>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div className="form-card" style={{
          marginBottom: "1.25rem",
          display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 140 }}>
            <label className="form-label" style={{ margin: 0 }}>التوثيق</label>
            <select
              className="form-input"
              style={{ padding: "0.45rem 0.75rem" }}
              value={pendingVerified}
              onChange={e => setPendingVerified(e.target.value)}
            >
              <option value="">الكل</option>
              <option value="true">موثّقة</option>
              <option value="false">غير موثّقة</option>
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
              {cities.map(c => (
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

        {/* ── Action error ── */}
        <InlineBanner message={actionError} />

        {/* ── Fetch error ── */}
        <InlineBanner message={fetchError} />

        {/* ── Loading ── */}
        {fetching && <LoadingRow />}

        {/* ── Empty ── */}
        {!fetching && !fetchError && companies.length === 0 && (
          <div className="form-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
              لا توجد شركات مطابقة لهذه المعايير.
            </p>
          </div>
        )}

        {/* ── Companies list ── */}
        {!fetching && companies.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {companies.map(c => (
              <CompanyRow
                key={c.id}
                company={c}
                actionLoading={actionLoading}
                onToggleVerify={handleToggleVerify}
              />
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

// ─── Company Row ──────────────────────────────────────────────────────────────

function CompanyRow({
  company: c,
  actionLoading,
  onToggleVerify,
}: {
  company: AdminCompanyResponse;
  actionLoading: string | null;
  onToggleVerify: (id: string, current: boolean) => void;
}) {
  const isThisLoading = actionLoading === c.id;

  return (
    <div className="form-card" style={{ padding: "1rem 1.25rem" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: "1rem", flexWrap: "wrap",
      }}>

        {/* ── Info ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center",
            gap: "0.5rem", marginBottom: "0.45rem", flexWrap: "wrap",
          }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0, color: "var(--color-text-primary)" }}>
              {c.name}
            </p>
            <span className={c.isVerified ? "badge badge-green" : "badge badge-gray"}>
              {c.isVerified ? "موثّقة" : "غير موثّقة"}
            </span>
            {c.isDeleted && <span className="badge badge-red">محذوفة</span>}
          </div>

          {c.city && (
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              📍 {c.city}
            </p>
          )}
          {c.email && (
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              {c.email}
            </p>
          )}
          {c.phone && (
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              {c.phone}
            </p>
          )}

          {/* Counts row */}
          <div style={{
            display: "flex", gap: "1rem", marginTop: "0.45rem", flexWrap: "wrap",
          }}>
            <CountPill label="وكلاء" count={c.agentCount} />
            <CountPill label="عقارات" count={c.propertyCount} />
            <CountPill label="مشاريع" count={c.projectCount} />
          </div>
        </div>

        {/* ── Action ── */}
        <button
          className={c.isVerified ? "btn" : "btn btn-primary"}
          style={{
            padding: "0.4rem 1rem", flexShrink: 0, fontSize: "0.85rem",
            ...(!c.isVerified ? {} : {
              border: "1.5px solid var(--color-border)",
              backgroundColor: "transparent",
              color: "var(--color-text-primary)",
            }),
          }}
          disabled={isThisLoading || !!actionLoading}
          onClick={() => onToggleVerify(c.id, c.isVerified)}
        >
          {isThisLoading ? "..." : c.isVerified ? "إلغاء التوثيق" : "توثيق"}
        </button>

      </div>
    </div>
  );
}

function CountPill({ label, count }: { label: string; count: number }) {
  return (
    <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
      <strong style={{ color: "var(--color-text-primary)" }}>{count}</strong> {label}
    </span>
  );
}

