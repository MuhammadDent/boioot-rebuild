"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────
type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
  exact?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
  permission?: string;
};

// ── Icon helper ─────────────────────────────────────────────────────────────────
function Icon({ path, size = 15 }: { path: React.ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {path}
    </svg>
  );
}

// ── Nav structure ──────────────────────────────────────────────────────────────
//
//  1. Dashboard overview
//  2. الإدارة       — Daily operations (users, companies, properties, billing…)
//  3. إعدادات المنصة — Static platform configuration
//  4. المدونة والـ SEO
//  5. الصلاحيات    — Staff & roles

const NAV_GROUPS: NavGroup[] = [
  // ── 1. Overview ─────────────────────────────────────────────────────────────
  {
    label: "لوحة التحكم",
    items: [
      {
        href: "/dashboard/admin",
        label: "نظرة عامة",
        exact: true,
        icon: <Icon path={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>} />,
      },
    ],
  },

  // ── 2. Operations ────────────────────────────────────────────────────────────
  {
    label: "الإدارة",
    items: [
      {
        href: "/dashboard/admin/payment-requests",
        label: "طلبات الاشتراك",
        permission: "billing.view",
        icon: <Icon path={<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></>} />,
      },
      {
        href: "/dashboard/admin/billing/invoices",
        label: "الفواتير",
        permission: "billing.view",
        icon: <Icon path={<><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>} />,
      },
      {
        href: "/dashboard/admin/users",
        label: "المستخدمون",
        permission: "users.view",
        icon: <Icon path={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>} />,
      },
      {
        href: "/dashboard/admin/brokers",
        label: "الوسطاء",
        permission: "users.view",
        icon: <Icon path={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />,
      },
      {
        href: "/dashboard/admin/companies",
        label: "الشركات",
        permission: "companies.view",
        icon: <Icon path={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><rect x="9" y="14" width="6" height="7" /></>} />,
      },
      {
        href: "/dashboard/admin/requests",
        label: "الطلبات",
        permission: "requests.view",
        icon: <Icon path={<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>} />,
      },
      {
        href: "/dashboard/admin/properties",
        label: "العقارات",
        permission: "properties.view",
        icon: <Icon path={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>} />,
      },
      {
        href: "/dashboard/admin/projects",
        label: "المشاريع",
        permission: "projects.view",
        icon: <Icon path={<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>} />,
      },
    ],
  },

  // ── 3. Platform configuration ─────────────────────────────────────────────────
  {
    label: "إعدادات المنصة",
    permission: "settings.view",
    items: [
      {
        href: "/dashboard/admin/plans",
        label: "خطط الاشتراك",
        permission: "settings.manage",
        icon: <Icon path={<><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>} />,
      },
      {
        href: "/dashboard/admin/plan-catalog",
        label: "كتالوج الخطط",
        permission: "settings.manage",
        icon: <Icon path={<><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>} />,
      },
      {
        href: "/dashboard/admin/listing-types",
        label: "أنواع الإعلانات",
        permission: "settings.manage",
        icon: <Icon path={<><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>} />,
      },
      {
        href: "/dashboard/admin/property-types",
        label: "أنواع العقارات",
        permission: "settings.manage",
        icon: <Icon path={<><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>} />,
      },
      {
        href: "/dashboard/admin/ownership-types",
        label: "أنواع الملكية",
        permission: "settings.manage",
        icon: <Icon path={<><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>} />,
      },
      {
        href: "/dashboard/admin/sections",
        label: "مقاطع الصفحات",
        permission: "settings.manage",
        icon: <Icon path={<><rect x="3" y="3" width="18" height="4" rx="1" /><rect x="3" y="10" width="18" height="4" rx="1" /><rect x="3" y="17" width="18" height="4" rx="1" /></>} />,
      },
    ],
  },

  // ── 4. Blog & SEO ─────────────────────────────────────────────────────────────
  {
    label: "المدونة والـ SEO",
    permission: "blog.view",
    items: [
      {
        href: "/dashboard/admin/blog",
        label: "المقالات",
        permission: "blog.view",
        icon: <Icon path={<><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>} />,
      },
      {
        href: "/dashboard/admin/blog/categories",
        label: "التصنيفات",
        permission: "blog.view",
        icon: <Icon path={<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></>} />,
      },
      {
        href: "/dashboard/admin/blog/seo-settings",
        label: "إعدادات SEO",
        permission: "seo.settings.manage",
        icon: <Icon path={<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>} />,
      },
    ],
  },

  // ── 5. Access & Permissions ───────────────────────────────────────────────────
  {
    label: "الصلاحيات",
    permission: "staff.view",
    items: [
      {
        href: "/dashboard/admin/staff",
        label: "إدارة الفريق",
        permission: "staff.view",
        icon: <Icon path={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>} />,
      },
      {
        href: "/dashboard/admin/roles",
        label: "الأدوار والصلاحيات",
        permission: "roles.view",
        icon: <Icon path={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>} />,
      },
    ],
  },
];

// ── Sidebar ────────────────────────────────────────────────────────────────────
interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  function can(permission?: string): boolean {
    if (!permission) return true;
    return hasPermission(permission);
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside
      className={`admin-sidebar${isOpen ? " open" : ""}`}
      style={{
        backgroundColor: "#111827",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Mobile: close button */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="إغلاق القائمة"
          className="admin-sidebar-close"
        >
          ✕
        </button>
      )}

      {/* User badge */}
      <div
        style={{
          padding: "0.75rem 1.1rem",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            backgroundColor: "#22c55e",
            boxShadow: "0 0 0 2px rgba(34,197,94,0.2)",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "0.75rem", color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user?.fullName ?? "مدير النظام"}
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0.4rem 0 1rem", overflowY: "auto" }}>
        {NAV_GROUPS.map((group, groupIdx) => {
          if (!can(group.permission)) return null;

          const visibleItems = group.items.filter((item) => can(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              {/* Section divider (except first group) */}
              {groupIdx > 0 && (
                <div
                  style={{
                    height: 1,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    margin: "0.35rem 0.75rem 0",
                  }}
                />
              )}

              {/* Group label */}
              <div
                style={{
                  padding: "0.6rem 1.1rem 0.2rem",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: "#4b5563",
                  textTransform: "uppercase",
                  letterSpacing: "0.09em",
                }}
              >
                {group.label}
              </div>

              {/* Items */}
              {visibleItems.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.55rem",
                      padding: "0.42rem 1.1rem",
                      margin: "0.05rem 0.4rem",
                      borderRadius: 7,
                      fontSize: "0.81rem",
                      fontWeight: active ? 600 : 400,
                      color: active ? "#ffffff" : "#9ca3af",
                      backgroundColor: active ? "#166534" : "transparent",
                      textDecoration: "none",
                      transition: "background-color 0.12s, color 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                        e.currentTarget.style.color = "#e5e7eb";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.color = "#9ca3af";
                      }
                    }}
                  >
                    <span style={{ color: active ? "#4ade80" : "#4b5563", display: "flex" }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "0.65rem 1.1rem",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        <Link
          href="/dashboard"
          onClick={onClose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.76rem",
            color: "#4b5563",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#6b7280"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#4b5563"; }}
        >
          <Icon path={<path d="M15 18l-6-6 6-6" />} />
          العودة للوحة الرئيسية
        </Link>
      </div>
    </aside>
  );
}
