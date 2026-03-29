"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  MessageSquare, Clock, CheckCircle2, XCircle,
  Search, RotateCcw, Building2, Briefcase, LayoutGrid,
  TrendingUp, Users, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
  dashboardRequestsApi,
} from "@/features/dashboard/requests/api";
// TODO(stabilization): MOCK_REQUESTS import removed — real empty state is shown instead
// import { MOCK_REQUESTS } from "@/features/dashboard/requests/mockData";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_BADGE,
  REQUEST_STATUS_OPTIONS,
} from "@/features/dashboard/requests/constants";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { normalizeError } from "@/lib/api";
import type { DashboardRequestItem } from "@/types";

const PAGE_SIZE = 12;
const FETCH_SIZE = 500;

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardRequestsPage() {
  const { user, isLoading } = useProtectedRoute({
    allowedRoles: ["Admin", "CompanyOwner", "Agent"],
  });

  const [allRequests, setAllRequests] = useState<DashboardRequestItem[]>([]);
  const [fetching, setFetching]       = useState(true);
  const [fetchError, setFetchError]   = useState("");

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sortBy, setSortBy]           = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(async () => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await dashboardRequestsApi.getList(1, FETCH_SIZE);
      // TODO(stabilization): MOCK_REQUESTS removed — always show real data (empty or not)
      setAllRequests(result.items ?? []);
    } catch (e) {
      setFetchError(normalizeError(e));
      setAllRequests([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load();
  }, [isLoading, user, load]);

  // ── Analytics (computed from real data) ────────────────────────────────────
  const kpis = useMemo(() => {
    const total      = allRequests.length;
    const newReqs    = allRequests.filter(r => r.status === "New").length;
    const contacted  = allRequests.filter(r => r.status === "Contacted").length;
    const qualified  = allRequests.filter(r => r.status === "Qualified").length;
    const closed     = allRequests.filter(r => r.status === "Closed").length;
    const withProp   = allRequests.filter(r => r.propertyTitle).length;
    const withProj   = allRequests.filter(r => r.projectTitle).length;
    const sevenDays  = allRequests.filter(r => {
      const d = new Date(r.createdAt);
      return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }).length;
    return { total, newReqs, contacted, qualified, closed, withProp, withProj, sevenDays };
  }, [allRequests]);

  const statusDist = useMemo(() => {
    return REQUEST_STATUS_OPTIONS.map(s => ({
      status: s,
      label: REQUEST_STATUS_LABELS[s] ?? s,
      count: allRequests.filter(r => r.status === s).length,
      pct:   allRequests.length ? Math.round(allRequests.filter(r => r.status === s).length / allRequests.length * 100) : 0,
    }));
  }, [allRequests]);

  // ── Filtered + sorted list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...allRequests];
    if (statusFilter !== "all")
      list = list.filter(r => r.status === statusFilter);
    if (subjectFilter === "property")
      list = list.filter(r => !!r.propertyTitle);
    if (subjectFilter === "project")
      list = list.filter(r => !!r.projectTitle);
    if (search.trim())
      list = list.filter(r =>
        r.name.includes(search) || r.phone.includes(search) ||
        (r.propertyTitle ?? "").includes(search) ||
        (r.projectTitle ?? "").includes(search)
      );
    list.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    return list;
  }, [allRequests, statusFilter, subjectFilter, search, sortBy]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage    = Math.min(currentPage, totalPages);
  const paginated   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setSubjectFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
  }

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, subjectFilter, sortBy]);

  if (isLoading || !user) return null;

  const statusColors: Record<string, { bar: string; badge: string }> = {
    New:       { bar: "#3b82f6", badge: "bg-blue-100 text-blue-700" },
    Contacted: { bar: "#f59e0b", badge: "bg-amber-100 text-amber-700" },
    Qualified: { bar: "#10b981", badge: "bg-emerald-100 text-emerald-700" },
    Closed:    { bar: "#6b7280", badge: "bg-gray-100 text-gray-600" },
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", direction: "rtl" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem 4rem" }}>

        {/* ═══ 1. Header ══════════════════════════════════════════════════════ */}
        <div className="mb-6">
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <div className="flex items-start justify-between gap-4 flex-wrap mt-1">
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                ردود الإعلانات والاستفسارات
              </h1>
              <p style={{ margin: "0.3rem 0 0", fontSize: "0.88rem", color: "#64748b" }}>
                إدارة وتحليل ردود العملاء على الإعلانات وتتبّع حالاتها
              </p>
            </div>
            {kpis.total > 0 && (
              <span style={{
                backgroundColor: "#f1f5f9", color: "#475569",
                padding: "0.3rem 0.85rem", borderRadius: 20,
                fontSize: "0.82rem", fontWeight: 700,
              }}>
                {kpis.total} رد إجمالاً
              </span>
            )}
          </div>
        </div>

        <InlineBanner message={fetchError} />

        {/* ═══ 2. KPI Cards ═══════════════════════════════════════════════════ */}
        {!fetching && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <KpiCard
              icon={<MessageSquare size={18} />}
              label="إجمالي ردود الإعلانات"
              value={kpis.total}
              accent="slate"
            />
            <KpiCard
              icon={<TrendingUp size={18} />}
              label="ردود الإعلانات هذا الأسبوع"
              value={kpis.sevenDays}
              accent="blue"
            />
            <KpiCard
              icon={<Clock size={18} />}
              label="جديد"
              value={kpis.newReqs}
              accent="indigo"
            />
            <KpiCard
              icon={<Users size={18} />}
              label="تم التواصل"
              value={kpis.contacted}
              accent="amber"
            />
            <KpiCard
              icon={<CheckCircle2 size={18} />}
              label="مؤهّل"
              value={kpis.qualified}
              accent="green"
            />
            <KpiCard
              icon={<XCircle size={18} />}
              label="مغلق"
              value={kpis.closed}
              accent="gray"
            />
          </div>
        )}

        {/* ═══ 3. Filters Panel ═══════════════════════════════════════════════ */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}>
          <div className="flex items-center justify-between mb-4" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
              البحث والفلترة
            </h2>
            <button
              onClick={resetFilters}
              style={{
                display: "flex", alignItems: "center", gap: "0.35rem",
                fontSize: "0.8rem", color: "#64748b",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <RotateCcw size={14} />
              إعادة ضبط
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", top: "50%", right: "0.75rem",
                transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none",
              }}>
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="ابحث بالاسم أو الهاتف..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "0.55rem 2.2rem 0.55rem 0.85rem",
                  borderRadius: 10, border: "1.5px solid #e2e8f0",
                  fontSize: "0.85rem", fontFamily: "inherit", direction: "rtl",
                  outline: "none", boxSizing: "border-box",
                  backgroundColor: "#f8fafc",
                }}
              />
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="form-input"
              style={{ fontSize: "0.85rem", backgroundColor: "#f8fafc" }}
            >
              <option value="all">كل الحالات</option>
              {REQUEST_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>
              ))}
            </select>

            {/* Subject type */}
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="form-input"
              style={{ fontSize: "0.85rem", backgroundColor: "#f8fafc" }}
            >
              <option value="all">كل الأنواع</option>
              <option value="property">طلبات العقارات</option>
              <option value="project">طلبات المشاريع</option>
              <option value="general">طلبات عامة</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="form-input"
              style={{ fontSize: "0.85rem", backgroundColor: "#f8fafc" }}
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="oldest">الأقدم أولاً</option>
            </select>
          </div>

          {/* Active filter chips */}
          {(statusFilter !== "all" || subjectFilter !== "all" || search) && (
            <div className="flex gap-2 flex-wrap mt-3">
              {search && (
                <Chip label={`بحث: "${search}"`} onRemove={() => setSearch("")} />
              )}
              {statusFilter !== "all" && (
                <Chip label={REQUEST_STATUS_LABELS[statusFilter] ?? statusFilter} onRemove={() => setStatusFilter("all")} />
              )}
              {subjectFilter !== "all" && (
                <Chip
                  label={subjectFilter === "property" ? "عقارات" : subjectFilter === "project" ? "مشاريع" : "عامة"}
                  onRemove={() => setSubjectFilter("all")}
                />
              )}
              <span style={{ fontSize: "0.78rem", color: "#64748b", alignSelf: "center" }}>
                {filtered.length} نتيجة
              </span>
            </div>
          )}
        </div>

        {/* ═══ 4. Insights ════════════════════════════════════════════════════ */}
        {!fetching && kpis.total > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">

            {/* Status distribution */}
            <div style={{
              backgroundColor: "#fff", borderRadius: 16,
              border: "1px solid #e2e8f0", padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>
                ردود الإعلانات حسب الحالة
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                {statusDist.map(({ status, label, count, pct }) => (
                  <div key={status}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                      <span style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 7, backgroundColor: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        backgroundColor: statusColors[status]?.bar ?? "#94a3b8",
                        borderRadius: 99,
                        transition: "width 0.4s ease",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject distribution */}
            <div style={{
              backgroundColor: "#fff", borderRadius: 16,
              border: "1px solid #e2e8f0", padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <h3 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#1e293b" }}>
                ردود الإعلانات حسب النوع
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                {[
                  { label: "ردود عقارات", count: kpis.withProp, icon: <Building2 size={16} />, color: "#2563eb" },
                  { label: "ردود مشاريع", count: kpis.withProj, icon: <Briefcase size={16} />, color: "#7c3aed" },
                  {
                    label: "ردود عامة",
                    count: kpis.total - kpis.withProp - kpis.withProj,
                    icon: <LayoutGrid size={16} />,
                    color: "#0891b2",
                  },
                ].map(({ label, count, icon, color }) => {
                  const pct = kpis.total ? Math.round(count / kpis.total * 100) : 0;
                  return (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                          <span style={{ color }}>{icon}</span>
                          {label}
                        </span>
                        <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 7, backgroundColor: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${pct}%`,
                          backgroundColor: color, borderRadius: 99,
                          transition: "width 0.4s ease",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ═══ 5. Results ═════════════════════════════════════════════════════ */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem",
        }}>
          <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
            قائمة ردود الإعلانات
          </h2>
          {!fetching && (
            <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
              {filtered.length} رد — صفحة {safePage} من {totalPages}
            </span>
          )}
        </div>

        {fetching && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                height: 96, borderRadius: 14,
                background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
              }} />
            ))}
          </div>
        )}

        {!fetching && !fetchError && filtered.length === 0 && (
          <EmptyState hasFilters={statusFilter !== "all" || subjectFilter !== "all" || !!search} onReset={resetFilters} />
        )}

        {!fetching && filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {paginated.map(r => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && !fetching && (
          <div style={{
            display: "flex", justifyContent: "center", alignItems: "center",
            gap: "0.5rem", marginTop: "2rem",
          }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              style={{
                display: "flex", alignItems: "center", gap: "0.25rem",
                padding: "0.45rem 1rem", borderRadius: 8,
                border: "1.5px solid #e2e8f0", backgroundColor: "#fff",
                cursor: safePage <= 1 ? "not-allowed" : "pointer",
                opacity: safePage <= 1 ? 0.5 : 1, fontSize: "0.85rem",
                color: "#475569", fontFamily: "inherit",
              }}
            >
              <ChevronRight size={16} />
              السابق
            </button>

            <div style={{ display: "flex", gap: "0.35rem" }}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, safePage - 2);
                const p = start + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      border: "1.5px solid",
                      borderColor: p === safePage ? "var(--color-primary)" : "#e2e8f0",
                      backgroundColor: p === safePage ? "var(--color-primary)" : "#fff",
                      color: p === safePage ? "#fff" : "#475569",
                      cursor: "pointer", fontWeight: p === safePage ? 700 : 400,
                      fontSize: "0.85rem", fontFamily: "inherit",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              style={{
                display: "flex", alignItems: "center", gap: "0.25rem",
                padding: "0.45rem 1rem", borderRadius: 8,
                border: "1.5px solid #e2e8f0", backgroundColor: "#fff",
                cursor: safePage >= totalPages ? "not-allowed" : "pointer",
                opacity: safePage >= totalPages ? 0.5 : 1, fontSize: "0.85rem",
                color: "#475569", fontFamily: "inherit",
              }}
            >
              التالي
              <ChevronLeft size={16} />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const kpiAccents: Record<string, { bg: string; color: string; border: string }> = {
  slate:  { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
  blue:   { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  indigo: { bg: "#eef2ff", color: "#4f46e5", border: "#c7d2fe" },
  amber:  { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  green:  { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  gray:   { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" },
};

function KpiCard({ icon, label, value, accent = "slate" }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: string;
}) {
  const colors = kpiAccents[accent] ?? kpiAccents.slate;
  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: 14,
      border: "1px solid #f1f5f9",
      padding: "1rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        backgroundColor: colors.bg, border: `1px solid ${colors.border}`,
        color: colors.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: "0.65rem",
      }}>
        {icon}
      </div>
      <p style={{
        margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#0f172a",
        direction: "ltr", textAlign: "right", lineHeight: 1,
      }}>
        {value.toLocaleString("en")}
      </p>
      <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
        {label}
      </p>
    </div>
  );
}

// ─── Request Card ─────────────────────────────────────────────────────────────

function RequestCard({ request: r }: { request: DashboardRequestItem }) {
  const subject      = r.propertyTitle ?? r.projectTitle;
  const subjectLabel = r.propertyTitle ? "عقار" : r.projectTitle ? "مشروع" : null;

  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: 14,
      border: "1px solid #e2e8f0",
      padding: "1rem 1.25rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      transition: "box-shadow 0.15s",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: "1rem", flexWrap: "wrap",
      }}>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Name + Status */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              backgroundColor: "var(--color-primary)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.85rem", fontWeight: 700, flexShrink: 0,
            }}>
              {r.name.charAt(0)}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
                {r.name}
              </p>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", direction: "ltr" }}>
                {r.phone}
              </p>
            </div>
            <span className={REQUEST_STATUS_BADGE[r.status] ?? "badge badge-gray"} style={{ marginRight: "auto" }}>
              {REQUEST_STATUS_LABELS[r.status] ?? r.status}
            </span>
          </div>

          {/* Subject */}
          {subjectLabel && subject && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.35rem",
              backgroundColor: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 8, padding: "0.2rem 0.65rem", marginBottom: "0.4rem",
            }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                {subjectLabel}:
              </span>
              <span style={{
                fontSize: "0.78rem", color: "#1e293b", fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220,
              }}>
                {subject}
              </span>
            </div>
          )}

          {/* Date */}
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>
            {new Date(r.createdAt).toLocaleDateString("ar-SY", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 }}>
          <Link
            href={`/dashboard/requests/${r.id}`}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              gap: "0.35rem", padding: "0.45rem 1rem",
              borderRadius: 8, border: "1.5px solid var(--color-primary)",
              backgroundColor: "var(--color-primary)", color: "#fff",
              textDecoration: "none", fontSize: "0.82rem", fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            عرض التفاصيل
          </Link>
        </div>

      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onReset }: { hasFilters: boolean; onReset: () => void }) {
  return (
    <div style={{
      backgroundColor: "#fff", borderRadius: 16,
      border: "1px solid #e2e8f0", padding: "3rem 2rem",
      textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        width: 60, height: 60, borderRadius: 16,
        backgroundColor: "#f1f5f9", margin: "0 auto 1rem",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <MessageSquare size={28} color="#94a3b8" />
      </div>
      <p style={{ margin: "0 0 0.35rem", fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>
        {hasFilters ? "لا توجد نتائج تطابق الفلاتر المختارة" : "لا توجد طلبات واستفسارات بعد"}
      </p>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#94a3b8" }}>
        {hasFilters ? "جرّب تعديل الفلاتر أو إعادة الضبط" : "ستظهر هنا طلبات العملاء عند ورودها"}
      </p>
      {hasFilters && (
        <button
          onClick={onReset}
          style={{
            padding: "0.5rem 1.25rem", borderRadius: 8,
            border: "1.5px solid var(--color-primary)",
            backgroundColor: "transparent", color: "var(--color-primary)",
            cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
            fontFamily: "inherit",
          }}
        >
          إعادة ضبط الفلاتر
        </button>
      )}
    </div>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.3rem",
      backgroundColor: "#f1f5f9", color: "#475569",
      padding: "0.2rem 0.65rem", borderRadius: 20,
      fontSize: "0.75rem", fontWeight: 600,
    }}>
      {label}
      <button
        onClick={onRemove}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#94a3b8", padding: 0, lineHeight: 1,
          fontFamily: "inherit", fontSize: "0.9rem",
        }}
      >
        ✕
      </button>
    </span>
  );
}
