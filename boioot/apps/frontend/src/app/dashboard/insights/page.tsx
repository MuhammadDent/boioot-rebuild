"use client";

// ─────────────────────────────────────────────────────────────────────────────
// /dashboard/insights — Analytics Insights Dashboard
//
// DATA SOURCE (current): Static mock data with realistic placeholder values.
// DATA SOURCE (future):  Replace getMockData() with a GA4 Reporting API call.
//                        See TODO comments below for exact plug-in points.
//
// PLUG-IN POINT:
//   1. Create a server-side API route:  GET /api/insights
//   2. Inside that route call the GA4 Reporting API (google-analytics-data SDK).
//   3. Replace getMockData() calls with:  useEffect(() => { fetchInsights() }, [])
//
// EVENT KEYS in use (fired by lib/track.ts):
//   view_property, booking_submit, click_whatsapp, booking_start, listing_created,
//   upgrade_prompt_viewed, upgrade_clicked
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import InsightCard from "@/components/dashboard/InsightCard";
import Funnel from "@/components/dashboard/Funnel";
import TopList from "@/components/dashboard/TopList";

// ── Mock data ─────────────────────────────────────────────────────────────────
//
// TODO: Replace this entire function with a real API call when analytics
//       backend is available. Shape must match InsightsData interface below.

interface InsightsData {
  overview: {
    propertyViews:      number;
    bookingSubmissions: number;
    whatsappClicks:     number;
    listingsCreated:    number;
  };
  funnel: Array<{ label: string; eventKey: string; count: number; icon: string }>;
  topProperties:   Array<{ label: string; count: number; sub?: string }>;
  topCities:       Array<{ label: string; count: number }>;
  topPropertyTypes:Array<{ label: string; count: number }>;
  monetization: {
    upgradePromptViewed: number;
    upgradeClicked:      number;
  };
}

function getMockData(): InsightsData {
  // TODO: Swap with real API data. Numbers are illustrative only.
  return {
    overview: {
      propertyViews:      0,
      bookingSubmissions: 0,
      whatsappClicks:     0,
      listingsCreated:    0,
    },
    funnel: [
      { label: "مشاهدة العقار",         eventKey: "view_property",   count: 0, icon: "👁️" },
      { label: "نقر واتساب",             eventKey: "click_whatsapp",  count: 0, icon: "💬" },
      { label: "بدء حجز",               eventKey: "booking_start",   count: 0, icon: "📅" },
      { label: "إرسال طلب حجز",         eventKey: "booking_submit",  count: 0, icon: "✅" },
    ],
    topProperties:    [],
    topCities:        [],
    topPropertyTypes: [],
    monetization: {
      upgradePromptViewed: 0,
      upgradeClicked:      0,
    },
  };
}

// ── Conversion rate helper ────────────────────────────────────────────────────

function convRate(clicked: number, viewed: number): string {
  if (viewed === 0) return "—";
  return (Math.round((clicked / viewed) * 1000) / 10).toFixed(1) + "%";
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "1rem", direction: "rtl" }}>
      <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message = "لا توجد بيانات بعد" }: { message?: string }) {
  return (
    <div style={{
      padding: "2.5rem 1rem",
      textAlign: "center",
      color: "#94a3b8",
      fontSize: "0.85rem",
      background: "#f8fafc",
      borderRadius: 12,
      border: "1px dashed #e2e8f0",
    }}>
      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</div>
      {message}
    </div>
  );
}

// ── Monetisation card ─────────────────────────────────────────────────────────

function MonetizationCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent: "blue" | "green" | "orange";
}) {
  const colors = {
    blue:   { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
    green:  { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
    orange: { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
  }[accent];

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: "1rem 1.1rem",
      direction: "rtl",
    }}>
      <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, color: colors.color, direction: "ltr", textAlign: "right" }}>
        {value}
      </p>
      <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", fontWeight: 600, color: "#0f172a" }}>
        {label}
      </p>
      {hint && (
        <p style={{ margin: "0.15rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { isLoading } = useProtectedRoute();
  const [data, setData] = useState<InsightsData | null>(null);

  useEffect(() => {
    // TODO: Replace with real API fetch:
    //   fetch("/api/insights")
    //     .then((r) => r.json())
    //     .then(setData)
    //     .catch(() => setData(getMockData()));
    setData(getMockData());
  }, []);

  if (isLoading || !data) return null;

  const { overview, funnel, topProperties, topCities, topPropertyTypes, monetization } = data;
  const hasAnyOverview = overview.propertyViews > 0 || overview.bookingSubmissions > 0;

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "var(--color-bg, #f8fafc)",
      padding: "2rem 1rem",
      direction: "rtl",
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "var(--color-text-primary, #0f172a)" }}>
                الإحصائيات والتحليلات
              </h1>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                نظرة عامة على أداء إعلاناتك وتفاعل الزوار
              </p>
            </div>
            {/* Data source badge — TODO: update when live */}
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.25rem 0.65rem",
              borderRadius: 99,
              background: "#fef3c7",
              border: "1px solid #fde68a",
              color: "#92400e",
              fontSize: "0.72rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}>
              ⚠️ بيانات تجريبية — قيد التطوير
            </span>
          </div>
        </div>

        {/* ── Section 1: Overview cards ────────────────────────────────── */}
        <div style={{ marginBottom: "2.25rem" }}>
          <SectionHeading
            title="نظرة عامة"
            subtitle="إجمالي الأحداث المُسجَّلة"
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1rem",
          }}>
            <InsightCard
              title="مشاهدات العقارات"
              value={overview.propertyViews}
              accent="blue"
              subtitle="view_property"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              }
            />
            <InsightCard
              title="طلبات حجز مُرسَلة"
              value={overview.bookingSubmissions}
              accent="green"
              subtitle="booking_submit"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              }
            />
            <InsightCard
              title="نقرات واتساب"
              value={overview.whatsappClicks}
              accent="green"
              subtitle="click_whatsapp"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              }
            />
            <InsightCard
              title="إعلانات تم نشرها"
              value={overview.listingsCreated}
              accent="purple"
              subtitle="listing_created"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
            />
          </div>

          {!hasAnyOverview && (
            <div style={{ marginTop: "0.75rem" }}>
              <EmptyState message="لم يتم تسجيل أي أحداث بعد. ستظهر البيانات هنا فور توصيل GA4." />
            </div>
          )}
        </div>

        {/* ── Section 2: Conversion funnel ─────────────────────────────── */}
        <div style={{ marginBottom: "2.25rem" }}>
          <SectionHeading
            title="قمع التحويل"
            subtitle="تدفق الزوار من المشاهدة حتى إرسال الحجز"
          />
          <div style={{
            background: "#fff",
            border: "1px solid #f1f5f9",
            borderRadius: 16,
            padding: "1.25rem 1.35rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <Funnel steps={funnel} />
          </div>
        </div>

        {/* ── Section 3: Top performers ─────────────────────────────────── */}
        <div style={{ marginBottom: "2.25rem" }}>
          <SectionHeading
            title="الأكثر أداءً"
            subtitle="أفضل 5 في كل فئة (مرتبة حسب عدد المشاهدات)"
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1rem",
          }}>
            <TopList
              title="أفضل العقارات"
              items={topProperties}
              icon="🏠"
              unit="مشاهدة"
            />
            <TopList
              title="أكثر المدن نشاطًا"
              items={topCities}
              icon="📍"
              unit="عقار"
            />
            <TopList
              title="أنواع العقارات"
              items={topPropertyTypes}
              icon="🏢"
              unit="إعلان"
            />
          </div>
        </div>

        {/* ── Section 4: Monetization ───────────────────────────────────── */}
        <div style={{ marginBottom: "2rem" }}>
          <SectionHeading
            title="تحليل الترقيات"
            subtitle="مؤشرات عرض الترقية والتحويل إلى اشتراك"
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: "1rem",
          }}>
            <MonetizationCard
              label="مرات ظهور عرض الترقية"
              value={monetization.upgradePromptViewed.toLocaleString("en")}
              hint="upgrade_prompt_viewed"
              accent="blue"
            />
            <MonetizationCard
              label="نقرات زر الترقية"
              value={monetization.upgradeClicked.toLocaleString("en")}
              hint="upgrade_clicked"
              accent="orange"
            />
            <MonetizationCard
              label="معدل التحويل"
              value={convRate(monetization.upgradeClicked, monetization.upgradePromptViewed)}
              hint="نقرات ÷ ظهور"
              accent="green"
            />
          </div>
        </div>

        {/* Future data note */}
        <div style={{
          padding: "1rem 1.25rem",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          direction: "rtl",
          fontSize: "0.78rem",
          color: "#64748b",
          display: "flex",
          gap: "0.5rem",
          alignItems: "flex-start",
        }}>
          <span style={{ fontSize: "1rem", lineHeight: 1.3, flexShrink: 0 }}>ℹ️</span>
          <div>
            <strong style={{ color: "#334155" }}>ملاحظة للمطور:</strong>{" "}
            البيانات الحالية هي قيم افتراضية. لتفعيل الإحصائيات الحقيقية،
            وصّل{" "}
            <Link href="/dashboard/admin/integrations" style={{ color: "#2563eb", textDecoration: "underline" }}>
              GA4 من إعدادات التطبيقات المدمجة
            </Link>
            {" "}ثم اربط{" "}
            <code style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "0 4px", borderRadius: 4 }}>
              GET /api/insights
            </code>
            {" "}بـ GA4 Reporting API.
          </div>
        </div>

      </div>
    </div>
  );
}
