"use client";

import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { LoadingRow } from "@/components/dashboard/LoadingRow";

// ── Icon helper ───────────────────────────────────────────────────────────────

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

// ── Cards config ──────────────────────────────────────────────────────────────

type SystemCard = {
  href: string;
  label: string;
  description: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
  permission?: string;
};

const SYSTEM_CARDS: SystemCard[] = [
  {
    href: "/dashboard/admin/plans",
    label: "خطط الاشتراك",
    description: "إدارة خطط الاشتراك وتسعيرها ومزاياها",
    color: "#7c3aed",
    bg: "#f5f3ff",
    icon: (
      <Icon>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </Icon>
    ),
  },
  {
    href: "/dashboard/admin/plan-catalog",
    label: "كتالوج الخطط",
    description: "عرض وتنظيم الخطط المتاحة للعملاء",
    color: "#0891b2",
    bg: "#ecfeff",
    icon: (
      <Icon>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </Icon>
    ),
  },
  {
    href: "/dashboard/admin/payment-requests",
    label: "طلبات الاشتراك",
    description: "مراجعة وإدارة طلبات الدفع والاشتراكات",
    color: "#b45309",
    bg: "#fffbeb",
    icon: (
      <Icon>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </Icon>
    ),
  },
  {
    href: "/dashboard/admin/billing/invoices",
    label: "الفواتير",
    description: "سجل الفواتير والمدفوعات المكتملة",
    color: "#15803d",
    bg: "#f0fdf4",
    icon: (
      <Icon>
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </Icon>
    ),
  },
  {
    href: "/dashboard/admin/listing-types",
    label: "أنواع الإعلانات",
    description: "إدارة أنواع الإدراج المتاحة (بيع، إيجار...)",
    color: "#0369a1",
    bg: "#eff6ff",
    icon: (
      <Icon>
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </Icon>
    ),
  },
  {
    href: "/dashboard/admin/property-types",
    label: "أنواع العقارات",
    description: "تصنيف العقارات (شقة، فيلا، أرض...)",
    color: "#d97706",
    bg: "#fff7ed",
    icon: (
      <Icon>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </Icon>
    ),
  },
  {
    href: "/dashboard/admin/ownership-types",
    label: "أنواع الملكية",
    description: "تعريف أنواع الملكية القانونية للعقارات",
    color: "#9333ea",
    bg: "#faf5ff",
    icon: (
      <Icon>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </Icon>
    ),
  },
  {
    href: "/dashboard/admin/sections",
    label: "مقاطع الصفحات",
    description: "تخصيص محتوى أقسام الصفحة الرئيسية",
    color: "#be185d",
    bg: "#fdf2f8",
    icon: (
      <Icon>
        <rect x="3" y="3" width="18" height="4" rx="1" />
        <rect x="3" y="10" width="18" height="4" rx="1" />
        <rect x="3" y="17" width="18" height="4" rx="1" />
      </Icon>
    ),
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminSystemPage() {
  const { isLoading } = useProtectedRoute({ requiredPermission: "settings.view" });

  if (isLoading) return <LoadingRow />;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Back link */}
      <Link
        href="/dashboard/admin"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.82rem",
          color: "#6b7280",
          textDecoration: "none",
          marginBottom: "1.5rem",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        العودة إلى لوحة التحكم
      </Link>

      {/* Page header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "1.6rem",
            fontWeight: 700,
            color: "#111827",
            marginBottom: "0.4rem",
          }}
        >
          إعدادات النظام
        </h1>
        <p style={{ fontSize: "0.92rem", color: "#6b7280", margin: 0 }}>
          إدارة خطط الاشتراك وأنواع العقارات والإعدادات العامة للمنصة
        </p>
      </div>

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1rem",
        }}
      >
        {SYSTEM_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "1rem",
              padding: "1.2rem",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              backgroundColor: "#ffffff",
              textDecoration: "none",
              transition: "box-shadow 0.15s, border-color 0.15s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
              e.currentTarget.style.borderColor = card.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }}
          >
            {/* Icon box */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: card.bg,
                color: card.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {card.icon}
            </div>

            {/* Text */}
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.92rem",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: "0.25rem",
                }}
              >
                {card.label}
              </div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#6b7280",
                  lineHeight: 1.5,
                }}
              >
                {card.description}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
