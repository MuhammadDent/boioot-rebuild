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
  icon: React.ReactNode;
  items: NavItem[];
  permission?: string;
};

// ── Icon helpers ───────────────────────────────────────────────────────────────
function Icon({ path, size = 16 }: { path: React.ReactNode; size?: number }) {
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

// ── Nav groups definition ──────────────────────────────────────────────────────
const NAV_GROUPS: NavGroup[] = [
  {
    label: "نظرة عامة",
    icon: <Icon path={<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></>} />,
    items: [
      {
        href: "/dashboard/admin",
        label: "لوحة التحكم",
        exact: true,
        icon: <Icon path={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>} />,
      },
    ],
  },
  {
    label: "الفريق والصلاحيات",
    icon: <Icon path={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />,
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
  {
    label: "المستخدمون والشركات",
    icon: <Icon path={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>} />,
    permission: "users.view",
    items: [
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
        icon: <Icon path={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>} />,
      },
      {
        href: "/dashboard/admin/companies",
        label: "الشركات",
        permission: "companies.view",
        icon: <Icon path={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><rect x="9" y="14" width="6" height="7" /></>} />,
      },
    ],
  },
  {
    label: "العقارات والمشاريع",
    icon: <Icon path={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>} />,
    permission: "properties.view",
    items: [
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
  {
    label: "الطلبات",
    icon: <Icon path={<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>} />,
    permission: "requests.view",
    items: [
      {
        href: "/dashboard/admin/requests",
        label: "الطلبات",
        permission: "requests.view",
        icon: <Icon path={<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>} />,
      },
    ],
  },
  {
    label: "المدونة والـ SEO",
    icon: <Icon path={<><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>} />,
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
        icon: <Icon path={<><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>} />,
      },
      {
        href: "/dashboard/admin/blog/seo-settings",
        label: "إعدادات SEO",
        permission: "seo.settings.manage",
        icon: <Icon path={<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>} />,
      },
    ],
  },
  {
    label: "محتوى الموقع",
    icon: <Icon path={<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>} />,
    permission: "settings.manage",
    items: [
      {
        href: "/dashboard/admin/sections",
        label: "مقاطع الصفحات",
        permission: "settings.manage",
        icon: <Icon path={<><rect x="3" y="3" width="18" height="4" rx="1" /><rect x="3" y="10" width="18" height="4" rx="1" /><rect x="3" y="17" width="18" height="4" rx="1" /></>} />,
      },
    ],
  },
  {
    label: "إعدادات النظام",
    icon: <Icon path={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>} />,
    permission: "settings.view",
    items: [
      {
        href: "/dashboard/admin/plans",
        label: "خطط الاشتراك",
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
        href: "/dashboard/admin/billing/invoices",
        label: "الفواتير",
        permission: "billing.view",
        icon: <Icon path={<><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>} />,
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
      {/* Mobile: close button (shown via CSS on mobile only) */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="إغلاق القائمة"
          className="admin-sidebar-close"
        >
          ✕
        </button>
      )}

      {/* Brand header */}
      <div
        style={{
          padding: "1rem 1.1rem 0.8rem",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "0.3rem",
          }}
        >
          Boioot Backoffice
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              boxShadow: "0 0 0 2px rgba(34,197,94,0.25)",
            }}
          />
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
            {user?.fullName ?? "مدير"}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0.5rem 0 1rem", overflowY: "auto" }}>
        {NAV_GROUPS.map((group) => {
          if (!can(group.permission)) return null;

          const visibleItems = group.items.filter((item) => can(item.permission));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label} style={{ marginBottom: "0.25rem" }}>
              {/* Group label */}
              <div
                style={{
                  padding: "0.65rem 1.1rem 0.25rem",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: "#4b5563",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
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
                      gap: "0.6rem",
                      padding: "0.5rem 1.1rem",
                      margin: "0.05rem 0.4rem",
                      borderRadius: 8,
                      fontSize: "0.82rem",
                      fontWeight: active ? 600 : 400,
                      color: active ? "#ffffff" : "#9ca3af",
                      backgroundColor: active
                        ? "#2e7d32"
                        : "transparent",
                      textDecoration: "none",
                      transition: "background-color 0.15s, color 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)";
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
                    <span style={{ color: active ? "#fff" : "#6b7280", display: "flex" }}>
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
          padding: "0.75rem 1.1rem",
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
            fontSize: "0.78rem",
            color: "#6b7280",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#9ca3af";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#6b7280";
          }}
        >
          <Icon
            path={
              <>
                <polyline points="15 18 9 12 15 6" />
              </>
            }
          />
          العودة للوحة الرئيسية
        </Link>
      </div>
    </aside>
  );
}
