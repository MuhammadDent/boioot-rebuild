"use client";

import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Link from "next/link";

// ── Static config data ──────────────────────────────────────────────────────

const PROFESSIONAL_ROLES = [
  { role: "Broker",       label: "الوسيط العقاري",  description: "يستقبل الطلبات ويتواصل مع الباحثين مباشرة.",        icon: "🤝" },
  { role: "Office",       label: "المكتب العقاري",  description: "يستقبل الطلبات ويوزّعها على وكلائه.",              icon: "🏢" },
  { role: "CompanyOwner", label: "مالك الشركة",     description: "نفس صلاحيات المكتب مع إدارة فريق كاملة.",          icon: "🏗️" },
  { role: "Agent",        label: "وكيل عقاري",      description: "يستقبل الطلبات المحولة إليه من المكتب/الشركة.",     icon: "👤" },
];

interface FeatureRow {
  feature: string;
  label: string;
  status: "active" | "coming_soon";
  description: string;
}

const FEATURES: FeatureRow[] = [
  { feature: "lead_reception",        label: "استقبال الطلبات المطابقة", status: "active",      description: "جميع المحترفين يستقبلون الطلبات مجاناً بناءً على مناطق تغطيتهم." },
  { feature: "instant_notifications", label: "إشعارات فورية",           status: "active",      description: "إشعار فوري عند وصول طلب جديد. مفعّل لجميع المحترفين." },
  { feature: "full_match_access",     label: "عرض جميع المطابقات",      status: "active",      description: "بدون قيود على عدد النتائج. مفعّل لجميع المحترفين." },
  { feature: "internal_messaging",    label: "التواصل الداخلي",         status: "active",      description: "التواصل مع الباحثين عبر المراسلة الداخلية للمنصة." },
  { feature: "crm",                   label: "إدارة العملاء (CRM)",     status: "coming_soon", description: "تتبع مسارات العملاء وإدارة الصفقات." },
  { feature: "analytics",             label: "التقارير والإحصاءات",     status: "coming_soon", description: "تحليلات متقدمة لأداء المطابقة والاستجابة." },
  { feature: "auto_matching",         label: "المطابقة التلقائية",       status: "coming_soon", description: "اقتراح عقارات تلقائياً لكل طلب دون تدخل يدوي." },
  { feature: "whatsapp",              label: "تكامل واتساب",            status: "coming_soon", description: "إشعارات واتساب فورية عند وصول طلبات جديدة." },
  { feature: "team_management",       label: "إدارة الفريق",            status: "coming_soon", description: "توزيع الطلبات على الوكلاء وتتبع أدائهم." },
  { feature: "export",                label: "تصدير البيانات",          status: "coming_soon", description: "تصدير الطلبات والعملاء بصيغة Excel / PDF." },
];

// ── Sub-components ──────────────────────────────────────────────────────────

function StatusPill({ status }: { status: "active" | "coming_soon" }) {
  return status === "active" ? (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 9px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700,
      background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0",
    }}>
      <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      مفعّل
    </span>
  ) : (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 9px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600,
      background: "#f1f5f9", color: "#64748b", border: "1px solid #e2e8f0",
    }}>
      قريباً
    </span>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function AdminMatchingPage() {
  const { user, isLoading } = useProtectedRoute();

  if (isLoading || !user) return null;

  return (
    <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>

      {/* Page header */}
      <div style={{
        backgroundColor: "#fff",
        borderBottom: "1px solid #e2e8f0",
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="4"/>
            <line x1="21.17" y1="8" x2="12" y2="8"/>
            <line x1="3.95" y1="6.06" x2="8.54" y2="14"/>
            <line x1="10.88" y1="21.94" x2="15.46" y2="14"/>
          </svg>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>ضبط نظام المطابقة</h1>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280" }}>إعدادات الوصول والأدوار والميزات</p>
          </div>
        </div>
        <span style={{
          padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700,
          background: "#f0fdf4", color: "#15803d", border: "1px solid #bbf7d0",
        }}>
          الوضع الحالي: مجاني للمحترفين
        </span>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "1.5rem 1rem" }}>

        {/* Architecture notice */}
        <div style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 12,
          padding: "1rem 1.25rem",
          marginBottom: "2rem",
          fontSize: "0.83rem",
          color: "#78350f",
          lineHeight: 1.6,
        }}>
          <strong>ملاحظة للمشرف:</strong> نظام المطابقة حالياً مجاني بالكامل لجميع الأدوار المهنية (وسيط / مكتب / وكيل).
          لا توجد حواجز اشتراك أو رسوم. الميزات المتقدمة (CRM، التقارير، واتساب...) محفوظة في البنية التحتية ويمكن تفعيلها مستقبلاً كأدوات اختيارية دون إعادة هيكلة النظام.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Professional roles with access */}
            <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "0.9rem 1.1rem", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>الأدوار ذات الوصول المهني</p>
                <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "#6b7280" }}>هذه الأدوار تستقبل الطلبات تلقائياً بدون اشتراك</p>
              </div>
              <div>
                {PROFESSIONAL_ROLES.map((r, i) => (
                  <div key={r.role} style={{
                    padding: "0.85rem 1.1rem",
                    borderBottom: i < PROFESSIONAL_ROLES.length - 1 ? "1px solid #f1f5f9" : "none",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.65rem",
                  }}>
                    <span style={{ fontSize: "1.2rem", lineHeight: 1, flexShrink: 0 }}>{r.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.15rem" }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.83rem", color: "#111827" }}>{r.label}</p>
                        <code style={{ fontSize: "0.65rem", fontFamily: "monospace", background: "#f1f5f9", color: "#475569", padding: "0 5px", borderRadius: 4 }}>{r.role}</code>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280" }}>{r.description}</p>
                    </div>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "2px 7px",
                      borderRadius: 20, background: "#f0fdf4", color: "#15803d",
                      border: "1px solid #bbf7d0", flexShrink: 0,
                    }}>
                      وصول كامل
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick links to related admin pages */}
            <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem 1.1rem" }}>
              <p style={{ margin: "0 0 0.75rem", fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>
                روابط ذات صلة
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {[
                  { label: "طلبات السوق (Buyer Requests)", href: "/dashboard/admin/buyer-requests" },
                  { label: "الوسطاء والمكاتب", href: "/dashboard/admin/agencies" },
                  { label: "خطط الاشتراك", href: "/dashboard/admin/plans" },
                  { label: "كتالوج الخطط", href: "/dashboard/admin/plan-catalog" },
                  { label: "إعدادات النظام", href: "/dashboard/admin/system" },
                ].map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.65rem",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontSize: "0.82rem",
                      color: "#374151",
                      fontWeight: 500,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {link.label}
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Right column — feature matrix */}
          <section style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "0.9rem 1.1rem", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem", color: "#111827" }}>الميزات وحالتها</p>
              <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "#6b7280" }}>الميزات المفعّلة حالياً والأدوات القادمة</p>
            </div>
            <div>
              {FEATURES.map((f, i) => (
                <div key={f.feature} style={{
                  padding: "0.8rem 1.1rem",
                  borderBottom: i < FEATURES.length - 1 ? "1px solid #f8fafc" : "none",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.6rem",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "0.82rem", color: "#111827" }}>{f.label}</p>
                      <StatusPill status={f.status} />
                    </div>
                    <p style={{ margin: 0, fontSize: "0.74rem", color: "#9ca3af", lineHeight: 1.4 }}>{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Architecture info box */}
        <div style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.1rem 1.25rem",
          marginTop: "1.5rem",
        }}>
          <p style={{ margin: "0 0 0.5rem", fontWeight: 700, fontSize: "0.85rem", color: "#374151" }}>
            🏗️ البنية التحتية للمرحلة القادمة
          </p>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.6 }}>
            جداول خطط المطابقة (<code style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>ProductArea = &quot;matching&quot;</code>) محفوظة في قاعدة البيانات وجاهزة للاستخدام عند تفعيل الأدوات المتقدمة.
            إضافة أداة جديدة تتطلب فقط: إنشاء خطة matching جديدة في{" "}
            <Link href="/dashboard/admin/plans" style={{ color: "#2563eb" }}>كتالوج الخطط</Link>، وربطها بالميزة المطلوبة — دون تغيير في هيكل قاعدة البيانات أو منطق المطابقة الأساسي.
          </p>
        </div>

      </div>
    </div>
  );
}
