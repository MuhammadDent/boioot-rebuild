"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { STAFF_ROLE_LABELS, type Permission } from "@/lib/rbac";

// ── Quick access cards config ─────────────────────────────────────────────────
type QuickCard = {
  href: string;
  label: string;
  description: string;
  permission?: Permission;
  color: string;
  bg: string;
  icon: React.ReactNode;
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const QUICK_CARDS: QuickCard[] = [
  {
    href: "/dashboard/admin/staff",
    label: "إدارة الفريق",
    description: "موظفو النظام الداخليون وأدوارهم",
    permission: "staff.view",
    color: "#7c3aed",
    bg: "#f5f3ff",
    icon: <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>,
  },
  {
    href: "/dashboard/admin/roles",
    label: "الأدوار والصلاحيات",
    description: "مصفوفة الصلاحيات لكل دور",
    permission: "roles.view",
    color: "#0891b2",
    bg: "#ecfeff",
    icon: <Icon><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>,
  },
  {
    href: "/dashboard/admin/users",
    label: "المستخدمون",
    description: "مستخدمو المنصة والحسابات",
    permission: "users.view",
    color: "#2563eb",
    bg: "#eff6ff",
    icon: <Icon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>,
  },
  {
    href: "/dashboard/admin/companies",
    label: "الشركات والمكاتب",
    description: "شركات التطوير والمكاتب العقارية",
    permission: "companies.view",
    color: "#0284c7",
    bg: "#e0f2fe",
    icon: <Icon><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><rect x="9" y="14" width="6" height="7"/></Icon>,
  },
  {
    href: "/dashboard/admin/agents",
    label: "الوكلاء العقاريون",
    description: "وكلاء المكاتب والشركات العقارية",
    permission: "users.view",
    color: "#0891b2",
    bg: "#ecfeff",
    icon: <Icon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M16 11h6M19 8v6"/></Icon>,
  },
  {
    href: "/dashboard/admin/brokers",
    label: "الوسطاء",
    description: "الوسطاء العقاريون المسجلون في المنصة",
    permission: "users.view",
    color: "#7c3aed",
    bg: "#f5f3ff",
    icon: <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 11v6M20 14h6"/></Icon>,
  },
  {
    href: "/dashboard/admin/owners",
    label: "ملاك العقارات",
    description: "الملاك المسجلون وعقاراتهم المعروضة",
    permission: "users.view",
    color: "#b45309",
    bg: "#fef3c7",
    icon: <Icon><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Icon>,
  },
  {
    href: "/dashboard/admin/properties",
    label: "العقارات",
    description: "استعراض وإدارة جميع العقارات",
    permission: "properties.view",
    color: "#059669",
    bg: "#ecfdf5",
    icon: <Icon><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Icon>,
  },
  {
    href: "/dashboard/admin/projects",
    label: "المشاريع",
    description: "مشاريع التطوير العقاري",
    permission: "projects.view",
    color: "#d97706",
    bg: "#fffbeb",
    icon: <Icon><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></Icon>,
  },
  {
    href: "/dashboard/admin/requests",
    label: "الطلبات",
    description: "طلبات المستخدمين والتعيينات",
    permission: "requests.view",
    color: "#dc2626",
    bg: "#fef2f2",
    icon: <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Icon>,
  },
  {
    href: "/dashboard/admin/blog",
    label: "المدونة",
    description: "مقالات المحتوى والتدوين",
    permission: "blog.view",
    color: "#059669",
    bg: "#ecfdf5",
    icon: <Icon><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></Icon>,
  },
  {
    href: "/dashboard/admin/blog/seo-settings",
    label: "إعدادات SEO",
    description: "قوالب وإعدادات تحسين محركات البحث",
    permission: "seo.settings.manage",
    color: "#7c3aed",
    bg: "#f5f3ff",
    icon: <Icon><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon>,
  },
  {
    href: "/dashboard/admin/plans",
    label: "إعدادات النظام",
    description: "خطط، أنواع إعلانات وعقارات",
    permission: "settings.manage",
    color: "#6b7280",
    bg: "#f9fafb",
    icon: <Icon><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Icon>,
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminOverviewPage() {
  const { isLoading } = useProtectedRoute();
  const { user, hasPermission } = useAuth();

  if (isLoading || !user) return null;

  const role = user.role;
  const roleLabel = STAFF_ROLE_LABELS[role as keyof typeof STAFF_ROLE_LABELS] ?? role;
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء الخير";

  const visibleCards = QUICK_CARDS.filter(
    (c) => !c.permission || hasPermission(c.permission)
  );

  return (
    <div style={{ padding: "1.75rem 1.5rem 3rem", direction: "rtl" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#1e293b" }}>
            {greeting}، {user.fullName.split(" ")[0]}
          </h1>
          <span style={{
            backgroundColor: "#fef2f2",
            color: "#dc2626",
            fontSize: "0.72rem",
            fontWeight: 700,
            padding: "0.2rem 0.7rem",
            borderRadius: 20,
          }}>
            {roleLabel}
          </span>
        </div>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.9rem" }}>
          مرحباً بك في لوحة تحكم Boioot الداخلية
        </p>
      </div>

      {/* Quick access cards */}
      <div style={{ marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 1rem" }}>
          الوصول السريع
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "0.85rem",
        }}>
          {visibleCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.85rem",
                padding: "1rem 1.1rem",
                backgroundColor: "#fff",
                borderRadius: 12,
                border: "1px solid #e8ecf0",
                textDecoration: "none",
                transition: "box-shadow 0.15s, border-color 0.15s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.09)";
                e.currentTarget.style.borderColor = card.color + "44";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                e.currentTarget.style.borderColor = "#e8ecf0";
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: card.bg,
                color: card.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.15rem" }}>
                  {card.label}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.5 }}>
                  {card.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* SuperAdmin hint — visible only to users who hold roles.manage (Admin only) */}
      {hasPermission("roles.manage") && (
        <div style={{
          marginTop: "1.5rem",
          padding: "1rem 1.25rem",
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 12,
          fontSize: "0.82rem",
          color: "#166534",
          lineHeight: 1.6,
        }}>
          <strong>مدير النظام:</strong> لديك صلاحية كاملة على جميع أقسام النظام. يمكنك إدارة الفريق والأدوار من قسم &quot;الفريق والصلاحيات&quot; في الشريط الجانبي.
        </div>
      )}
    </div>
  );
}
