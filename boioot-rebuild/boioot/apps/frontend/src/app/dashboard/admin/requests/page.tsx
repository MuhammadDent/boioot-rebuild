"use client";

import {
  useState, useEffect, useCallback, useMemo,
  type CSSProperties, type ReactNode,
} from "react";
import { useProtectedRoute }    from "@/hooks/useProtectedRoute";
import { DashboardBackLink }    from "@/components/dashboard/DashboardBackLink";
import { InlineBanner }         from "@/components/dashboard/InlineBanner";
import { LoadingRow }           from "@/components/dashboard/LoadingRow";
import { adminApi }             from "@/features/admin/api";
import { ADMIN_PAGE_SIZE }      from "@/features/admin/constants";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_OPTIONS,
} from "@/features/dashboard/requests/constants";
import { normalizeError }   from "@/lib/api";
import type { RequestResponse } from "@/types";

import {
  DEFAULT_BASE_FILTERS,
  type BaseFilters, type IsolationState, type EnrichedRequest,
} from "./_types";
import {
  enrichRequest, applyBaseFilters, applyIsolation,
  sortRequests, buildFilterOptions,
} from "./_helpers";
import { AnalyticsSection } from "./_analytics";
import { RequestModal }     from "./_modal";

// ─── Constants ────────────────────────────────────────────────────────────────
const FETCH_SIZE = 500;

const STATUS_PALETTE: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  all:       { bg: "#f8fafc", text: "#475569", border: "#e2e8f0", accent: "#64748b" },
  New:       { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", accent: "#1d4ed8" },
  Contacted: { bg: "#fffbeb", text: "#92400e", border: "#fde68a", accent: "#d97706" },
  Qualified: { bg: "#f0fdf4", text: "#15803d", border: "#86efac", accent: "#16a34a" },
  Closed:    { bg: "#f8fafc", text: "#64748b", border: "#cbd5e1", accent: "#64748b" },
};

const KPI_TABS = [
  { key: "all", label: "الكل" },
  ...REQUEST_STATUS_OPTIONS.map(s => ({ key: s, label: REQUEST_STATUS_LABELS[s] })),
];

const SORT_LABELS: Record<string, string> = {
  newest:      "الأحدث أولاً",
  oldest:      "الأقدم أولاً",
  "name-asc":  "الاسم أ → ي",
  "name-desc": "الاسم ي → أ",
};

const selectStyle: CSSProperties = {
  padding: "0.45rem 0.65rem", borderRadius: 8,
  border: "1px solid #e2e8f0", backgroundColor: "#f8fafc",
  fontSize: "0.82rem", fontFamily: "inherit", color: "#0f172a",
  cursor: "pointer", width: "100%",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminRequestsPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "requests.view" });

  // ── Raw data ──────────────────────────────────────────────────────────────
  const [allRequests, setAllRequests] = useState<RequestResponse[]>([]);
  const [fetching, setFetching]       = useState(true);
  const [fetchError, setFetchError]   = useState("");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [filtersOpen,    setFiltersOpen]    = useState(true);
  const [analyticsOpen,  setAnalyticsOpen]  = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestResponse | null>(null);
  const [page, setPage] = useState(1);

  // ── Base filters (global filter panel) ───────────────────────────────────
  const [baseFilters, setBaseFilters] = useState<BaseFilters>(DEFAULT_BASE_FILTERS);

  // ── Analytics state ───────────────────────────────────────────────────────
  const [groupBy,   setGroupBy]   = useState("status");
  const [isolation, setIsolation] = useState<IsolationState>({});

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await adminApi.getRequests(1, FETCH_SIZE, {});
      setAllRequests(result.items);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { if (!isLoading && user) load(); }, [isLoading, user, load]);
  useEffect(() => { setPage(1); }, [baseFilters, isolation]);

  if (isLoading || !user) return null;

  // ── Derived: enriched ─────────────────────────────────────────────────────
  const enriched = useMemo(() => allRequests.map(enrichRequest), [allRequests]);

  // ── Derived: filter options (from ALL enriched, for consistent dropdowns) ─
  const options = useMemo(() => buildFilterOptions(enriched), [enriched]);

  // ── Derived: base filtered ────────────────────────────────────────────────
  const baseFiltered = useMemo(
    () => applyBaseFilters(enriched, baseFilters),
    [enriched, baseFilters],
  );

  // ── Derived: fully filtered = base + isolation ────────────────────────────
  const fullyFiltered = useMemo(
    () => applyIsolation(baseFiltered, isolation),
    [baseFiltered, isolation],
  );

  // ── Derived: sorted + paginated ───────────────────────────────────────────
  const sorted     = useMemo(() => sortRequests(fullyFiltered, baseFilters.sortBy), [fullyFiltered, baseFilters.sortBy]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / ADMIN_PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE);

  // ── Derived: KPI counts (from fullyFiltered) ──────────────────────────────
  const kpis = useMemo(() => {
    const c: Record<string, number> = { all: fullyFiltered.length };
    for (const s of REQUEST_STATUS_OPTIONS) c[s] = fullyFiltered.filter(r => r.status === s).length;
    return c;
  }, [fullyFiltered]);

  // ── Analytics handlers ────────────────────────────────────────────────────
  function handleSegmentClick(rawValue: string) {
    setIsolation(prev => {
      if (prev[groupBy] === rawValue) {
        const next = { ...prev };
        delete next[groupBy];
        return next;
      }
      return { ...prev, [groupBy]: rawValue };
    });
  }

  function handleIsolationRemove(key: string) {
    setIsolation(prev => { const n = { ...prev }; delete n[key]; return n; });
  }

  // ── Base filter helpers ───────────────────────────────────────────────────
  function setFilter<K extends keyof BaseFilters>(key: K, value: BaseFilters[K]) {
    setBaseFilters(prev => ({ ...prev, [key]: value }));
  }

  const baseChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (baseFilters.status !== "all")  baseChips.push({ key: "status",   label: `الحالة: ${REQUEST_STATUS_LABELS[baseFilters.status] ?? baseFilters.status}`, onRemove: () => setFilter("status", "all") });
  if (baseFilters.search.trim())     baseChips.push({ key: "search",   label: `بحث: "${baseFilters.search.trim()}"`,                                        onRemove: () => setFilter("search", "") });
  if (baseFilters.city)              baseChips.push({ key: "city",     label: `المدينة: ${baseFilters.city}`,                                               onRemove: () => setFilter("city", "") });
  if (baseFilters.district)          baseChips.push({ key: "district", label: `الحي: ${baseFilters.district}`,                                              onRemove: () => setFilter("district", "") });
  if (baseFilters.propType)          baseChips.push({ key: "propType", label: `نوع العقار: ${baseFilters.propType}`,                                        onRemove: () => setFilter("propType", "") });
  if (baseFilters.rooms)             baseChips.push({ key: "rooms",    label: `الغرف: ${baseFilters.rooms}`,                                               onRemove: () => setFilter("rooms", "") });
  if (baseFilters.company)           baseChips.push({ key: "company",  label: baseFilters.company,                                                          onRemove: () => setFilter("company", "") });
  if (baseFilters.sortBy !== "newest") baseChips.push({ key: "sort",  label: `ترتيب: ${SORT_LABELS[baseFilters.sortBy]}`,                                  onRemove: () => setFilter("sortBy", "newest") });

  const hasBaseFilters = baseChips.length > 0;
  const hasIsolation   = Object.keys(isolation).length > 0;

  function resetAll() {
    setBaseFilters(DEFAULT_BASE_FILTERS);
    setIsolation({});
    setPage(1);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", direction: "rtl" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem 4rem" }}>

        {/* ═══ Header ════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: "1.25rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", flexWrap: "wrap",
            gap: "0.5rem", marginTop: "0.3rem",
          }}>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                ردود الإعلانات والاستفسارات
              </h1>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                إدارة جميع استفسارات العملاء · تحليل التوزيعات وتعمّق في البيانات
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              {!fetching && (
                <span style={{
                  backgroundColor: (hasBaseFilters || hasIsolation) ? "#eff6ff" : "#f1f5f9",
                  color: (hasBaseFilters || hasIsolation) ? "#1d4ed8" : "#475569",
                  padding: "0.3rem 0.85rem", borderRadius: 20,
                  fontSize: "0.82rem", fontWeight: 700,
                }}>
                  {fullyFiltered.length}
                  {fullyFiltered.length !== allRequests.length ? ` من ${allRequests.length}` : ""} طلب
                </span>
              )}
              {!fetching && allRequests.length > 0 && (
                <button
                  onClick={() => setAnalyticsOpen(v => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.35rem",
                    padding: "0.4rem 0.9rem", borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    backgroundColor: analyticsOpen ? "#7c3aed" : "#fff",
                    color: analyticsOpen ? "#fff" : "#475569",
                    fontSize: "0.82rem", fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  📊 التحليلات
                  {hasIsolation && (
                    <span style={{
                      backgroundColor: "rgba(255,255,255,0.25)", color: analyticsOpen ? "#fff" : "#7c3aed",
                      borderRadius: 10, padding: "0 0.4rem", fontSize: "0.72rem", fontWeight: 800,
                    }}>
                      {Object.keys(isolation).length}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setFiltersOpen(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: "0.35rem",
                  padding: "0.4rem 0.9rem", borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  backgroundColor: filtersOpen ? "#0f172a" : "#fff",
                  color: filtersOpen ? "#fff" : "#475569",
                  fontSize: "0.82rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                🔍 الفلاتر
                {hasBaseFilters && (
                  <span style={{
                    backgroundColor: filtersOpen ? "rgba(255,255,255,0.25)" : "#ef4444",
                    color: "#fff", borderRadius: 10,
                    padding: "0 0.4rem", fontSize: "0.72rem", fontWeight: 800,
                  }}>
                    {baseChips.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <InlineBanner message={fetchError} />

        {/* ═══ Global Filter Panel ═══════════════════════════════════════════ */}
        {!fetching && filtersOpen && (
          <div style={{
            backgroundColor: "#fff", border: "1px solid #e2e8f0",
            borderRadius: 14, padding: "1.1rem 1.25rem",
            marginBottom: "1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}>
            {/* Search */}
            <div style={{ position: "relative", marginBottom: "0.85rem" }}>
              <span style={{
                position: "absolute", top: "50%", right: "0.75rem",
                transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none",
              }}>🔍</span>
              <input
                type="text"
                placeholder="ابحث بالاسم، الهاتف، البريد، العقار، الشركة..."
                value={baseFilters.search}
                onChange={e => setFilter("search", e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.55rem 2.2rem 0.55rem 0.75rem",
                  borderRadius: 9, border: "1px solid #e2e8f0",
                  fontSize: "0.85rem", fontFamily: "inherit",
                  backgroundColor: "#f8fafc", color: "#0f172a", outline: "none",
                }}
              />
              {baseFilters.search && (
                <button onClick={() => setFilter("search", "")} style={{
                  position: "absolute", top: "50%", left: "0.6rem",
                  transform: "translateY(-50%)", background: "none", border: "none",
                  color: "#94a3b8", cursor: "pointer", fontSize: "1rem", lineHeight: 1, padding: 0,
                }}>×</button>
              )}
            </div>

            {/* Dropdowns grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.6rem", marginBottom: "0.75rem" }}>
              <FilterSelect label="الحالة"      value={baseFilters.status}   onChange={v => setFilter("status", v)}>
                <option value="all">كل الحالات</option>
                {REQUEST_STATUS_OPTIONS.map(s => <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>)}
              </FilterSelect>

              <FilterSelect label="المدينة"     value={baseFilters.city}     onChange={v => setFilter("city", v)}>
                <option value="">كل المدن</option>
                {options.cities.map(c => <option key={c} value={c}>{c}</option>)}
              </FilterSelect>

              <FilterSelect label="الحي"        value={baseFilters.district} onChange={v => setFilter("district", v)}>
                <option value="">كل الأحياء</option>
                {options.districts.map(d => <option key={d} value={d}>{d}</option>)}
              </FilterSelect>

              <FilterSelect label="نوع العقار"  value={baseFilters.propType} onChange={v => setFilter("propType", v)}>
                <option value="">كل الأنواع</option>
                {options.propTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </FilterSelect>

              <FilterSelect label="عدد الغرف"   value={baseFilters.rooms}    onChange={v => setFilter("rooms", v)}>
                <option value="">كل الغرف</option>
                {options.rooms.map(r => <option key={r} value={r}>{r}</option>)}
              </FilterSelect>

              <FilterSelect label="الشركة"      value={baseFilters.company}  onChange={v => setFilter("company", v)}>
                <option value="">كل الشركات</option>
                {options.companies.map(c => <option key={c} value={c}>{c}</option>)}
              </FilterSelect>

              <FilterSelect label="الترتيب"     value={baseFilters.sortBy}   onChange={v => setFilter("sortBy", v)}>
                {Object.entries(SORT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </FilterSelect>
            </div>

            {/* Active base filter chips */}
            {baseChips.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                {baseChips.map(chip => (
                  <span key={chip.key} style={{
                    display: "inline-flex", alignItems: "center", gap: "0.3rem",
                    backgroundColor: "#f1f5f9", color: "#475569",
                    borderRadius: 20, padding: "0.2rem 0.5rem 0.2rem 0.7rem",
                    fontSize: "0.78rem", fontWeight: 600, border: "1px solid #e2e8f0",
                  }}>
                    {chip.label}
                    <button onClick={chip.onRemove} style={{
                      background: "none", border: "none", color: "#94a3b8",
                      cursor: "pointer", fontSize: "0.9rem", lineHeight: 1,
                      padding: "0 0.1rem", fontFamily: "inherit",
                    }}>×</button>
                  </span>
                ))}
                <button onClick={() => { setBaseFilters(DEFAULT_BASE_FILTERS); }} style={{
                  marginRight: "auto",
                  padding: "0.25rem 0.7rem", borderRadius: 8,
                  border: "1px solid #fecaca", backgroundColor: "#fef2f2",
                  color: "#dc2626", fontSize: "0.77rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                  × إعادة ضبط الفلاتر
                </button>
              </div>
            )}
          </div>
        )}

        {/* ═══ KPI Cards ════════════════════════════════════════════════════ */}
        {!fetching && allRequests.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "0.75rem", marginBottom: "1.5rem",
          }}>
            {KPI_TABS.map(({ key, label }) => (
              <KpiCard
                key={key}
                label={label}
                value={kpis[key] ?? 0}
                palette={STATUS_PALETTE[key] ?? STATUS_PALETTE.all}
                active={baseFilters.status === key}
                onClick={() => setFilter("status", key)}
              />
            ))}
          </div>
        )}

        {/* ═══ Analytics Section (interactive, drill-down) ═══════════════════ */}
        {!fetching && analyticsOpen && allRequests.length > 0 && (
          <AnalyticsSection
            fullyFiltered={fullyFiltered as EnrichedRequest[]}
            baseFilteredCount={baseFiltered.length}
            groupBy={groupBy}
            isolation={isolation}
            onGroupByChange={setGroupBy}
            onIsolationRemove={handleIsolationRemove}
            onIsolationClearAll={() => setIsolation({})}
            onSegmentClick={handleSegmentClick}
          />
        )}

        {/* ═══ Results Section ══════════════════════════════════════════════ */}
        {!fetching && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>
              النتائج
            </span>
            <span style={{
              fontSize: "0.78rem", color: "#94a3b8",
              borderRight: "1px solid #e2e8f0", paddingRight: "0.75rem",
            }}>
              {sorted.length !== allRequests.length
                ? `${sorted.length} طلب من أصل ${allRequests.length}`
                : `${sorted.length} طلب`}
            </span>
            {(hasBaseFilters || hasIsolation) && (
              <button onClick={resetAll} style={{
                marginRight: "auto",
                padding: "0.25rem 0.7rem", borderRadius: 8,
                border: "1px solid #fecaca", backgroundColor: "#fef2f2",
                color: "#dc2626", fontSize: "0.77rem", fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                × مسح كل الفلاتر
              </button>
            )}
          </div>
        )}

        {/* ═══ Loading ═══════════════════════════════════════════════════════ */}
        {fetching && <LoadingRow />}

        {/* ═══ Empty ════════════════════════════════════════════════════════ */}
        {!fetching && paginated.length === 0 && (
          <EmptyState isFiltered={hasBaseFilters || hasIsolation} onReset={resetAll} />
        )}

        {/* ═══ Request Cards ════════════════════════════════════════════════ */}
        {!fetching && paginated.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {paginated.map(r => (
              <RequestCard
                key={r.id}
                request={r}
                searchQuery={baseFilters.search}
                onClick={() => setSelectedRequest(r)}
              />
            ))}
          </div>
        )}

        {/* ═══ Pagination ═══════════════════════════════════════════════════ */}
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

        {/* ═══ Request Detail Modal ═════════════════════════════════════════ */}
        <RequestModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />

      </div>
    </div>
  );
}

// ─── FilterSelect helper ──────────────────────────────────────────────────────
function FilterSelect({
  label, value, onChange, children,
}: {
  label: string; value: string; onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
      <label style={{ fontSize: "0.71rem", fontWeight: 600, color: "#64748b" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>
        {children}
      </select>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, palette, active, onClick,
}: {
  label: string; value: number;
  palette: { bg: string; text: string; border: string; accent: string };
  active: boolean; onClick: () => void;
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
function RequestCard({
  request: r, searchQuery, onClick,
}: {
  request: RequestResponse; searchQuery: string; onClick: () => void;
}) {
  const subject     = r.propertyTitle ?? r.projectTitle;
  const subjectType = r.propertyTitle ? "عقار" : r.projectTitle ? "مشروع" : null;
  const initials    = r.name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("");
  const hue         = r.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const pal         = STATUS_PALETTE[r.status] ?? STATUS_PALETTE.Closed;

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
    <div
      onClick={onClick}
      style={{
        backgroundColor: "#fff", borderRadius: 14,
        border: "1px solid #e2e8f0", padding: "1.1rem 1.25rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        display: "flex", gap: "1rem", alignItems: "flex-start",
        cursor: "pointer", transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.10)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "#c7d2fe";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0";
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
        backgroundColor: `hsl(${hue}, 55%, 88%)`, color: `hsl(${hue}, 55%, 32%)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.88rem", fontWeight: 800, userSelect: "none",
      }}>
        {initials || "؟"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>{mark(r.name)}</span>
          <span style={{
            backgroundColor: pal.bg, color: pal.text, border: `1px solid ${pal.border}`,
            borderRadius: 20, padding: "0.1rem 0.65rem", fontSize: "0.74rem", fontWeight: 700,
          }}>
            {REQUEST_STATUS_LABELS[r.status] ?? r.status}
          </span>
          <span style={{ marginRight: "auto", fontSize: "0.75rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
            {new Date(r.createdAt).toLocaleDateString("en-GB", { year: "numeric", month: "numeric", day: "numeric" })}
          </span>
        </div>

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
        {isFiltered ? "لا توجد ردود مطابقة" : "لا توجد ردود بعد"}
      </p>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#64748b" }}>
        {isFiltered ? "جرّب تغيير معايير البحث أو إعادة ضبط الفلاتر" : "ستظهر هنا ردود العملاء على الإعلانات عند وصولها"}
      </p>
      {isFiltered && (
        <button onClick={onReset} style={{
          backgroundColor: "var(--color-primary)", color: "#fff",
          border: "none", borderRadius: 10, padding: "0.6rem 1.5rem",
          fontSize: "0.88rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        }}>
          إعادة ضبط الكل
        </button>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function paginationBtnStyle(disabled: boolean): CSSProperties {
  return {
    padding: "0.45rem 1.1rem", borderRadius: 8, border: "1px solid #e2e8f0",
    backgroundColor: disabled ? "#f8fafc" : "#fff",
    color: disabled ? "#94a3b8" : "#1e293b",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.82rem", fontWeight: 600, fontFamily: "inherit",
  };
}
