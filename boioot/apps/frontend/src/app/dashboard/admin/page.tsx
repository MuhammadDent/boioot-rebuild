"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { dashboardSummaryApi } from "@/features/dashboard/summary/api";
import { adminApi } from "@/features/admin/api";
import { STAFF_ROLE_LABELS } from "@/lib/rbac";
import type { DashboardAnalytics } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────
type AdminStats = {
  users: number;
  listings: number;
  requests: number;
  newRequests: number;
  views: number;
  projects: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function SvgIcon({ path, size = 20, color }: { path: React.ReactNode; size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {path}
    </svg>
  );
}

// ── KPI card ───────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e8ecf0",
        borderRadius: 14,
        padding: "1.1rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: accent + "18",
          color: accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.25rem" }}>{label}</div>
        {sub && (
          <div style={{ fontSize: "0.7rem", color: accent, marginTop: "0.1rem", fontWeight: 600 }}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────
function MiniBarChart({
  data,
  label,
  accent,
}: {
  data: { label: string; count: number }[];
  label: string;
  accent: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e8ecf0",
        borderRadius: 14,
        padding: "1.25rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "1rem" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "0.35rem", height: 80 }}>
        {data.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.3rem",
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            <div
              title={String(d.count)}
              style={{
                width: "100%",
                height: `${Math.max((d.count / max) * 64, d.count > 0 ? 4 : 0)}px`,
                backgroundColor: d.count > 0 ? accent : "#e2e8f0",
                borderRadius: "4px 4px 0 0",
                transition: "height 0.3s",
              }}
            />
            <span style={{ fontSize: "0.58rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
              {d.label.slice(0, 3)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity row ───────────────────────────────────────────────────────────────
function ActivityRow({
  title,
  meta,
  badge,
  badgeColor,
  badgeBg,
}: {
  title: string;
  meta: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.65rem 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <div>
        <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "#1e293b" }}>{title}</div>
        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.1rem" }}>{meta}</div>
      </div>
      {badge && (
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            padding: "0.18rem 0.6rem",
            borderRadius: 20,
            color: badgeColor ?? "#059669",
            backgroundColor: badgeBg ?? "#ecfdf5",
            flexShrink: 0,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const { isLoading } = useProtectedRoute();
  const { user, hasPermission } = useAuth();

  const [stats, setStats] = useState<AdminStats>({ users: 0, listings: 0, requests: 0, newRequests: 0, views: 0, projects: 0 });
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsData, usersData] = await Promise.allSettled([
        dashboardSummaryApi.getAnalytics(),
        adminApi.getUsers(1, 1),
      ]);

      if (analyticsData.status === "fulfilled") {
        const d = analyticsData.value as DashboardAnalytics;
        setAnalytics(d);
        setStats((prev) => ({
          ...prev,
          listings: d.totalListings ?? 0,
          requests: d.totalRequests ?? 0,
          newRequests: d.newRequests ?? 0,
          views: d.totalViews ?? 0,
          projects: d.totalProjects ?? 0,
        }));
      }

      if (usersData.status === "fulfilled") {
        const d = usersData.value as { totalCount?: number; items?: unknown[] };
        setStats((prev) => ({ ...prev, users: d?.totalCount ?? 0 }));
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (hasPermission("users.view") || hasPermission("properties.view")) {
      load();
    } else {
      setLoading(false);
    }
  }, [user, hasPermission, load]);

  if (isLoading || !user) return null;

  const role = user.role;
  const roleLabel = STAFF_ROLE_LABELS[role as keyof typeof STAFF_ROLE_LABELS] ?? role;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح الخير" : "مساء الخير";

  const monthlyListings = Array.isArray(analytics?.monthlyListings) ? analytics.monthlyListings : [];
  const monthlyRequests = Array.isArray(analytics?.monthlyRequests) ? analytics.monthlyRequests : [];
  const topListings = Array.isArray(analytics?.topListings) ? analytics.topListings.slice(0, 5) : [];

  return (
    <div style={{ padding: "1.75rem 1.5rem 3rem", direction: "rtl", maxWidth: 1100 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.3rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "#1e293b" }}>
            {greeting}، {user.fullName.split(" ")[0]}
          </h1>
          <span style={{
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "0.18rem 0.65rem",
            borderRadius: 20,
          }}>
            {roleLabel}
          </span>
        </div>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
          نظرة عامة على أداء المنصة — آخر تحديث الآن
        </p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          gap: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        <KpiCard
          label="المستخدمون"
          value={loading ? "—" : stats.users.toLocaleString("ar-SA")}
          accent="#2563eb"
          icon={<SvgIcon path={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>} />}
        />
        <KpiCard
          label="الإعلانات"
          value={loading ? "—" : stats.listings.toLocaleString("ar-SA")}
          accent="#059669"
          icon={<SvgIcon path={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>} />}
        />
        <KpiCard
          label="الطلبات"
          value={loading ? "—" : stats.requests.toLocaleString("ar-SA")}
          sub={stats.newRequests > 0 ? `${stats.newRequests} جديد` : undefined}
          accent="#d97706"
          icon={<SvgIcon path={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />} />}
        />
        <KpiCard
          label="المشاهدات"
          value={loading ? "—" : stats.views.toLocaleString("ar-SA")}
          accent="#7c3aed"
          icon={<SvgIcon path={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>} />}
        />
        <KpiCard
          label="المشاريع"
          value={loading ? "—" : stats.projects.toLocaleString("ar-SA")}
          accent="#0891b2"
          icon={<SvgIcon path={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>} />}
        />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────────────── */}
      {(monthlyListings.length > 0 || monthlyRequests.length > 0) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          {monthlyListings.length > 0 && (
            <MiniBarChart data={monthlyListings} label="نمو الإعلانات — آخر 6 أشهر" accent="#059669" />
          )}
          {monthlyRequests.length > 0 && (
            <MiniBarChart data={monthlyRequests} label="الطلبات الشهرية — آخر 6 أشهر" accent="#d97706" />
          )}
        </div>
      )}

      {/* ── Activity — Top Listings ──────────────────────────────────────────── */}
      {topListings.length > 0 && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #e8ecf0",
            borderRadius: 14,
            padding: "1.25rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            marginBottom: "1rem",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: "0.5rem" }}>
            الإعلانات الأكثر مشاهدة
          </div>
          {topListings.map((listing) => (
            <ActivityRow
              key={listing.id}
              title={listing.title}
              meta={`${listing.city ?? "—"} · ${listing.views ?? 0} مشاهدة`}
              badge={listing.status === "نشط" ? "نشط" : listing.status}
              badgeColor={listing.status === "نشط" ? "#059669" : "#6b7280"}
              badgeBg={listing.status === "نشط" ? "#ecfdf5" : "#f1f5f9"}
            />
          ))}
        </div>
      )}

      {/* ── SuperAdmin hint ──────────────────────────────────────────────────── */}
      {hasPermission("roles.manage") && (
        <div style={{
          marginTop: "1rem",
          padding: "0.9rem 1.1rem",
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 12,
          fontSize: "0.8rem",
          color: "#166534",
          lineHeight: 1.6,
        }}>
          <strong>مدير النظام:</strong> لديك صلاحية كاملة على جميع أقسام النظام.
        </div>
      )}
    </div>
  );
}
