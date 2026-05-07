"use client";

import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import Link from "next/link";

// ── Feature cards data ─────────────────────────────────────────────────────

interface FreeTool {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

interface FutureTool {
  icon: string;
  title: string;
  description: string;
}

const FREE_TOOLS: FreeTool[] = [
  {
    icon: "📍",
    title: "مناطق التغطية",
    description: "حدد المدن والأحياء التي تعمل فيها. سيطابقك النظام تلقائياً مع طلبات الباحثين في هذه المناطق.",
    actionLabel: "إدارة مناطق التغطية",
    actionHref: "/dashboard/coverage",
  },
  {
    icon: "🎯",
    title: "استقبال الطلبات المطابقة",
    description: "اطّلع على جميع طلبات الباحثين المتطابقة مع مناطق تغطيتك. مجاني بالكامل ومفتوح لك دائماً.",
    actionLabel: "عرض الطلبات",
    actionHref: "/dashboard/leads",
  },
  {
    icon: "🔔",
    title: "إشعارات فورية",
    description: "تصلك إشعارات فور نشر أي طلب في مناطقك، بدون أي تأخير. لا تفوّت أي فرصة.",
  },
  {
    icon: "💬",
    title: "التواصل مع الباحثين",
    description: "تواصل مباشرة مع أصحاب الطلبات عبر المراسلة الداخلية للمنصة.",
    actionLabel: "الرسائل",
    actionHref: "/dashboard/messages",
  },
  {
    icon: "📋",
    title: "إدارة الطلبات",
    description: "فلتر الطلبات وتتبع حالتها (مفتوح / مغلق) من لوحة التحكم.",
    actionLabel: "عرض الطلبات",
    actionHref: "/dashboard/leads",
  },
];

const FUTURE_TOOLS: FutureTool[] = [
  {
    icon: "🗃️",
    title: "CRM — إدارة العملاء",
    description: "تتبع مساراتك مع كل عميل، سجّل الملاحظات، وأدر الصفقات من مكان واحد.",
  },
  {
    icon: "📊",
    title: "التقارير والإحصاءات",
    description: "تحليلات متقدمة لأداء مطابقتك: معدل الرد، أكثر المناطق نشاطاً، ونسب التحويل.",
  },
  {
    icon: "🤖",
    title: "المطابقة التلقائية",
    description: "اقتراح تلقائي للعقارات المناسبة لكل طلب دون تدخل يدوي.",
  },
  {
    icon: "📱",
    title: "تكامل واتساب",
    description: "إشعارات واتساب مباشرة عند وصول طلب جديد. لا تفوّت أي عميل حتى خارج المنصة.",
  },
  {
    icon: "👥",
    title: "إدارة الفريق",
    description: "وزّع الطلبات تلقائياً على أعضاء فريقك وتابع أداء كل وكيل.",
  },
  {
    icon: "📤",
    title: "تصدير البيانات",
    description: "صدّر قوائم الطلبات والعملاء بصيغة Excel أو PDF.",
  },
];

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#111827" }}>{title}</h2>
      {subtitle && <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#6b7280" }}>{subtitle}</p>}
    </div>
  );
}

function FreeToolCard({ tool }: { tool: FreeTool }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: "1.1rem 1.25rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <span style={{ fontSize: "1.4rem", lineHeight: 1, flexShrink: 0 }}>{tool.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>{tool.title}</p>
            <span style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              padding: "1px 7px",
              borderRadius: 20,
              background: "#f0fdf4",
              color: "#15803d",
              border: "1px solid #bbf7d0",
            }}>
              مجاني
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "#6b7280", lineHeight: 1.5 }}>{tool.description}</p>
        </div>
      </div>
      {tool.actionLabel && tool.actionHref && (
        <div style={{ paddingRight: "2.1rem" }}>
          <Link
            href={tool.actionHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#16a34a",
              textDecoration: "none",
            }}
          >
            {tool.actionLabel}
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}

function FutureToolCard({ tool }: { tool: FutureTool }) {
  return (
    <div style={{
      background: "#fafafa",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: "0.9rem 1.1rem",
      display: "flex",
      alignItems: "flex-start",
      gap: "0.65rem",
      opacity: 0.8,
    }}>
      <span style={{ fontSize: "1.25rem", lineHeight: 1, flexShrink: 0, filter: "grayscale(0.3)" }}>{tool.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.85rem", color: "#374151" }}>{tool.title}</p>
          <span style={{
            fontSize: "0.62rem",
            fontWeight: 700,
            padding: "1px 7px",
            borderRadius: 20,
            background: "#f1f5f9",
            color: "#64748b",
            border: "1px solid #e2e8f0",
          }}>
            قريباً
          </span>
        </div>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8", lineHeight: 1.5 }}>{tool.description}</p>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function MatchingSettingsPage() {
  const { user, isLoading } = useProtectedRoute();

  if (isLoading || !user) return null;

  return (
    <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>

      {/* Header */}
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
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>إعدادات المطابقة</h1>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280" }}>أدواتك وصلاحياتك في نظام المطابقة</p>
          </div>
        </div>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.3rem",
          padding: "4px 12px",
          borderRadius: 20,
          fontSize: "0.75rem",
          fontWeight: 700,
          background: "#f0fdf4",
          color: "#15803d",
          border: "1px solid #bbf7d0",
        }}>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          وصول احترافي مجاني
        </span>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "1.5rem 1rem" }}>

        {/* Professional access notice */}
        <div style={{
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
          border: "1px solid #86efac",
          borderRadius: 12,
          padding: "1.1rem 1.25rem",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#16a34a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: "0 0 0.2rem", fontWeight: 700, fontSize: "0.95rem", color: "#14532d" }}>
              نظام المطابقة مجاني لك بالكامل
            </p>
            <p style={{ margin: 0, fontSize: "0.83rem", color: "#166534", lineHeight: 1.6 }}>
              بوصفك وسيطاً أو مكتباً عقارياً، تمتلك وصولاً كاملاً لجميع أدوات المطابقة — استقبال الطلبات،
              الإشعارات، التواصل، وإدارة الطلبات — دون أي رسوم أو اشتراكات.
            </p>
          </div>
        </div>

        {/* Active tools section */}
        <div style={{ marginBottom: "2.5rem" }}>
          <SectionHeader
            title="الأدوات المتاحة الآن"
            subtitle="جميع هذه الأدوات مجانية ومفعّلة لحسابك تلقائياً"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {FREE_TOOLS.map(tool => (
              <FreeToolCard key={tool.title} tool={tool} />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.25rem",
          marginBottom: "2.5rem",
        }}>
          <p style={{ margin: "0 0 0.85rem", fontWeight: 700, fontSize: "0.9rem", color: "#111827" }}>
            روابط سريعة
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
            {[
              { label: "مناطق التغطية", href: "/dashboard/coverage", color: "#16a34a" },
              { label: "الطلبات المطابقة", href: "/dashboard/leads", color: "#2563eb" },
              { label: "الرسائل", href: "/dashboard/messages", color: "#7c3aed" },
              { label: "الملف الشخصي", href: "/dashboard/profile", color: "#0891b2" },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "inline-block",
                  padding: "0.45rem 1rem",
                  borderRadius: 8,
                  border: `1px solid ${link.color}22`,
                  background: `${link.color}0d`,
                  color: link.color,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  transition: "opacity 0.15s",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Future tools section */}
        <div>
          <SectionHeader
            title="أدوات متقدمة قادمة قريباً"
            subtitle="ميزات إضافية اختيارية ستكون متاحة مستقبلاً — تساعدك على إدارة عملك بكفاءة أعلى"
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "0.75rem",
          }}>
            {FUTURE_TOOLS.map(tool => (
              <FutureToolCard key={tool.title} tool={tool} />
            ))}
          </div>
          <p style={{
            margin: "1rem 0 0",
            fontSize: "0.78rem",
            color: "#94a3b8",
            textAlign: "center",
          }}>
            هذه الأدوات اختيارية ولن تؤثر على الوصول المجاني الحالي.
          </p>
        </div>

      </div>
    </div>
  );
}
