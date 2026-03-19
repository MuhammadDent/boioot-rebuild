"use client";

import { useState, useEffect, useCallback, useMemo, type CSSProperties } from "react";
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

// ─── Palettes & labels ────────────────────────────────────────────────────────
const STATUS_PALETTE: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  all:       { bg: "#f8fafc", text: "#475569", border: "#e2e8f0", accent: "#64748b" },
  New:       { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", accent: "#1d4ed8" },
  Contacted: { bg: "#fffbeb", text: "#92400e", border: "#fde68a", accent: "#d97706" },
  Qualified: { bg: "#f0fdf4", text: "#15803d", border: "#86efac", accent: "#16a34a" },
  Closed:    { bg: "#f8fafc", text: "#64748b", border: "#cbd5e1", accent: "#64748b" },
};

const TYPE_LABELS: Record<string, string> = {
  all:      "كل الأنواع",
  property: "عقار",
  project:  "مشروع",
  general:  "عام",
};

const SORT_LABELS: Record<string, string> = {
  newest:   "الأحدث أولاً",
  oldest:   "الأقدم أولاً",
  "name-asc":  "الاسم أ → ي",
  "name-desc": "الاسم ي → أ",
  status:   "الحالة",
};

const STATUS_TABS = [
  { key: "all",       label: "الكل" },
  ...REQUEST_STATUS_OPTIONS.map(s => ({ key: s, label: REQUEST_STATUS_LABELS[s] })),
];

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function AdminRequestsPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "requests.view" });

  // ── Data state ───────────────────────────────────────────────────────────────
  const [allRequests, setAllRequests] = useState<RequestResponse[]>([]);
  const [fetching, setFetching]       = useState(true);
  const [fetchError, setFetchError]   = useState("");

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState("all");
  const [searchQuery,    setSearchQuery]    = useState("");
  const [typeFilter,     setTypeFilter]     = useState("all");
  const [companyFilter,  setCompanyFilter]  = useState("");
  const [sortBy,         setSortBy]         = useState("newest");
  const [panelOpen,      setPanelOpen]      = useState(true);  // desktop default open

  // ── Pagination state ─────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Load ─────────────────────────────────────────────────────────────────────
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

  // Reset page when any filter changes
  useEffect(() => { setPage(1); }, [activeTab, searchQuery, typeFilter, companyFilter, sortBy]);

  if (isLoading || !user) return null;

  // ── Derived: unique companies from data ───────────────────────────────────────
  const uniqueCompanies = useMemo(() => {
    const seen = new Set<string>();
    allRequests.forEach(r => { if (r.companyName) seen.add(r.companyName); });
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "ar"));
  }, [allRequests]);

  // ── Derived: KPI counts (always from full allRequests, tab-agnostic) ──────────
  const kpis = useMemo(() => {
    const c: Record<string, number> = { all: allRequests.length };
    for (const s of REQUEST_STATUS_OPTIONS) c[s] = allRequests.filter(r => r.status === s).length;
    return c;
  }, [allRequests]);

  // ── Derived: filtered + sorted list ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = activeTab === "all"
      ? allRequests
      : allRequests.filter(r => r.status === activeTab);

    // 1. Text search across all relevant fields
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.message?.toLowerCase().includes(q) ||
        r.propertyTitle?.toLowerCase().includes(q) ||
        r.projectTitle?.toLowerCase().includes(q) ||
        r.companyName?.toLowerCase().includes(q)
      );
    }

    // 2. Request type
    if (typeFilter !== "all") {
      list = list.filter(r =>
        typeFilter === "property" ?  !!r.propertyId :
        typeFilter === "project"  ?  !!r.projectId  :
        /* general */                !r.propertyId && !r.projectId
      );
    }

    // 3. Company
    if (companyFilter) {
      list = list.filter(r => r.companyName === companyFilter);
    }

    // 4. Sort
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "oldest":    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name-asc":  return a.name.localeCompare(b.name, "ar");
        case "name-desc": return b.name.localeCompare(a.name, "ar");
        case "status":    return (a.status ?? "").localeCompare(b.status ?? "");
        default:          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [allRequests, activeTab, searchQuery, typeFilter, companyFilter, sortBy]);

  // ── Pagination ───────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  // ── Active chips ─────────────────────────────────────────────────────────────
  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (activeTab !== "all")       chips.push({ key: "tab",     label: `الحالة: ${REQUEST_STATUS_LABELS[activeTab]}`, onRemove: () => setActiveTab("all") });
  if (searchQuery.trim())        chips.push({ key: "search",  label: `بحث: "${searchQuery.trim()}"`,               onRemove: () => setSearchQuery("") });
  if (typeFilter !== "all")      chips.push({ key: "type",    label: `النوع: ${TYPE_LABELS[typeFilter]}`,           onRemove: () => setTypeFilter("all") });
  if (companyFilter)             chips.push({ key: "company", label: companyFilter,                                 onRemove: () => setCompanyFilter("") });
  if (sortBy !== "newest")       chips.push({ key: "sort",    label: `ترتيب: ${SORT_LABELS[sortBy]}`,              onRemove: () => setSortBy("newest") });

  const hasActiveFilters = chips.length > 0;

  function resetAllFilters() {
    setActiveTab("all");
    setSearchQuery("");
    setTypeFilter("all");
    setCompanyFilter("");
    setSortBy("newest");
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", direction: "rtl" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem 4rem" }}>

        {/* ═══ Header ═══════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: "1.25rem" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              {!fetching && allRequests.length > 0 && (
                <span style={{
                  backgroundColor: "#f1f5f9", color: "#475569",
                  padding: "0.3rem 0.85rem", borderRadius: 20,
                  fontSize: "0.82rem", fontWeight: 700,
                }}>
                  {allRequests.length} طلب إجمالاً
                </span>
              )}
              {/* Mobile filter toggle */}
              <button
                onClick={() => setPanelOpen(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.35rem",
                  padding: "0.4rem 0.9rem", borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  backgroundColor: panelOpen ? "#0f172a" : "#fff",
                  color: panelOpen ? "#fff" : "#475569",
                  fontSize: "0.82rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                🔍 الفلاتر
                {hasActiveFilters && (
                  <span style={{
                    backgroundColor: panelOpen ? "rgba(255,255,255,0.25)" : "#ef4444",
                    color: "#fff", borderRadius: 10,
                    padding: "0 0.4rem", fontSize: "0.72rem", fontWeight: 800,
                  }}>
                    {chips.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <InlineBanner message={fetchError} />

        {/* ═══ Filter Panel ═════════════════════════════════════════════════════ */}
        {!fetching && panelOpen && (
          <div style={{
            backgroundColor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: "1.1rem 1.25rem",
            marginBottom: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            {/* Search */}
            <div style={{ marginBottom: "0.85rem" }}>
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", top: "50%", right: "0.75rem",
                  transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.9rem",
                  pointerEvents: "none",
                }}>
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الهاتف، البريد، العقار، الشركة..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "0.55rem 2.2rem 0.55rem 0.75rem",
                    borderRadius: 9, border: "1px solid #e2e8f0",
                    fontSize: "0.85rem", fontFamily: "inherit",
                    backgroundColor: "#f8fafc", color: "#0f172a",
                    outline: "none",
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute", top: "50%", left: "0.6rem",
                      transform: "translateY(-50%)",
                      background: "none", border: "none",
                      color: "#94a3b8", cursor: "pointer", fontSize: "1rem",
                      lineHeight: 1, padding: 0,
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Dropdowns row */}
            <div style={{
              display: "flex", gap: "0.6rem",
              flexWrap: "wrap", alignItems: "center",
            }}>
              {/* Request type */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: "1 1 130px" }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }}>نوع الطلب</label>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  style={selectStyle}
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Company */}
              {uniqueCompanies.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: "1 1 160px" }}>
                  <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }}>الشركة</label>
                  <select
                    value={companyFilter}
                    onChange={e => setCompanyFilter(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">كل الشركات</option>
                    {uniqueCompanies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: "1 1 150px" }}>
                <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64748b" }}>الترتيب</label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={selectStyle}
                >
                  {Object.entries(SORT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Reset button — aligned right */}
              {hasActiveFilters && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <label style={{ fontSize: "0.72rem", visibility: "hidden" }}>_</label>
                  <button
                    onClick={resetAllFilters}
                    style={{
                      padding: "0.45rem 1rem", borderRadius: 8,
                      border: "1px solid #fecaca",
                      backgroundColor: "#fef2f2", color: "#dc2626",
                      fontSize: "0.8rem", fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    × إعادة ضبط الكل
                  </button>
                </div>
              )}
            </div>

            {/* ── Active chips ── */}
            {chips.length > 0 && (
              <div style={{
                display: "flex", flexWrap: "wrap", gap: "0.4rem",
                marginTop: "0.85rem", paddingTop: "0.85rem",
                borderTop: "1px solid #f1f5f9",
              }}>
                {chips.map(chip => (
                  <span
                    key={chip.key}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "0.3rem",
                      backgroundColor: "#f1f5f9", color: "#475569",
                      borderRadius: 20, padding: "0.2rem 0.5rem 0.2rem 0.7rem",
                      fontSize: "0.78rem", fontWeight: 600, border: "1px solid #e2e8f0",
                    }}
                  >
                    {chip.label}
                    <button
                      onClick={chip.onRemove}
                      style={{
                        background: "none", border: "none",
                        color: "#94a3b8", cursor: "pointer",
                        fontSize: "0.85rem", lineHeight: 1,
                        padding: "0 0.1rem", fontFamily: "inherit",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ KPI Cards ════════════════════════════════════════════════════════ */}
        {!fetching && allRequests.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1.5rem",
          }}>
            {STATUS_TABS.map(({ key, label }) => (
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
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {/* Results count */}
            <div style={{
              display: "flex", alignItems: "center",
              fontSize: "0.8rem", color: "#64748b", marginLeft: "auto",
            }}>
              {filtered.length !== allRequests.length
                ? `${filtered.length} نتيجة من ${allRequests.length}`
                : `${filtered.length} طلب`}
            </div>
          </div>
        )}
        {!fetching && allRequests.length > 0 && (
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            {STATUS_TABS.map(({ key, label }) => {
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
                    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  }}
                >
                  {label}
                  <span style={{
                    backgroundColor: active ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                    color: active ? "#fff" : "#64748b",
                    borderRadius: 12, padding: "0 0.45rem",
                    fontSize: "0.72rem", fontWeight: 800, lineHeight: "1.6",
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
          <EmptyState isFiltered={hasActiveFilters} onReset={resetAllFilters} />
        )}

        {/* ═══ Request Cards ════════════════════════════════════════════════════ */}
        {!fetching && paginated.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {paginated.map(r => (
              <RequestCard key={r.id} request={r} searchQuery={searchQuery} />
            ))}
          </div>
        )}

        {/* ═══ Pagination ═══════════════════════════════════════════════════════ */}
        {!fetching && totalPages > 1 && (
          <div style={{
            display: "flex", justifyContent: "center",
            alignItems: "center", gap: "0.5rem", marginTop: "2rem",
          }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={paginationBtnStyle(page === 1)}>
              السابق
            </button>
            <span style={{ fontSize: "0.82rem", color: "#64748b", minWidth: 60, textAlign: "center" }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={paginationBtnStyle(page === totalPages)}>
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
      <span style={{ fontSize: "1.6rem", fontWeight: 800, color: active ? "#fff" : palette.text }}>
        {value}
      </span>
      <span style={{ fontSize: "0.76rem", fontWeight: 600, color: active ? "rgba(255,255,255,0.85)" : "#64748b" }}>
        {label}
      </span>
    </button>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────
function RequestCard({ request: r, searchQuery }: { request: RequestResponse; searchQuery: string }) {
  const subject     = r.propertyTitle ?? r.projectTitle;
  const subjectType = r.propertyTitle ? "عقار" : r.projectTitle ? "مشروع" : null;
  const initials    = r.name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("");
  const hue         = r.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const pal         = STATUS_PALETTE[r.status] ?? STATUS_PALETTE.Closed;

  // Highlight matching text
  const q = searchQuery.trim().toLowerCase();
  function mark(text: string) {
    if (!q || !text.toLowerCase().includes(q)) return <>{text}</>;
    const idx = text.toLowerCase().indexOf(q);
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ backgroundColor: "#fef08a", color: "#713f12", borderRadius: 3, padding: "0 1px" }}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <div style={{
      backgroundColor: "#fff", borderRadius: 14,
      border: "1px solid #e2e8f0", padding: "1.1rem 1.25rem",
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
            {mark(r.name)}
          </span>
          <span style={{
            backgroundColor: pal.bg, color: pal.text,
            borderRadius: 20, padding: "0.1rem 0.65rem",
            fontSize: "0.74rem", fontWeight: 700, border: `1px solid ${pal.border}`,
          }}>
            {REQUEST_STATUS_LABELS[r.status] ?? r.status}
          </span>
          <span style={{ marginRight: "auto", fontSize: "0.75rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
            {new Date(r.createdAt).toLocaleDateString("en-GB", { year: "numeric", month: "numeric", day: "numeric" })}
          </span>
        </div>

        {/* Row 2 — phone · email */}
        <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.82rem", color: "#475569", marginBottom: "0.3rem" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ color: "#94a3b8" }}>📞</span>{mark(r.phone)}
          </span>
          {r.email && (
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ color: "#94a3b8" }}>✉️</span>{mark(r.email)}
            </span>
          )}
        </div>

        {/* Row 3 — subject · company */}
        {(subject || r.companyName) && (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.8rem", color: "#64748b" }}>
            {subject && subjectType && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ color: "#94a3b8" }}>🏠</span>
                {subjectType}: <strong style={{ color: "#475569" }}>{mark(subject)}</strong>
              </span>
            )}
            {r.companyName && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ color: "#94a3b8" }}>🏢</span>{mark(r.companyName)}
              </span>
            )}
          </div>
        )}

        {/* Row 4 — message preview */}
        {r.message && (
          <p style={{
            margin: "0.4rem 0 0", fontSize: "0.81rem", color: "#64748b", lineHeight: 1.55,
            display: "-webkit-box", WebkitLineClamp: 2, overflow: "hidden",
          }}>
            {mark(r.message)}
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
      backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e2e8f0",
      padding: "3.5rem 1.5rem", textAlign: "center",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
      <p style={{ margin: "0 0 0.4rem", fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>
        {isFiltered ? "لا توجد طلبات مطابقة" : "لا توجد طلبات بعد"}
      </p>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#64748b" }}>
        {isFiltered ? "جرّب تغيير معايير البحث أو إعادة ضبط الفلاتر" : "ستظهر هنا الطلبات عند وصولها من العملاء"}
      </p>
      {isFiltered && (
        <button
          onClick={onReset}
          style={{
            backgroundColor: "var(--color-primary)", color: "#fff",
            border: "none", borderRadius: 10, padding: "0.6rem 1.5rem",
            fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          إعادة ضبط الفلاتر
        </button>
      )}
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const selectStyle: CSSProperties = {
  padding: "0.45rem 0.7rem", borderRadius: 8,
  border: "1px solid #e2e8f0", backgroundColor: "#f8fafc",
  fontSize: "0.82rem", fontFamily: "inherit", color: "#0f172a",
  cursor: "pointer", width: "100%",
};

function paginationBtnStyle(disabled: boolean): CSSProperties {
  return {
    padding: "0.45rem 1.1rem", borderRadius: 8, border: "1px solid #e2e8f0",
    backgroundColor: disabled ? "#f8fafc" : "#fff",
    color: disabled ? "#94a3b8" : "#1e293b",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.82rem", fontWeight: 600, fontFamily: "inherit",
  };
}
