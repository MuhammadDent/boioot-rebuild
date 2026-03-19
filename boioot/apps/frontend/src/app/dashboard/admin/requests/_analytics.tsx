"use client";

import { useMemo } from "react";
import type { RequestResponse } from "@/types";
import { REQUEST_STATUS_LABELS } from "@/features/dashboard/requests/constants";

// ─── Text extraction helpers ───────────────────────────────────────────────────
const PROP_TYPES = ["شقة", "فيلا", "مكتب", "أرض", "محل", "استوديو", "دوبلكس", "منزل", "مخزن", "عمارة", "مشروع"];

function extractCity(title: string): string {
  const m = title.match(/[—-]\s*([^—-]+)$/);
  return m ? m[1].trim() : "غير محدد";
}

function extractPropertyType(title: string): string {
  for (const t of PROP_TYPES) {
    if (title.startsWith(t)) return t;
  }
  return "أخرى";
}

function extractRooms(title: string): string {
  const m = title.match(/(\d+)\s+غرف/);
  if (m) return `${m[1]} غرفة`;
  if (/غرفة واحدة|1\s*غرفة/.test(title)) return "1 غرفة";
  return "بدون تحديد";
}

function tally(items: string[]): [string, number][] {
  const c: Record<string, number> = {};
  for (const i of items) c[i] = (c[i] || 0) + 1;
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

// ─── Distribution bar ──────────────────────────────────────────────────────────
function DistributionRow({
  label, count, total, color = "#3b82f6",
}: {
  label: string; count: number; total: number; color?: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: "0.6rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "0.79rem", color: "#334155", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
          <strong style={{ color: "#0f172a" }}>{count}</strong> · {pct}%
        </span>
      </div>
      <div style={{ height: 7, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          backgroundColor: color, borderRadius: 4,
          transition: "width 0.5s ease",
          minWidth: count > 0 ? 4 : 0,
        }} />
      </div>
    </div>
  );
}

// ─── Analytics card ────────────────────────────────────────────────────────────
function AnalyticsCard({
  icon, title, items, total, color,
}: {
  icon: string; title: string;
  items: [string, number][];
  total: number; color?: string;
}) {
  const shown = items.slice(0, 6);
  return (
    <div style={{
      backgroundColor: "#fff", borderRadius: 14,
      border: "1px solid #e2e8f0", padding: "1.1rem 1.25rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "1rem" }}>
        <span style={{ fontSize: "1rem" }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{title}</h3>
        <span style={{
          marginRight: "auto",
          backgroundColor: "#f1f5f9", color: "#64748b",
          borderRadius: 10, padding: "0.1rem 0.5rem",
          fontSize: "0.72rem", fontWeight: 700,
        }}>
          {total}
        </span>
      </div>
      {shown.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8", textAlign: "center" }}>لا توجد بيانات</p>
      ) : (
        shown.map(([label, count]) => (
          <DistributionRow key={label} label={label} count={count} total={total} color={color} />
        ))
      )}
    </div>
  );
}

// ─── Analytics Section ─────────────────────────────────────────────────────────
export function AnalyticsSection({ allRequests }: { allRequests: RequestResponse[] }) {
  const data = useMemo(() => {
    const propReqs  = allRequests.filter(r => !!r.propertyTitle);
    const total     = allRequests.length;
    const propTotal = propReqs.length;

    const byStatus   = tally(allRequests.map(r => REQUEST_STATUS_LABELS[r.status] ?? r.status));
    const byType     = tally(allRequests.map(r => r.propertyId ? "عقار" : r.projectId ? "مشروع" : "عام"));
    const byCity     = tally(propReqs.map(r => extractCity(r.propertyTitle!)));
    const byPropType = tally(propReqs.map(r => extractPropertyType(r.propertyTitle!)));
    const byRooms    = tally(propReqs.map(r => extractRooms(r.propertyTitle!)));
    const byCompany  = tally(
      allRequests.filter(r => !!r.companyName).map(r => r.companyName!)
    );

    return { total, propTotal, byStatus, byType, byCity, byPropType, byRooms, byCompany };
  }, [allRequests]);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "0.85rem",
      marginBottom: "1.5rem",
    }}>
      <AnalyticsCard
        icon="🔵" title="توزيع الحالات"
        items={data.byStatus} total={data.total}
        color="#3b82f6"
      />
      <AnalyticsCard
        icon="📁" title="نوع الطلب"
        items={data.byType} total={data.total}
        color="#8b5cf6"
      />
      <AnalyticsCard
        icon="🏙️" title="حسب المدينة"
        items={data.byCity} total={data.propTotal}
        color="#0ea5e9"
      />
      <AnalyticsCard
        icon="🏠" title="نوع العقار"
        items={data.byPropType} total={data.propTotal}
        color="#f59e0b"
      />
      <AnalyticsCard
        icon="🛏️" title="عدد الغرف"
        items={data.byRooms} total={data.propTotal}
        color="#10b981"
      />
      <AnalyticsCard
        icon="🏢" title="حسب الشركة"
        items={data.byCompany} total={data.total}
        color="#f97316"
      />
    </div>
  );
}
