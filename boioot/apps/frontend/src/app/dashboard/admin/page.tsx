"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { dashboardSummaryApi } from "@/features/dashboard/summary/api";
import { adminApi } from "@/features/admin/api";
import { STAFF_ROLE_LABELS } from "@/lib/rbac";
import type { DashboardAnalytics, TopListingItem, AttentionListingItem } from "@/types";

// ── Time filter ────────────────────────────────────────────────────────────────
type TimeFilter = "today" | "7d" | "30d";
const TIME_LABELS: Record<TimeFilter, string> = {
  today: "اليوم",
  "7d": "آخر 7 أيام",
  "30d": "آخر 30 يوم",
};
const CHART_BARS: Record<TimeFilter, number> = {
  today: 1,
  "7d": 2,
  "30d": 6,
};

// ── Alert system ───────────────────────────────────────────────────────────────
type AlertLevel = "red" | "yellow" | "green";
type Alert = { level: AlertLevel; text: string; action?: { label: string; href: string } };

function computeAlerts(
  a: DashboardAnalytics,
  users: number,
  attentionCount: number
): Alert[] {
  const alerts: Alert[] = [];

  // Pending subscription requests
  if (a.newRequests > 0) {
    alerts.push({
      level: "yellow",
      text: `${a.newRequests} طلب اشتراك يحتاج مراجعة`,
      action: { label: "مراجعة", href: "/dashboard/admin/payment-requests" },
    });
  }

  // High inactive listings
  if (a.totalListings > 0 && a.inactiveListings / a.totalListings > 0.3) {
    alerts.push({
      level: "red",
      text: `${a.inactiveListings} إعلان غير نشط (${Math.round((a.inactiveListings / a.totalListings) * 100)}% من الإجمالي)`,
      action: { label: "عرض", href: "/dashboard/admin/properties" },
    });
  }

  // Attention listings
  if (attentionCount > 0) {
    alerts.push({
      level: "yellow",
      text: `${attentionCount} إعلان يحتاج اهتمام (صور مفقودة أو سعر غير محدد)`,
      action: { label: "عرض", href: "/dashboard/admin/properties" },
    });
  }

  // Monthly trend — compare last two months
  const ml = a.monthlyListings;
  if (ml.length >= 2) {
    const last = ml[ml.length - 1].count;
    const prev = ml[ml.length - 2].count;
    if (prev > 0 && last < prev * 0.7) {
      const drop = Math.round(((prev - last) / prev) * 100);
      alerts.push({ level: "red", text: `انخفاض في الإعلانات الجديدة بنسبة ${drop}% مقارنة بالشهر السابق` });
    } else if (prev > 0 && last > prev * 1.3) {
      const rise = Math.round(((last - prev) / prev) * 100);
      alerts.push({ level: "green", text: `ارتفاع في الإعلانات الجديدة بنسبة ${rise}% مقارنة بالشهر السابق` });
    }
  }

  // No views at all
  if (a.totalViews === 0 && a.totalListings > 0) {
    alerts.push({ level: "yellow", text: "لا توجد مشاهدات بعد — تحقق من إعدادات ظهور الإعلانات" });
  }

  // Healthy state
  if (alerts.length === 0 && a.totalListings > 0) {
    alerts.push({ level: "green", text: "كل شيء يعمل بشكل جيد" });
  }

  return alerts;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function Ico({ d, size = 18 }: { d: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {d}
    </svg>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, accent, secondary,
}: {
  label: string; value: number | string; sub?: string; icon: React.ReactNode; accent: string; secondary?: string;
}) {
  return (
    <div style={{
      backgroundColor: "#fff", border: "1px solid #e8ecf0", borderRadius: 14,
      padding: "1rem 1.15rem", display: "flex", alignItems: "flex-start",
      gap: "0.9rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
        backgroundColor: accent + "18", color: accent,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>{label}</div>
        {sub && <div style={{ fontSize: "0.68rem", color: accent, marginTop: "0.1rem", fontWeight: 600 }}>{sub}</div>}
        {secondary && <div style={{ fontSize: "0.68rem", color: "#94a3b8", marginTop: "0.1rem" }}>{secondary}</div>}
      </div>
    </div>
  );
}

// ── Alert banner ──────────────────────────────────────────────────────────────
const ALERT_STYLE: Record<AlertLevel, { bg: string; border: string; text: string; dot: string }> = {
  red:    { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", dot: "#dc2626" },
  yellow: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", dot: "#d97706" },
  green:  { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", dot: "#22c55e" },
};

function AlertBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.25rem" }}>
      {alerts.map((a, i) => {
        const s = ALERT_STYLE[a.level];
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.65rem 1rem", borderRadius: 10,
            backgroundColor: s.bg, border: `1px solid ${s.border}`,
            gap: "0.75rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: s.dot, flexShrink: 0 }} />
              <span style={{ fontSize: "0.82rem", color: s.text, fontWeight: 500 }}>{a.text}</span>
            </div>
            {a.action && (
              <Link href={a.action.href} style={{
                fontSize: "0.72rem", fontWeight: 700, color: s.text,
                textDecoration: "none", padding: "0.2rem 0.65rem",
                border: `1px solid ${s.border}`, borderRadius: 6,
                backgroundColor: "rgba(255,255,255,0.6)", flexShrink: 0,
              }}>
                {a.action.label}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, label, accent }: { data: { label: string; count: number }[]; label: string; accent: string }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{
      backgroundColor: "#fff", border: "1px solid #e8ecf0", borderRadius: 14,
      padding: "1.2rem 1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{label}</span>
        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>الإجمالي: {total}</span>
      </div>

      {total === 0 ? (
        <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#94a3b8", fontSize: "0.8rem" }}>
          لا توجد بيانات للفترة المحددة
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.3rem", height: 72 }}>
          {data.map((d, i) => (
            <div key={i} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: "0.25rem", height: "100%", justifyContent: "flex-end",
            }}>
              <div
                title={`${d.label}: ${d.count}`}
                style={{
                  width: "100%",
                  height: `${Math.max((d.count / max) * 58, d.count > 0 ? 4 : 0)}px`,
                  backgroundColor: d.count > 0 ? accent : "#e2e8f0",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.3s",
                }}
              />
              <span style={{ fontSize: "0.55rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                {d.label.slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Actionable activity item ───────────────────────────────────────────────────
function FeedItem({
  title, meta, badge, badgeColor, badgeBg, actionLabel, actionHref,
}: {
  title: string; meta: string; badge: string; badgeColor: string; badgeBg: string;
  actionLabel: string; actionHref: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0.6rem 0", borderBottom: "1px solid #f1f5f9", gap: "0.75rem",
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
        <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.1rem" }}>{meta}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        <span style={{ fontSize: "0.66rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: 20, color: badgeColor, backgroundColor: badgeBg }}>
          {badge}
        </span>
        <Link href={actionHref} style={{
          fontSize: "0.7rem", fontWeight: 700, color: "#475569",
          textDecoration: "none", padding: "0.2rem 0.6rem",
          border: "1px solid #e2e8f0", borderRadius: 6,
          backgroundColor: "#f8fafc",
        }}>
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon, text, action }: { icon: React.ReactNode; text: string; action?: { label: string; href: string } }) {
  return (
    <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#94a3b8" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.6rem", opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: "0.82rem", marginBottom: "0.5rem" }}>{text}</div>
      {action && (
        <Link href={action.href} style={{ fontSize: "0.76rem", fontWeight: 700, color: "#2563eb", textDecoration: "none" }}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: { label: string; href: string } }) {
  return (
    <div style={{
      backgroundColor: "#fff", border: "1px solid #e8ecf0", borderRadius: 14,
      padding: "1.2rem 1.25rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{title}</span>
        {action && (
          <Link href={action.href} style={{ fontSize: "0.7rem", color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Top cities computed from topListings ──────────────────────────────────────
function computeTopCities(topListings: TopListingItem[]): { city: string; count: number; views: number }[] {
  const map = new Map<string, { count: number; views: number }>();
  for (const l of topListings) {
    const key = l.city || "غير محدد";
    const prev = map.get(key) ?? { count: 0, views: 0 };
    map.set(key, { count: prev.count + 1, views: prev.views + (l.views ?? 0) });
  }
  return [...map.entries()]
    .map(([city, v]) => ({ city, ...v }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const { isLoading } = useProtectedRoute();
  const { user, hasPermission } = useAuth();

  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [users, setUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, uRes] = await Promise.allSettled([
        dashboardSummaryApi.getAnalytics(),
        adminApi.getUsers(1, 1),
      ]);
      if (aRes.status === "fulfilled") setAnalytics(aRes.value as DashboardAnalytics);
      if (uRes.status === "fulfilled") {
        const d = uRes.value as { totalCount?: number };
        setUsers(d?.totalCount ?? 0);
      }
    } catch {/* silent */} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  // ── Derived / computed ─────────────────────────────────────────────────────
  const a = analytics;

  const chartData = useMemo(() => {
    const bars = CHART_BARS[timeFilter];
    return {
      listings: (a?.monthlyListings ?? []).slice(-bars),
      requests: (a?.monthlyRequests ?? []).slice(-bars),
    };
  }, [a, timeFilter]);

  const alerts = useMemo(() => {
    if (!a) return [];
    return computeAlerts(a, users, a.attentionListings?.length ?? 0);
  }, [a, users]);

  const activeRatio = a && a.totalListings > 0
    ? Math.round((a.activeListings / a.totalListings) * 100)
    : 0;

  const avgViews = a && a.totalListings > 0
    ? (a.totalViews / a.totalListings).toFixed(1)
    : "0";

  const topCities = useMemo(() => computeTopCities(a?.topListings ?? []), [a]);

  const topListings: TopListingItem[] = a?.topListings?.slice(0, 5) ?? [];
  const attentionListings: AttentionListingItem[] = a?.attentionListings?.slice(0, 5) ?? [];

  // ── Month-on-month listing delta for sub-label on KPI ─────────────────────
  const currentMonthListings = a?.monthlyListings?.at(-1)?.count ?? 0;
  const prevMonthListings    = a?.monthlyListings?.at(-2)?.count ?? 0;
  const listingsDeltaSign    = currentMonthListings >= prevMonthListings ? "+" : "";
  const listingsDelta        = currentMonthListings - prevMonthListings;

  if (isLoading || !user) return null;

  const role = user.role;
  const roleLabel = STAFF_ROLE_LABELS[role as keyof typeof STAFF_ROLE_LABELS] ?? role;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح الخير" : "مساء الخير";

  const fmt = (n: number) => n.toLocaleString("ar-SA");

  return (
    <div style={{ padding: "1.5rem 1.5rem 3rem", direction: "rtl", maxWidth: 1140 }}>

      {/* ── Header + time filter ─────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.25rem" }}>
            <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "#1e293b" }}>
              {greeting}، {user.fullName.split(" ")[0]}
            </h1>
            <span style={{ backgroundColor: "#fef2f2", color: "#dc2626", fontSize: "0.68rem", fontWeight: 700, padding: "0.17rem 0.6rem", borderRadius: 20 }}>
              {roleLabel}
            </span>
          </div>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.82rem" }}>
            نظرة تجارية شاملة — جميع الأرقام محسوبة من البيانات الفعلية
          </p>
        </div>

        {/* Time filter */}
        <div style={{ display: "flex", gap: "0.35rem", backgroundColor: "#f1f5f9", padding: "0.25rem", borderRadius: 10 }}>
          {(["today", "7d", "30d"] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              style={{
                padding: "0.32rem 0.75rem", borderRadius: 7, border: "none", cursor: "pointer",
                fontSize: "0.76rem", fontWeight: 600,
                backgroundColor: timeFilter === f ? "#fff" : "transparent",
                color: timeFilter === f ? "#1e293b" : "#64748b",
                boxShadow: timeFilter === f ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}
            >
              {TIME_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Smart alerts ─────────────────────────────────────────────────── */}
      {!loading && <AlertBanner alerts={alerts} />}

      {/* ── KPI Row 1 ────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <KpiCard
          label="المستخدمون"
          value={loading ? "—" : fmt(users)}
          accent="#2563eb"
          icon={<Ico d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>} />}
        />
        <KpiCard
          label="إجمالي الإعلانات"
          value={loading ? "—" : fmt(a?.totalListings ?? 0)}
          sub={!loading && a?.monthlyListings?.length ? `${listingsDeltaSign}${listingsDelta} هذا الشهر` : undefined}
          accent="#059669"
          icon={<Ico d={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>} />}
        />
        <KpiCard
          label="الطلبات الكلية"
          value={loading ? "—" : fmt(a?.totalRequests ?? 0)}
          sub={!loading && (a?.newRequests ?? 0) > 0 ? `${a!.newRequests} جديد يحتاج مراجعة` : undefined}
          accent="#d97706"
          icon={<Ico d={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>} />}
        />
        <KpiCard
          label="إجمالي المشاهدات"
          value={loading ? "—" : fmt(a?.totalViews ?? 0)}
          secondary={!loading ? `معدل ${avgViews} مشاهدة/إعلان` : undefined}
          accent="#7c3aed"
          icon={<Ico d={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>} />}
        />
        <KpiCard
          label="الوسطاء"
          value={loading ? "—" : fmt(a?.totalAgents ?? 0)}
          accent="#0891b2"
          icon={<Ico d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>} />}
        />
      </div>

      {/* ── KPI Row 2 — Listing health ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <KpiCard
          label="إعلانات نشطة"
          value={loading ? "—" : fmt(a?.activeListings ?? 0)}
          sub={!loading && (a?.totalListings ?? 0) > 0 ? `${activeRatio}% من الإجمالي` : undefined}
          accent="#059669"
          icon={<Ico d={<><polyline points="20 6 9 17 4 12"/></>} />}
        />
        <KpiCard
          label="إعلانات غير نشطة"
          value={loading ? "—" : fmt(a?.inactiveListings ?? 0)}
          accent={(a?.inactiveListings ?? 0) > 0 ? "#dc2626" : "#6b7280"}
          icon={<Ico d={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>} />}
        />
        <KpiCard
          label="تحتاج اهتمام"
          value={loading ? "—" : fmt(a?.attentionListings?.length ?? 0)}
          sub={!loading && (a?.attentionListings?.length ?? 0) > 0 ? "صور مفقودة أو سعر غير محدد" : undefined}
          accent="#d97706"
          icon={<Ico d={<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>} />}
        />
        <KpiCard
          label="المشاريع"
          value={loading ? "—" : fmt(a?.totalProjects ?? 0)}
          accent="#6366f1"
          icon={<Ico d={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>} />}
        />
        <KpiCard
          label="الشركات والمكاتب"
          value={loading ? "—" : fmt(a?.totalListings ? Math.round(a.totalListings / Math.max(a.totalAgents || 1, 1)) : 0)}
          secondary="متوسط إعلانات/وسيط"
          accent="#0891b2"
          icon={<Ico d={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><rect x="9" y="14" width="6" height="7"/></>} />}
        />
      </div>

      {/* ── Charts Row ────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <BarChart data={chartData.listings} label="نمو الإعلانات" accent="#059669" />
        <BarChart data={chartData.requests} label="الطلبات الشهرية" accent="#d97706" />
      </div>

      {/* ── Top Performers + Top Cities ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>

        {/* Top listings by views */}
        <Card title="أفضل الإعلانات مشاهدة" action={{ label: "عرض الكل", href: "/dashboard/admin/properties" }}>
          {topListings.length === 0 ? (
            <EmptyState
              icon={<Ico d={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>} size={32} />}
              text="لا توجد إعلانات بعد"
              action={{ label: "إضافة إعلان", href: "/dashboard/admin/properties" }}
            />
          ) : (
            topListings.map((l) => (
              <FeedItem
                key={l.id}
                title={l.title}
                meta={`${l.city || "—"} · ${l.views} مشاهدة · ${l.requestCount} طلب`}
                badge={l.status === "نشط" ? "نشط" : l.status}
                badgeColor={l.status === "نشط" ? "#059669" : "#6b7280"}
                badgeBg={l.status === "نشط" ? "#ecfdf5" : "#f1f5f9"}
                actionLabel="عرض"
                actionHref={`/dashboard/admin/properties`}
              />
            ))
          )}
        </Card>

        {/* Top cities */}
        <Card title="أكثر المدن نشاطًا">
          {topCities.length === 0 ? (
            <EmptyState
              icon={<Ico d={<><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></>} size={32} />}
              text="لا توجد بيانات مدن بعد"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginTop: "0.25rem" }}>
              {topCities.map((c, i) => {
                const maxViews = topCities[0].views || 1;
                const pct = Math.round((c.views / maxViews) * 100);
                return (
                  <div key={c.city}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                      <span style={{ fontSize: "0.8rem", fontWeight: i === 0 ? 700 : 500, color: "#1e293b" }}>
                        {i + 1}. {c.city}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                        {c.count} إعلان · {c.views} مشاهدة
                      </span>
                    </div>
                    <div style={{ height: 4, backgroundColor: "#f1f5f9", borderRadius: 4 }}>
                      <div style={{ height: "100%", width: `${pct}%`, backgroundColor: "#2563eb", borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Actionable Activity Feed — Attention Listings ─────────────────── */}
      {(attentionListings.length > 0 || !loading) && (
        <Card
          title="إعلانات تحتاج اهتمام"
          action={attentionListings.length > 0 ? { label: "عرض الكل", href: "/dashboard/admin/properties" } : undefined}
        >
          {attentionListings.length === 0 ? (
            <EmptyState
              icon={<Ico d={<><polyline points="20 6 9 17 4 12"/></>} size={32} />}
              text="جميع الإعلانات مكتملة — لا توجد مشكلات"
            />
          ) : (
            attentionListings.map((item) => (
              <FeedItem
                key={item.id}
                title={item.title}
                meta={item.issue ?? "يحتاج مراجعة"}
                badge="يحتاج اهتمام"
                badgeColor="#d97706"
                badgeBg="#fffbeb"
                actionLabel="تعديل"
                actionHref={`/dashboard/admin/properties/${item.id}/edit`}
              />
            ))
          )}
        </Card>
      )}

      {/* ── SuperAdmin hint ───────────────────────────────────────────────── */}
      {hasPermission("roles.manage") && (
        <div style={{
          marginTop: "1rem", padding: "0.85rem 1.1rem",
          backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0",
          borderRadius: 12, fontSize: "0.78rem", color: "#166534", lineHeight: 1.6,
        }}>
          <strong>مدير النظام:</strong> لديك صلاحية كاملة على جميع أقسام النظام.
        </div>
      )}
    </div>
  );
}
