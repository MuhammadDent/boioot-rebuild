"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { adminApi } from "@/features/admin/api";
import { MOCK_ADMIN_REQUESTS } from "@/features/dashboard/requests/mockData";
import { ADMIN_PAGE_SIZE } from "@/features/admin/constants";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_OPTIONS,
} from "@/features/dashboard/requests/constants";
import { normalizeError } from "@/lib/api";
import type { RequestResponse } from "@/types";

const FETCH_SIZE = 500;

// ─── Status colour palette ─────────────────────────────────────────────────────
const STATUS_PALETTE: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  all:       { bg: "#f8fafc", text: "#475569", border: "#e2e8f0", accent: "#64748b" },
  New:       { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", accent: "#1d4ed8" },
  Contacted: { bg: "#fffbeb", text: "#92400e", border: "#fde68a", accent: "#d97706" },
  Qualified: { bg: "#f0fdf4", text: "#15803d", border: "#86efac", accent: "#16a34a" },
  Closed:    { bg: "#f8fafc", text: "#64748b", border: "#cbd5e1", accent: "#64748b" },
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AdminRequestsPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "requests.view" });

  const [allRequests, setAllRequests] = useState<RequestResponse[]>([]);
  const [fetching, setFetching]       = useState(true);
  const [fetchError, setFetchError]   = useState("");
  const [activeTab, setActiveTab]     = useState("all");
  const [page, setPage]               = useState(1);

  const load = useCallback(async () => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await adminApi.getRequests(1, FETCH_SIZE, {});
      setAllRequests(result.items.length > 0 ? result.items : MOCK_ADMIN_REQUESTS);
    } catch (e) {
      setFetchError(normalizeError(e));
      setAllRequests(MOCK_ADMIN_REQUESTS);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { if (!isLoading && user) load(); }, [isLoading, user, load]);
  useEffect(() => { setPage(1); }, [activeTab]);

  if (isLoading || !user) return null;

  // ── Derived state ────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const c: Record<string, number> = { all: allRequests.length };
    for (const s of REQUEST_STATUS_OPTIONS) c[s] = allRequests.filter(r => r.status === s).length;
    return c;
  }, [allRequests]);

  const filtered   = useMemo(() => (
    activeTab === "all" ? allRequests : allRequests.filter(r => r.status === activeTab)
  ), [allRequests, activeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  const TABS = [
    { key: "all",       label: "الكل" },
    ...REQUEST_STATUS_OPTIONS.map(s => ({ key: s, label: REQUEST_STATUS_LABELS[s] })),
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", direction: "rtl" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem 4rem" }}>

        {/* ═══ Header ═══════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: "1.5rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", flexWrap: "wrap",
            gap: "0.5rem", marginTop: "0.3rem",
          }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                الطلبات والاستفسارات
              </h1>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                إدارة جميع استفسارات العملاء ومتابعة حالاتها
              </p>
            </div>
            {!fetching && allRequests.length > 0 && (
              <span style={{
                backgroundColor: "#f1f5f9", color: "#475569",
                padding: "0.3rem 0.85rem", borderRadius: 20,
                fontSize: "0.82rem", fontWeight: 700,
              }}>
                {allRequests.length} طلب إجمالاً
              </span>
            )}
          </div>
        </div>

        <InlineBanner message={fetchError} />

        {/* ═══ KPI Cards ════════════════════════════════════════════════════════ */}
        {!fetching && allRequests.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}>
            {TABS.map(({ key, label }) => (
              <KpiCard
                key={key}
                label={label}
                value={kpis[key] ?? 0}
                palette={STATUS_PALETTE[key] ?? STATUS_PALETTE.all}
                active={activeTab === key}
                onClick={() => setActiveTab(key)}
              />
            ))}
          </div>
        )}

        {/* ═══ Status Tabs ══════════════════════════════════════════════════════ */}
        {!fetching && allRequests.length > 0 && (
          <div style={{
            display: "flex", gap: "0.4rem", flexWrap: "wrap",
            marginBottom: "1.25rem",
          }}>
            {TABS.map(({ key, label }) => {
              const pal = STATUS_PALETTE[key] ?? STATUS_PALETTE.all;
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.4rem",
                    padding: "0.45rem 1rem", borderRadius: 24,
                    fontSize: "0.82rem", fontWeight: 600,
                    border: `1.5px solid ${active ? pal.accent : "#e2e8f0"}`,
                    backgroundColor: active ? pal.accent : "#fff",
                    color: active ? "#fff" : "#64748b",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {label}
                  <span style={{
                    backgroundColor: active ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                    color: active ? "#fff" : "#64748b",
                    borderRadius: 12, padding: "0 0.45rem",
                    fontSize: "0.72rem", fontWeight: 800,
                    lineHeight: "1.6",
                  }}>
                    {kpis[key] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ═══ Loading ══════════════════════════════════════════════════════════ */}
        {fetching && <LoadingRow />}

        {/* ═══ Empty ════════════════════════════════════════════════════════════ */}
        {!fetching && paginated.length === 0 && (
          <EmptyState
            isFiltered={activeTab !== "all"}
            onReset={() => setActiveTab("all")}
          />
        )}

        {/* ═══ Request Cards ════════════════════════════════════════════════════ */}
        {!fetching && paginated.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {paginated.map(r => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        )}

        {/* ═══ Pagination ═══════════════════════════════════════════════════════ */}
        {!fetching && totalPages > 1 && (
          <div style={{
            display: "flex", justifyContent: "center",
            alignItems: "center", gap: "0.5rem", marginTop: "2rem",
          }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={paginationBtnStyle(page === 1)}
            >
              السابق
            </button>
            <span style={{ fontSize: "0.82rem", color: "#64748b", minWidth: 60, textAlign: "center" }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={paginationBtnStyle(page === totalPages)}
            >
              التالي
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, palette, active, onClick,
}: {
  label: string;
  value: number;
  palette: { bg: string; text: string; border: string; accent: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: active ? palette.accent : palette.bg,
        border: `1.5px solid ${active ? palette.accent : palette.border}`,
        borderRadius: 14, padding: "1rem 1.1rem",
        display: "flex", flexDirection: "column", gap: "0.3rem",
        cursor: "pointer", fontFamily: "inherit", textAlign: "right",
        transition: "all 0.15s", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
      }}
    >
      <span style={{
        fontSize: "1.6rem", fontWeight: 800,
        color: active ? "#fff" : palette.text,
      }}>
        {value}
      </span>
      <span style={{
        fontSize: "0.76rem", fontWeight: 600,
        color: active ? "rgba(255,255,255,0.85)" : "#64748b",
      }}>
        {label}
      </span>
    </button>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({ request: r }: { request: RequestResponse }) {
  const subject     = r.propertyTitle ?? r.projectTitle;
  const subjectType = r.propertyTitle ? "عقار" : r.projectTitle ? "مشروع" : null;

  const initials = r.name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("");
  const hue      = r.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  const pal = STATUS_PALETTE[r.status] ?? STATUS_PALETTE.Closed;

  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      padding: "1.1rem 1.25rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      display: "flex", gap: "1rem", alignItems: "flex-start",
    }}>

      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        backgroundColor: `hsl(${hue}, 55%, 88%)`,
        color: `hsl(${hue}, 55%, 32%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.88rem", fontWeight: 800, userSelect: "none",
      }}>
        {initials || "؟"}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Row 1 — name · status · date */}
        <div style={{
          display: "flex", alignItems: "center",
          gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem",
        }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
            {r.name}
          </span>
          <span style={{
            backgroundColor: pal.bg, color: pal.text,
            borderRadius: 20, padding: "0.1rem 0.65rem",
            fontSize: "0.74rem", fontWeight: 700,
            border: `1px solid ${pal.border}`,
          }}>
            {REQUEST_STATUS_LABELS[r.status] ?? r.status}
          </span>
          <span style={{ marginRight: "auto", fontSize: "0.75rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
            {new Date(r.createdAt).toLocaleDateString("en-GB", {
              year: "numeric", month: "numeric", day: "numeric",
            })}
          </span>
        </div>

        {/* Row 2 — phone · email */}
        <div style={{
          display: "flex", gap: "1.25rem", flexWrap: "wrap",
          fontSize: "0.82rem", color: "#475569", marginBottom: "0.3rem",
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ color: "#94a3b8" }}>📞</span>{r.phone}
          </span>
          {r.email && (
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ color: "#94a3b8" }}>✉️</span>{r.email}
            </span>
          )}
        </div>

        {/* Row 3 — subject · company */}
        {(subject || r.companyName) && (
          <div style={{
            display: "flex", gap: "1rem", flexWrap: "wrap",
            fontSize: "0.8rem", color: "#64748b",
          }}>
            {subject && subjectType && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ color: "#94a3b8" }}>🏠</span>
                {subjectType}: <strong style={{ color: "#475569" }}>{subject}</strong>
              </span>
            )}
            {r.companyName && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ color: "#94a3b8" }}>🏢</span>
                {r.companyName}
              </span>
            )}
          </div>
        )}

        {/* Row 4 — message preview */}
        {r.message && (
          <p style={{
            margin: "0.4rem 0 0",
            fontSize: "0.81rem", color: "#64748b", lineHeight: 1.55,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {r.message}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ isFiltered, onReset }: { isFiltered: boolean; onReset: () => void }) {
  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: 16, border: "1px solid #e2e8f0",
      padding: "3.5rem 1.5rem", textAlign: "center",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
      <p style={{ margin: "0 0 0.4rem", fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>
        {isFiltered ? "لا توجد طلبات بهذه الحالة" : "لا توجد طلبات بعد"}
      </p>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#64748b" }}>
        {isFiltered ? "جرّب تصفية مختلفة أو عرض كل الطلبات" : "ستظهر هنا الطلبات عند وصولها من العملاء"}
      </p>
      {isFiltered && (
        <button
          onClick={onReset}
          style={{
            backgroundColor: "var(--color-primary)", color: "#fff",
            border: "none", borderRadius: 10,
            padding: "0.6rem 1.5rem", fontSize: "0.88rem",
            fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          عرض كل الطلبات
        </button>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function paginationBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "0.45rem 1.1rem", borderRadius: 8,
    border: "1px solid #e2e8f0",
    backgroundColor: disabled ? "#f8fafc" : "#fff",
    color: disabled ? "#94a3b8" : "#1e293b",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.82rem", fontWeight: 600, fontFamily: "inherit",
  };
}
