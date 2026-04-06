"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Route → breadcrumb data ────────────────────────────────────────────────────
// Each entry maps a route prefix to [section, page-label].
// Order matters: more specific paths must come before their parent.

type BreadcrumbEntry = {
  section: string;
  label: string;
};

const ROUTE_MAP: Array<{ prefix: string; entry: BreadcrumbEntry }> = [
  // Operations
  { prefix: "/dashboard/admin/payment-requests", entry: { section: "الإدارة", label: "طلبات الاشتراك" } },
  { prefix: "/dashboard/admin/billing/invoices",  entry: { section: "الإدارة", label: "الفواتير" } },
  { prefix: "/dashboard/admin/users",             entry: { section: "الإدارة", label: "المستخدمون" } },
  { prefix: "/dashboard/admin/brokers",           entry: { section: "الإدارة", label: "الوسطاء" } },
  { prefix: "/dashboard/admin/companies",         entry: { section: "الإدارة", label: "الشركات" } },
  { prefix: "/dashboard/admin/requests",          entry: { section: "الإدارة", label: "الطلبات" } },
  { prefix: "/dashboard/admin/properties",        entry: { section: "الإدارة", label: "العقارات" } },
  { prefix: "/dashboard/admin/projects",          entry: { section: "الإدارة", label: "المشاريع" } },
  { prefix: "/dashboard/admin/agents",            entry: { section: "الإدارة", label: "الوكلاء" } },
  { prefix: "/dashboard/admin/owners",            entry: { section: "الإدارة", label: "الملاك" } },

  // Platform config
  { prefix: "/dashboard/admin/plans",             entry: { section: "إعدادات المنصة", label: "خطط الاشتراك" } },
  { prefix: "/dashboard/admin/plan-catalog",      entry: { section: "إعدادات المنصة", label: "كتالوج الخطط" } },
  { prefix: "/dashboard/admin/listing-types",     entry: { section: "إعدادات المنصة", label: "أنواع الإعلانات" } },
  { prefix: "/dashboard/admin/property-types",    entry: { section: "إعدادات المنصة", label: "أنواع العقارات" } },
  { prefix: "/dashboard/admin/ownership-types",   entry: { section: "إعدادات المنصة", label: "أنواع الملكية" } },
  { prefix: "/dashboard/admin/sections",          entry: { section: "إعدادات المنصة", label: "مقاطع الصفحات" } },
  { prefix: "/dashboard/admin/system",            entry: { section: "إعدادات المنصة", label: "إعدادات المنصة" } },

  // Blog & SEO
  { prefix: "/dashboard/admin/blog/seo-settings", entry: { section: "المدونة", label: "إعدادات SEO" } },
  { prefix: "/dashboard/admin/blog/categories",   entry: { section: "المدونة", label: "التصنيفات" } },
  { prefix: "/dashboard/admin/blog",              entry: { section: "المدونة", label: "المقالات" } },

  // Access & Permissions
  { prefix: "/dashboard/admin/staff",             entry: { section: "الصلاحيات", label: "إدارة الفريق" } },
  { prefix: "/dashboard/admin/roles",             entry: { section: "الصلاحيات", label: "الأدوار والصلاحيات" } },
];

function ChevronIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity: 0.4, flexShrink: 0 }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export default function AdminBreadcrumb() {
  const pathname = usePathname();

  // Root admin dashboard — no breadcrumb needed
  if (pathname === "/dashboard/admin") return null;

  // Find the best match (longest prefix that matches)
  let matched: BreadcrumbEntry | null = null;
  for (const { prefix, entry } of ROUTE_MAP) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      matched = entry;
      break;
    }
  }

  // If no match, show a generic "لوحة التحكم" only
  const crumbs: { label: string; href?: string }[] = [
    { label: "لوحة التحكم", href: "/dashboard/admin" },
  ];

  if (matched) {
    crumbs.push({ label: matched.section });
    crumbs.push({ label: matched.label });
  }

  if (crumbs.length <= 1) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.55rem 1.5rem",
        backgroundColor: "#f8fafc",
        borderBottom: "1px solid #f1f5f9",
        fontSize: "0.76rem",
        color: "#64748b",
      }}
    >
      {crumbs.map((crumb, i) => (
        <span key={i} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {i > 0 && <ChevronIcon />}
          {crumb.href ? (
            <Link
              href={crumb.href}
              style={{
                color: "#64748b",
                textDecoration: "none",
                transition: "color 0.12s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#0f172a"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#64748b"; }}
            >
              {crumb.label}
            </Link>
          ) : (
            <span style={{ color: i === crumbs.length - 1 ? "#0f172a" : "#64748b", fontWeight: i === crumbs.length - 1 ? 600 : 400 }}>
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
