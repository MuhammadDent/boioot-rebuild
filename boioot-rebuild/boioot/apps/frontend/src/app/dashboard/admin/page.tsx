"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { dashboardSummaryApi } from "@/features/dashboard/summary/api";
import { adminApi } from "@/features/admin/api";
import { STAFF_ROLE_LABELS } from "@/lib/rbac";
import type { DashboardAnalytics, AttentionListingItem } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────
type TimeFilter = "today" | "7d" | "30d";
const TIME_LABELS: Record<TimeFilter, string> = { today: "اليوم", "7d": "آخر 7 أيام", "30d": "آخر 30 يوم" };
const CHART_BARS: Record<TimeFilter, number> = { today: 1, "7d": 2, "30d": 6 };

type AlertLevel = "red" | "yellow" | "green";
type Alert = { level: AlertLevel; text: string; action?: { label: string; href: string } };

// ── Icons ──────────────────────────────────────────────────────────────────────
function Ico({ d, size = 18 }: { d: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>{d}</svg>
  );
}

// ── Alert computation ──────────────────────────────────────────────────────────
function computeAlerts(a: DashboardAnalytics, attentionCount: number): Alert[] {
  const alerts: Alert[] = [];
  if (a.newRequests > 0) alerts.push({ level: "yellow", text: `${a.newRequests} طلب اشتراك يحتاج مراجعة`, action: { label: "مراجعة", href: "/dashboard/admin/payment-requests" } });
  if (a.totalListings > 0 && a.inactiveListings / a.totalListings > 0.3)
    alerts.push({ level: "red", text: `${a.inactiveListings} إعلان غير نشط (${Math.round((a.inactiveListings / a.totalListings) * 100)}% من الإجمالي)`, action: { label: "عرض", href: "/dashboard/admin/properties" } });
  if (attentionCount > 0) alerts.push({ level: "yellow", text: `${attentionCount} إعلان يفتقر إلى صور أو سعر`, action: { label: "عرض", href: "/dashboard/admin/properties" } });
  const ml = a.monthlyListings;
  if (ml.length >= 2) {
    const last = ml[ml.length - 1].count, prev = ml[ml.length - 2].count;
    if (prev > 0 && last < prev * 0.7) alerts.push({ level: "red", text: `انخفاض في الإعلانات الجديدة ${Math.round(((prev - last) / prev) * 100)}% مقارنة بالشهر السابق` });
    else if (prev > 0 && last > prev * 1.3) alerts.push({ level: "green", text: `ارتفاع في الإعلانات الجديدة ${Math.round(((last - prev) / prev) * 100)}% مقارنة بالشهر السابق` });
  }
  if (a.totalViews === 0 && a.totalListings > 0) alerts.push({ level: "yellow", text: "لا توجد مشاهدات بعد — تحقق من إعدادات الظهور" });
  if (alerts.length === 0 && a.totalListings > 0) alerts.push({ level: "green", text: "كل شيء يعمل بشكل جيد" });
  return alerts;
}

// ── Smart insights (heuristic) ─────────────────────────────────────────────────
type Insight = { text: string; icon: React.ReactNode };
function computeInsights(a: DashboardAnalytics, users: number): Insight[] {
  const insights: Insight[] = [];
  if (a.totalListings > 0 && users > 0) {
    const listingRate = Math.round((a.totalListings / users) * 100);
    insights.push({ text: `${listingRate}% من المستخدمين أنشأوا إعلانًا على الأقل`, icon: <Ico d={<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>} size={14} /> });
  }
  if (a.totalListings > 0 && a.totalViews > 0) {
    const avg = (a.totalViews / a.totalListings).toFixed(1);
    insights.push({ text: `معدل ${avg} مشاهدة لكل إعلان`, icon: <Ico d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>} size={14} /> });
  }
  if (a.totalRequests > 0 && a.totalListings > 0) {
    const ratio = ((a.totalRequests / a.totalListings) * 100).toFixed(1);
    insights.push({ text: `معدل الطلب/الإعلان ${ratio}% — كل إعلان يولّد ${(a.totalRequests / a.totalListings).toFixed(2)} طلب`, icon: <Ico d={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>} size={14} /> });
  }
  if (a.attentionListings?.length && a.totalListings > 0) {
    const pct = Math.round((a.attentionListings.length / a.totalListings) * 100);
    insights.push({ text: `${pct}% من الإعلانات تفتقر إلى صور أو سعر محدد`, icon: <Ico d={<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} size={14} /> });
  }
  if (a.activeListings > 0 && a.totalListings > 0) {
    const activePct = Math.round((a.activeListings / a.totalListings) * 100);
    const msg = activePct >= 80 ? `${activePct}% من الإعلانات نشطة — معدل صحي ممتاز` : `${activePct}% فقط من الإعلانات نشطة — يُنصح بمراجعة الإعلانات الموقوفة`;
    insights.push({ text: msg, icon: <Ico d={<><polyline points="20 6 9 17 4 12"/></>} size={14} /> });
  }
  return insights.slice(0, 4);
}

// ── Priority actions ───────────────────────────────────────────────────────────
type Action = { label: string; count: number; href: string; level: "critical" | "warning" | "info" };
function computeActions(a: DashboardAnalytics): Action[] {
  const actions: Action[] = [];
  if (a.newRequests > 0) actions.push({ label: "طلبات اشتراك تحتاج مراجعة فورية", count: a.newRequests, href: "/dashboard/admin/payment-requests", level: "critical" });
  if ((a.attentionListings?.length ?? 0) > 0) actions.push({ label: "إعلانات تفتقر إلى صور أو سعر", count: a.attentionListings.length, href: "/dashboard/admin/properties", level: "warning" });
  if (a.inactiveListings > 0) actions.push({ label: "إعلانات غير نشطة تحتاج مراجعة", count: a.inactiveListings, href: "/dashboard/admin/properties", level: "warning" });
  if (a.totalRequests > 0) actions.push({ label: "طلبات عقارية للمتابعة", count: a.totalRequests, href: "/dashboard/admin/requests", level: "info" });
  return actions.slice(0, 4);
}

// ── CSV export ─────────────────────────────────────────────────────────────────
function exportCSV(a: DashboardAnalytics | null, users: number, brokers: number, companies: number) {
  if (!a) return;
  const rows = [
    ["المقياس", "القيمة"],
    ["إجمالي المستخدمين", users],
    ["وسطاء عقاريون", brokers],
    ["شركات تطوير", companies],
    ["إجمالي الإعلانات", a.totalListings],
    ["الإعلانات النشطة", a.activeListings],
    ["الإعلانات غير النشطة", a.inactiveListings],
    ["الإعلانات المباعة", a.soldListings],
    ["الإعلانات المؤجرة", a.rentedListings],
    ["إجمالي ردود الإعلانات", a.totalRequests],
    ["ردود الإعلانات الجديدة", a.newRequests],
    ["إجمالي المشاهدات", a.totalViews],
    ["المشاريع", a.totalProjects],
    ["إعلانات تحتاج اهتمام", a.attentionListings?.length ?? 0],
  ];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `boioot-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Styled components ──────────────────────────────────────────────────────────
const ALERT_STYLE: Record<AlertLevel, { bg: string; border: string; text: string; dot: string }> = {
  red:    { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", dot: "#dc2626" },
  yellow: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", dot: "#d97706" },
  green:  { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", dot: "#22c55e" },
};

function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "1.1rem" }}>
      {alerts.map((a, i) => {
        const s = ALERT_STYLE[a.level];
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.55rem 0.9rem", borderRadius: 9, backgroundColor: s.bg, border: `1px solid ${s.border}`, gap: "0.7rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: s.dot, flexShrink: 0 }} />
              <span style={{ fontSize: "0.8rem", color: s.text, fontWeight: 500 }}>{a.text}</span>
            </div>
            {a.action && (
              <Link href={a.action.href} style={{ fontSize: "0.7rem", fontWeight: 700, color: s.text, textDecoration: "none", padding: "0.18rem 0.6rem", border: `1px solid ${s.border}`, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.6)", flexShrink: 0 }}>
                {a.action.label}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Clickable KPI card ─────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, accent, href, breakdown }: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode; accent: string; href?: string; breakdown?: { label: string; value: number; color: string }[];
}) {
  const inner = (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8ecf0", borderRadius: 14, padding: "1rem 1.1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", cursor: href ? "pointer" : "default", transition: "box-shadow 0.15s", height: "100%" }}
      onMouseEnter={e => { if (href) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.09)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, backgroundColor: accent + "18", color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: "0.73rem", color: "#64748b", marginTop: "0.2rem" }}>{label}</div>
          {sub && <div style={{ fontSize: "0.67rem", color: accent, marginTop: "0.1rem", fontWeight: 600 }}>{sub}</div>}
        </div>
        {href && <span style={{ fontSize: 10, color: "#cbd5e1", flexShrink: 0, marginTop: "0.25rem" }}>←</span>}
      </div>
      {breakdown && breakdown.length > 0 && (
        <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.7rem", flexWrap: "wrap" }}>
          {breakdown.map((b, i) => (
            <span key={i} style={{ fontSize: "0.63rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: 20, backgroundColor: b.color + "15", color: b.color }}>
              {b.label}: {b.value.toLocaleString("ar-SA")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
  return href ? <Link href={href} style={{ textDecoration: "none", display: "block" }}>{inner}</Link> : inner;
}

// ── Bar chart ──────────────────────────────────────────────────────────────────
function BarChart({ data, label, accent }: { data: { label: string; count: number }[]; label: string; accent: string }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8ecf0", borderRadius: 14, padding: "1.1rem 1.2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem" }}>
        <span style={{ fontSize: "0.77rem", fontWeight: 700, color: "#475569" }}>{label}</span>
        <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>الإجمالي: {total}</span>
      </div>
      {total === 0 ? (
        <div style={{ textAlign: "center", padding: "1.25rem 0", color: "#94a3b8", fontSize: "0.78rem" }}>لا توجد بيانات</div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.3rem", height: 68 }}>
          {data.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", height: "100%", justifyContent: "flex-end" }}>
              <div title={`${d.label}: ${d.count}`} style={{ width: "100%", height: `${Math.max((d.count / max) * 54, d.count > 0 ? 4 : 0)}px`, backgroundColor: d.count > 0 ? accent : "#e2e8f0", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }} />
              <span style={{ fontSize: "0.52rem", color: "#94a3b8", whiteSpace: "nowrap" }}>{d.label.slice(0, 3)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Funnel ─────────────────────────────────────────────────────────────────────
function FunnelStep({ label, value, pct, color, href, isLast }: { label: string; value: number; pct: number; color: string; href: string; isLast?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
      <Link href={href} style={{ textDecoration: "none", width: "100%" }}>
        <div style={{ backgroundColor: color + "18", border: `1px solid ${color}33`, borderRadius: 12, padding: "0.9rem 0.5rem", textAlign: "center", cursor: "pointer", transition: "transform 0.15s" }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
        >
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color }}>{value.toLocaleString("ar-SA")}</div>
          <div style={{ fontSize: "0.7rem", color: "#475569", marginTop: "0.2rem", lineHeight: 1.3 }}>{label}</div>
          {pct < 100 && <div style={{ fontSize: "0.62rem", color: pct < 20 ? "#dc2626" : pct < 50 ? "#d97706" : "#059669", marginTop: "0.2rem", fontWeight: 700 }}>{pct}% تحويل</div>}
        </div>
      </Link>
      {!isLast && <div style={{ fontSize: "1.2rem", color: "#cbd5e1", margin: "0.2rem 0", lineHeight: 1 }}>↓</div>}
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: { label: string; href: string } }) {
  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8ecf0", borderRadius: 14, padding: "1.1rem 1.2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem" }}>
        <span style={{ fontSize: "0.77rem", fontWeight: 700, color: "#475569" }}>{title}</span>
        {action && <Link href={action.href} style={{ fontSize: "0.68rem", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>{action.label}</Link>}
      </div>
      {children}
    </div>
  );
}

// ── Activity row ──────────────────────────────────────────────────────────────
function FeedItem({ title, meta, badge, badgeColor, badgeBg, actionLabel, actionHref }: {
  title: string; meta: string; badge: string; badgeColor: string; badgeBg: string; actionLabel: string; actionHref: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.55rem 0", borderBottom: "1px solid #f1f5f9", gap: "0.7rem" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "0.1rem" }}>{meta}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
        <span style={{ fontSize: "0.63rem", fontWeight: 700, padding: "0.13rem 0.5rem", borderRadius: 20, color: badgeColor, backgroundColor: badgeBg }}>{badge}</span>
        <Link href={actionHref} style={{ fontSize: "0.68rem", fontWeight: 700, color: "#475569", textDecoration: "none", padding: "0.18rem 0.55rem", border: "1px solid #e2e8f0", borderRadius: 6, backgroundColor: "#f8fafc" }}>{actionLabel}</Link>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function Empty({ text, action }: { text: string; action?: { label: string; href: string } }) {
  return (
    <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#94a3b8" }}>
      <div style={{ fontSize: "0.79rem", marginBottom: "0.4rem" }}>{text}</div>
      {action && <Link href={action.href} style={{ fontSize: "0.73rem", fontWeight: 700, color: "#2563eb", textDecoration: "none" }}>{action.label}</Link>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const { isLoading } = useProtectedRoute();
  const { user, hasPermission } = useAuth();

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [users, setUsers]         = useState(0);
  const [brokers, setBrokers]     = useState(0);
  const [companies, setCompanies] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [retryKey, setRetryKey]   = useState(0);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [aRes, uRes, bRes, cRes] = await Promise.allSettled([
        dashboardSummaryApi.getAnalytics(),
        adminApi.getUsers(1, 1),
        adminApi.getUsers(1, 1, { role: "Broker" }),
        adminApi.getUsers(1, 1, { role: "CompanyOwner" }),
      ]);
      if (aRes.status === "fulfilled") setAnalytics(aRes.value as DashboardAnalytics);
      if (uRes.status === "fulfilled") setUsers((uRes.value as { totalCount?: number })?.totalCount ?? 0);
      if (bRes.status === "fulfilled") setBrokers((bRes.value as { totalCount?: number })?.totalCount ?? 0);
      if (cRes.status === "fulfilled") setCompanies((cRes.value as { totalCount?: number })?.totalCount ?? 0);
      if (aRes.status === "rejected" && uRes.status === "rejected") setError(true);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) load(); }, [user, load, retryKey]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const a = analytics;

  const chartData = useMemo(() => ({
    listings: (a?.monthlyListings ?? []).slice(-CHART_BARS[timeFilter]),
    requests: (a?.monthlyRequests ?? []).slice(-CHART_BARS[timeFilter]),
  }), [a, timeFilter]);

  const alerts   = useMemo(() => a ? computeAlerts(a, a.attentionListings?.length ?? 0) : [], [a]);
  const insights = useMemo(() => a ? computeInsights(a, users) : [], [a, users]);
  const actions  = useMemo(() => a ? computeActions(a) : [], [a]);

  const topListings      = useMemo(() => (a?.topListings ?? []).slice(0, 5), [a]);
  const attentionListings: AttentionListingItem[] = useMemo(() => (a?.attentionListings ?? []).slice(0, 5), [a]);

  const thisMonth = a?.monthlyListings?.at(-1)?.count ?? 0;
  const prevMonth = a?.monthlyListings?.at(-2)?.count ?? 0;
  const delta = thisMonth - prevMonth;

  // Top cities from topListings
  const topCities = useMemo(() => {
    const map = new Map<string, { count: number; views: number }>();
    for (const l of a?.topListings ?? []) {
      const k = l.city || "غير محدد";
      const p = map.get(k) ?? { count: 0, views: 0 };
      map.set(k, { count: p.count + 1, views: p.views + (l.views ?? 0) });
    }
    return [...map.entries()].map(([city, v]) => ({ city, ...v })).sort((a, b) => b.views - a.views).slice(0, 5);
  }, [a]);

  const funnelSteps = useMemo(() => {
    const u = users || 0;
    const l = a?.totalListings || 0;
    const r = a?.totalRequests || 0;
    const n = a?.newRequests || 0;
    return [
      { label: "المستخدمون", value: u, pct: 100, color: "#2563eb", href: "/dashboard/admin/users" },
      { label: "أنشأوا إعلانًا", value: l, pct: u > 0 ? Math.round((l / u) * 100) : 0, color: "#059669", href: "/dashboard/admin/properties" },
      { label: "أرسلوا طلبًا", value: r, pct: l > 0 ? Math.round((r / l) * 100) : 0, color: "#d97706", href: "/dashboard/admin/requests" },
      { label: "طلبات اشتراك", value: n, pct: r > 0 ? Math.round((n / r) * 100) : 0, color: "#7c3aed", href: "/dashboard/admin/payment-requests" },
    ];
  }, [a, users]);

  if (isLoading || !user) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: "4px solid #e2e8f0", borderTopColor: "var(--color-primary)", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  const roleLabel = STAFF_ROLE_LABELS[user.role as keyof typeof STAFF_ROLE_LABELS] ?? user.role;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح الخير" : "مساء الخير";
  const fmt = (n: number) => n.toLocaleString("ar-SA");
  const regularUsers = Math.max(0, users - brokers - companies);

  return (
    <div style={{ padding: "1.4rem 1.4rem 3rem", direction: "rtl", maxWidth: 1160 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.2rem" }}>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>{greeting}، {(user.fullName ?? "").split(" ")[0]}</h1>
            <span style={{ backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "0.67rem", fontWeight: 700, padding: "0.15rem 0.6rem", borderRadius: 20 }}>{roleLabel}</span>
          </div>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.8rem" }}>مركز قرارات الأعمال — بيانات حقيقية محسوبة تلقائيًا</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Time filter */}
          <div style={{ display: "flex", gap: "0.3rem", backgroundColor: "#f1f5f9", padding: "0.22rem", borderRadius: 9 }}>
            {(["today", "7d", "30d"] as TimeFilter[]).map(f => (
              <button key={f} onClick={() => setTimeFilter(f)} style={{ padding: "0.28rem 0.7rem", borderRadius: 6, border: "none", cursor: "pointer", fontSize: "0.73rem", fontWeight: 600, backgroundColor: timeFilter === f ? "#fff" : "transparent", color: timeFilter === f ? "#1e293b" : "#64748b", boxShadow: timeFilter === f ? "0 1px 3px rgba(0,0,0,0.1)" : "none", transition: "all 0.15s" }}>
                {TIME_LABELS[f]}
              </button>
            ))}
          </div>
          {/* Export */}
          <button
            onClick={() => exportCSV(a, users, brokers, companies)}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.3rem 0.8rem", borderRadius: 8, border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#475569", fontSize: "0.73rem", fontWeight: 600, cursor: "pointer" }}
          >
            <Ico d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} size={14} />
            تصدير CSV
          </button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {!loading && error && (
        <div style={{
          background: "#fef2f2", border: "1.5px solid #fecaca",
          borderRadius: 12, padding: "1rem 1.25rem",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "0.75rem", marginBottom: "1.1rem",
        }}>
          <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: "#991b1b" }}>
            تعذّر تحميل بيانات لوحة التحكم — قد تكون البيانات غير مكتملة
          </p>
          <button
            onClick={() => setRetryKey(k => k + 1)}
            style={{
              padding: "0.45rem 1.1rem", borderRadius: 8, border: "none",
              backgroundColor: "#dc2626", color: "#fff",
              fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", flexShrink: 0,
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ── Priority action panel ─────────────────────────────────────────── */}
      {!loading && actions.length > 0 && (
        <div style={{ backgroundColor: "#0f172a", borderRadius: 14, padding: "1rem 1.25rem", marginBottom: "1.1rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.65rem" }}>
            ما يجب عليك فعله الآن
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {actions.map((act, i) => {
              const COLOR = { critical: "#fca5a5", warning: "#fcd34d", info: "#93c5fd" };
              const BADGE_BG = { critical: "#dc2626", warning: "#d97706", info: "#2563eb" };
              return (
                <Link key={i} href={act.href} style={{ display: "flex", alignItems: "center", gap: "0.65rem", textDecoration: "none" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", backgroundColor: BADGE_BG[act.level], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ fontSize: "0.82rem", color: COLOR[act.level], flex: 1 }}>{act.label}</span>
                  <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", flexShrink: 0 }}>{fmt(act.count)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
      {!loading && <AlertBanner alerts={alerts} />}

      {/* ── KPI Row 1 ────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.7rem", marginBottom: "0.7rem" }}>
        <KpiCard
          label="المستخدمون"
          value={loading ? "—" : fmt(users)}
          href="/dashboard/admin/users"
          accent="#2563eb"
          breakdown={!loading ? [{ label: "وسيط عقاري", value: brokers, color: "#7c3aed" }, { label: "شركة تطوير", value: companies, color: "#0891b2" }, { label: "أفراد", value: regularUsers, color: "#64748b" }] : undefined}
          icon={<Ico d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>} />}
        />
        <KpiCard
          label="إجمالي الإعلانات"
          value={loading ? "—" : fmt(a?.totalListings ?? 0)}
          href="/dashboard/admin/properties"
          sub={!loading && a?.monthlyListings?.length ? `${delta >= 0 ? "+" : ""}${delta} هذا الشهر` : undefined}
          accent="#059669"
          breakdown={!loading ? [{ label: "نشط", value: a?.activeListings ?? 0, color: "#059669" }, { label: "غير نشط", value: a?.inactiveListings ?? 0, color: "#dc2626" }, { label: "مباع", value: a?.soldListings ?? 0, color: "#6366f1" }] : undefined}
          icon={<Ico d={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>} />}
        />
        <KpiCard
          label="ردود الإعلانات"
          value={loading ? "—" : fmt(a?.totalRequests ?? 0)}
          href="/dashboard/admin/requests"
          sub={!loading && (a?.newRequests ?? 0) > 0 ? `${a!.newRequests} جديد` : undefined}
          accent="#d97706"
          icon={<Ico d={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>} />}
        />
        <KpiCard
          label="المشاهدات"
          value={loading ? "—" : fmt(a?.totalViews ?? 0)}
          href="/dashboard/admin/properties"
          sub={!loading && (a?.totalListings ?? 0) > 0 ? `معدل ${((a?.totalViews ?? 0) / (a?.totalListings ?? 1)).toFixed(1)}/إعلان` : undefined}
          accent="#7c3aed"
          icon={<Ico d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>} />}
        />
        <KpiCard
          label="الوسطاء"
          value={loading ? "—" : fmt(brokers)}
          href="/dashboard/admin/users?role=Broker"
          accent="#0891b2"
          icon={<Ico d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />}
        />
      </div>

      {/* ── KPI Row 2 — listing health ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "0.7rem", marginBottom: "1.1rem" }}>
        <KpiCard label="إعلانات نشطة" value={loading ? "—" : fmt(a?.activeListings ?? 0)} href="/dashboard/admin/properties" sub={!loading && (a?.totalListings ?? 0) > 0 ? `${Math.round(((a?.activeListings ?? 0) / (a?.totalListings ?? 1)) * 100)}% من الإجمالي` : undefined} accent="#059669" icon={<Ico d={<><polyline points="20 6 9 17 4 12"/></>} />} />
        <KpiCard label="إعلانات غير نشطة" value={loading ? "—" : fmt(a?.inactiveListings ?? 0)} href="/dashboard/admin/properties" accent={(a?.inactiveListings ?? 0) > 0 ? "#dc2626" : "#6b7280"} icon={<Ico d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />} />
        <KpiCard label="تحتاج اهتمام" value={loading ? "—" : fmt(a?.attentionListings?.length ?? 0)} href="/dashboard/admin/properties" sub={(a?.attentionListings?.length ?? 0) > 0 ? "صور أو سعر مفقود" : undefined} accent="#d97706" icon={<Ico d={<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />} />
        <KpiCard label="المشاريع" value={loading ? "—" : fmt(a?.totalProjects ?? 0)} href="/dashboard/admin/projects" accent="#6366f1" icon={<Ico d={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>} />} />
        <KpiCard label="إيرادات MRR" value="غير متوفر" sub="يتطلب ربط الفواتير" accent="#94a3b8" icon={<Ico d={<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>} />} />
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "0.7rem", marginBottom: "1.1rem" }}>
        <BarChart data={chartData.listings} label="نمو الإعلانات" accent="#059669" />
        <BarChart data={chartData.requests} label="ردود الإعلانات الشهرية" accent="#d97706" />
      </div>

      {/* ── Funnel ───────────────────────────────────────────────────────── */}
      <Card title="قمع التحويل — من التسجيل إلى الاشتراك">
        {loading ? (
          <div style={{ textAlign: "center", padding: "1rem 0", color: "#94a3b8", fontSize: "0.8rem" }}>جاري التحميل…</div>
        ) : (
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", padding: "0.5rem 0" }}>
            {funnelSteps.map((step, i) => (
              <FunnelStep key={i} {...step} isLast={i === funnelSteps.length - 1} />
            ))}
          </div>
        )}
      </Card>

      {/* ── Top performers + cities ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: "0.7rem", margin: "1.1rem 0" }}>
        <Card title="أفضل الإعلانات مشاهدة" action={{ label: "عرض الكل", href: "/dashboard/admin/properties" }}>
          {topListings.length === 0 ? (
            <Empty text="لا توجد إعلانات بعد" action={{ label: "استعراض الإعلانات", href: "/dashboard/admin/properties" }} />
          ) : topListings.map(l => (
            <FeedItem key={l.id} title={l.title} meta={`${l.city || "—"} · ${l.views} مشاهدة · ${l.requestCount} طلب`}
              badge={l.status === "نشط" ? "نشط" : l.status} badgeColor={l.status === "نشط" ? "#059669" : "#6b7280"} badgeBg={l.status === "نشط" ? "#ecfdf5" : "#f1f5f9"}
              actionLabel="عرض" actionHref="/dashboard/admin/properties" />
          ))}
        </Card>
        <Card title="أكثر المدن نشاطًا">
          {topCities.length === 0 ? (
            <Empty text="لا توجد بيانات مدن" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.2rem" }}>
              {topCities.map((c, i) => {
                const maxV = topCities[0].views || 1;
                return (
                  <div key={c.city}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.18rem" }}>
                      <span style={{ fontSize: "0.79rem", fontWeight: i === 0 ? 700 : 500, color: "#1e293b" }}>{i + 1}. {c.city}</span>
                      <span style={{ fontSize: "0.69rem", color: "#64748b" }}>{c.count} إعلان · {c.views} مشاهدة</span>
                    </div>
                    <div style={{ height: 4, backgroundColor: "#f1f5f9", borderRadius: 4 }}>
                      <div style={{ height: "100%", width: `${Math.round((c.views / maxV) * 100)}%`, backgroundColor: "#2563eb", borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Smart insights ───────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "1.1rem 1.2rem", marginBottom: "1.1rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.65rem" }}>
            رؤى ذكية — محسوبة من بياناتك
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "0.6rem" }}>
            {insights.map((ins, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem", backgroundColor: "#fff", border: "1px solid #e8ecf0", borderRadius: 10, padding: "0.7rem 0.85rem" }}>
                <span style={{ color: "#2563eb", marginTop: "0.1rem", flexShrink: 0 }}>{ins.icon}</span>
                <span style={{ fontSize: "0.78rem", color: "#334155", lineHeight: 1.5 }}>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Actionable attention listings ─────────────────────────────── */}
      {attentionListings.length > 0 && (
        <Card title="إعلانات تحتاج اهتمام" action={{ label: "عرض الكل", href: "/dashboard/admin/properties" }}>
          {attentionListings.map(item => (
            <FeedItem key={item.id} title={item.title} meta={item.issue ?? "يحتاج مراجعة"}
              badge="يحتاج اهتمام" badgeColor="#d97706" badgeBg="#fffbeb"
              actionLabel="تعديل" actionHref={`/dashboard/admin/properties/${item.id}/edit`} />
          ))}
        </Card>
      )}

      {/* ── SuperAdmin hint ───────────────────────────────────────────── */}
      {hasPermission("roles.manage") && (
        <div style={{ marginTop: "1rem", padding: "0.8rem 1rem", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, fontSize: "0.77rem", color: "#166534", lineHeight: 1.6 }}>
          <strong>مدير النظام:</strong> لديك صلاحية كاملة على جميع أقسام النظام.
        </div>
      )}
    </div>
  );
}
