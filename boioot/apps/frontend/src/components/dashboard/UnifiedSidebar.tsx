"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// ── Icon helper ──────────────────────────────────────────────────────────────

function Ic({ d, size = 15 }: { d: ReactNode; size?: number }) {
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
      {d}
    </svg>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        flexShrink: 0,
        transition: "transform 0.2s",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        opacity: 0.35,
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Icon library ─────────────────────────────────────────────────────────────

const IC = {
  dashboard: <Ic d={<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>} />,
  overview:  <Ic d={<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>} />,
  profile:   <Ic d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>} />,
  messages:  <Ic d={<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>} />,
  requests:  <Ic d={<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h4" /></>} />,
  listings:  <Ic d={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>} />,
  projects:  <Ic d={<><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>} />,
  clients:   <Ic d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />,
  team:      <Ic d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />,
  users:     <Ic d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>} />,
  companies: <Ic d={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><rect x="9" y="14" width="6" height="7" /></>} />,
  system:    <Ic d={<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>} />,
  sessions:  <Ic d={<><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>} />,
  verify:    <Ic d={<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><polyline points="9 11 12 14 22 4" /></>} />,
  star:      <Ic d={<><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></>} />,
  billing:   <Ic d={<><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>} />,
  shield:    <Ic d={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>} />,
  lock:      <Ic d={<><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>} />,
  blog:      <Ic d={<><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></>} />,
  folder:    <Ic d={<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />} />,
  search:    <Ic d={<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>} />,
  list:      <Ic d={<><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>} />,
  layers:    <Ic d={<><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>} />,
  check:     <Ic d={<><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>} />,
  grid:      <Ic d={<><rect x="3" y="3" width="18" height="4" rx="1" /><rect x="3" y="10" width="18" height="4" rx="1" /><rect x="3" y="17" width="18" height="4" rx="1" /></>} />,
  logout:    <Ic d={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>} />,
  back:      <Ic d={<path d="M15 18l-6-6 6-6" />} />,
  chat:      <Ic d={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />} />,
};

// ── Types ─────────────────────────────────────────────────────────────────────

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  permission?: string;
};

export type SidebarGroup = {
  id: string;
  label: string;
  icon: ReactNode;
  items: SidebarNavItem[];
  alwaysOpen?: boolean;
  permission?: string;
};

// ── Sidebar config per role ───────────────────────────────────────────────────
//
// Non-admin roles: grouped navigation
// Admin / Staff:   permission-filtered grouped navigation

const CUSTOMER_COMMON_ACCOUNT: SidebarNavItem[] = [
  { href: "/dashboard/profile",  label: "الملف الشخصي",  icon: IC.profile,  exact: true },
  { href: "/dashboard/sessions", label: "الجلسات النشطة", icon: IC.sessions, exact: true },
];

const CUSTOMER_SUBSCRIPTION: SidebarNavItem[] = [
  { href: "/dashboard/subscription",       label: "اشتراكي",        icon: IC.star,  exact: true },
  { href: "/dashboard/subscription/plans", label: "باقات الاشتراك", icon: IC.layers },
];

function makeCustomerGroups(businessItems: SidebarNavItem[]): SidebarGroup[] {
  return [
    {
      id: "overview",
      label: "لوحة التحكم",
      icon: IC.dashboard,
      alwaysOpen: true,
      items: [{ href: "/dashboard", label: "نظرة عامة", icon: IC.overview, exact: true }],
    },
    {
      id: "account",
      label: "الحساب",
      icon: IC.profile,
      items: CUSTOMER_COMMON_ACCOUNT,
    },
    {
      id: "messages",
      label: "التواصل",
      icon: IC.messages,
      items: [{ href: "/dashboard/messages", label: "الرسائل", icon: IC.chat }],
    },
    ...(businessItems.length > 0
      ? [{ id: "business", label: "الأعمال", icon: IC.listings, items: businessItems }]
      : []),
    {
      id: "verification",
      label: "التوثيق",
      icon: IC.verify,
      items: [{ href: "/dashboard/verification", label: "التوثيق", icon: IC.verify }],
    },
    {
      id: "subscription",
      label: "الاشتراك",
      icon: IC.star,
      items: CUSTOMER_SUBSCRIPTION,
    },
  ];
}

// ── Role → Groups mapping ─────────────────────────────────────────────────────

const ROLE_GROUPS: Record<string, SidebarGroup[]> = {

  // ── Regular user ───────────────────────────────────────────────────────────
  User: makeCustomerGroups([
    { href: "/dashboard/my-requests", label: "طلباتي", icon: IC.requests },
  ]),

  // ── Property owner ─────────────────────────────────────────────────────────
  Owner: makeCustomerGroups([
    { href: "/dashboard/my-listings",  label: "إعلاناتي",  icon: IC.listings },
    { href: "/dashboard/my-requests",  label: "طلباتي",    icon: IC.requests },
  ]),

  // ── Real-estate agent ──────────────────────────────────────────────────────
  Agent: makeCustomerGroups([
    { href: "/dashboard/clients",      label: "العملاء",    icon: IC.clients  },
    { href: "/dashboard/my-listings",  label: "إعلاناتي",   icon: IC.listings },
    { href: "/dashboard/my-requests",  label: "طلباتي",     icon: IC.requests },
  ]),

  // ── Broker (individual) ────────────────────────────────────────────────────
  Broker: makeCustomerGroups([
    { href: "/dashboard/listings",     label: "الإعلانات",  icon: IC.listings },
    { href: "/dashboard/my-requests",  label: "الطلبات",    icon: IC.requests },
  ]),

  // ── CompanyOwner (Office + Company) ───────────────────────────────────────
  // Projects injected conditionally in getGroupsForUser() when accountType === "Company"
  CompanyOwner: makeCustomerGroups([
    { href: "/dashboard/listings",     label: "الإعلانات",  icon: IC.listings },
    { href: "/dashboard/my-requests",  label: "الطلبات",    icon: IC.requests },
  ]),

  // ── Admin ──────────────────────────────────────────────────────────────────
  Admin: [
    {
      id: "overview",
      label: "لوحة التحكم",
      icon: IC.dashboard,
      alwaysOpen: true,
      items: [{ href: "/dashboard/admin", label: "نظرة عامة", icon: IC.overview, exact: true }],
    },
    {
      id: "operations",
      label: "الإدارة",
      icon: IC.shield,
      items: [
        { href: "/dashboard/admin/payment-requests",     label: "طلبات الاشتراك",     icon: IC.requests, permission: "billing.view"    },
        { href: "/dashboard/admin/billing/invoices",     label: "الفواتير",            icon: IC.billing,  permission: "billing.view"    },
        { href: "/dashboard/admin/subscriptions",        label: "الاشتراكات",          icon: IC.layers,   permission: "billing.manage"  },
        { href: "/dashboard/admin/users",                label: "المستخدمون",          icon: IC.users,    permission: "users.view"      },
        { href: "/dashboard/admin/verification-requests",label: "طلبات التوثيق",       icon: IC.verify,   permission: "users.view"      },
        { href: "/dashboard/admin/companies",            label: "الشركات",             icon: IC.companies,permission: "companies.view"  },
        { href: "/dashboard/admin/requests",             label: "طلبات التواصل",       icon: IC.chat,     permission: "requests.view"   },
        { href: "/dashboard/admin/buyer-requests",       label: "طلبات السوق",         icon: IC.search,   permission: "requests.view"   },
        { href: "/dashboard/admin/special-requests",     label: "الطلبات الخاصة",      icon: IC.blog,     permission: "requests.view"   },
        { href: "/dashboard/admin/special-request-types",label: "أنواع الطلبات الخاصة",icon: IC.list,     permission: "requests.view"   },
        { href: "/dashboard/admin/properties",           label: "العقارات",            icon: IC.listings, permission: "properties.view" },
        { href: "/dashboard/admin/projects",             label: "المشاريع",            icon: IC.projects, permission: "projects.view"   },
      ],
    },
    {
      id: "config",
      label: "إعدادات المنصة",
      icon: IC.system,
      permission: "settings.view",
      items: [
        { href: "/dashboard/admin/system",           label: "النظام",          icon: IC.system, exact: true, permission: "settings.view"   },
        { href: "/dashboard/admin/plans",            label: "خطط الاشتراك",    icon: IC.layers,             permission: "settings.manage" },
        { href: "/dashboard/admin/plan-catalog",     label: "كتالوج الخطط",    icon: IC.list,               permission: "settings.manage" },
        { href: "/dashboard/admin/listing-types",    label: "أنواع الإعلانات", icon: IC.check,              permission: "settings.manage" },
        { href: "/dashboard/admin/property-types",   label: "أنواع العقارات",  icon: IC.check,              permission: "settings.manage" },
        { href: "/dashboard/admin/ownership-types",  label: "أنواع الملكية",   icon: IC.check,              permission: "settings.manage" },
        { href: "/dashboard/admin/sections",         label: "مقاطع الصفحات",   icon: IC.grid,               permission: "settings.manage" },
      ],
    },
    {
      id: "content",
      label: "المحتوى والـ SEO",
      icon: IC.blog,
      permission: "blog.view",
      items: [
        { href: "/dashboard/admin/blog",              label: "المقالات",    icon: IC.blog,   permission: "blog.view"            },
        { href: "/dashboard/admin/blog/categories",   label: "التصنيفات",   icon: IC.folder, permission: "blog.view"            },
        { href: "/dashboard/admin/blog/seo-settings", label: "إعدادات SEO", icon: IC.search, permission: "seo.settings.manage"  },
      ],
    },
    {
      id: "permissions",
      label: "الصلاحيات",
      icon: IC.lock,
      permission: "staff.view",
      items: [
        { href: "/dashboard/admin/staff", label: "إدارة الفريق",        icon: IC.team, permission: "staff.view" },
        { href: "/dashboard/admin/roles", label: "الأدوار والصلاحيات", icon: IC.lock, permission: "roles.view" },
      ],
    },
  ],
};

// Staff uses same as Admin
ROLE_GROUPS["Staff"] = ROLE_GROUPS["Admin"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGroupsForUser(
  role: string | undefined,
  accountType: string | undefined,
): SidebarGroup[] {
  const base = ROLE_GROUPS[role ?? ""] ?? ROLE_GROUPS["User"];

  // Inject "المشاريع" for CompanyOwner when accountType === "Company"
  if (role === "CompanyOwner" && accountType === "Company") {
    return base.map((group) => {
      if (group.id === "business") {
        const hasProjects = group.items.some((i) => i.href === "/dashboard/projects");
        if (!hasProjects) {
          return {
            ...group,
            items: [
              ...group.items,
              { href: "/dashboard/projects", label: "المشاريع", icon: IC.projects },
            ],
          };
        }
      }
      return group;
    });
  }

  return base;
}

// ── Role display labels ───────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  Admin:        "مدير النظام",
  Staff:        "موظف",
  Broker:       "وسيط",
  Owner:        "مالك عقار",
  Agent:        "وكيل عقاري",
  CompanyOwner: "مالك شركة",
  User:         "مستخدم",
};

// ── UnifiedSidebar ────────────────────────────────────────────────────────────

export interface UnifiedSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  showBackLink?: boolean;
  headerHeight?: number;
}

export default function UnifiedSidebar({
  isOpen = false,
  onClose,
  showBackLink = false,
  headerHeight = 52,
}: UnifiedSidebarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, logout, hasPermission } = useAuth();

  const groups = getGroupsForUser(user?.role, user?.accountType);

  // ── Active group detection ────────────────────────────────────────────────

  function findActiveGroupId(): string {
    for (const group of groups) {
      for (const item of group.items) {
        const matched = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        if (matched) return group.id;
      }
    }
    return groups[0]?.id ?? "overview";
  }

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const active = findActiveGroupId();
    const init: Record<string, boolean> = {};
    for (const g of groups) {
      init[g.id] = g.alwaysOpen || g.id === active || g.id === "overview";
    }
    return init;
  });

  // Auto-expand active group on route change
  useEffect(() => {
    const active = findActiveGroupId();
    setOpenGroups((prev) => ({ ...prev, [active]: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function can(permission?: string): boolean {
    if (!permission) return true;
    return hasPermission(permission);
  }

  function isActive(href: string, exact?: boolean): boolean {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  // ── User info ─────────────────────────────────────────────────────────────

  const initial = user?.fullName?.charAt(0).toUpperCase() ?? "؟";
  const roleLabel = ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? "";
  const isAdmin = user?.role === "Admin" || user?.role === "Staff";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Overlay (mobile) */}
      {isOpen && (
        <div
          className="admin-overlay open"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`admin-sidebar${isOpen ? " open" : ""}`}
        style={{
          backgroundColor: "#111827",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          top: headerHeight,
          height: `calc(100vh - ${headerHeight}px)`,
        }}
      >
        {/* Mobile close button */}
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
            padding: "0.7rem 1rem",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              backgroundColor: "#166534",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#fff",
              overflow: "hidden",
            }}
          >
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initial
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: "0.77rem", fontWeight: 600, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.fullName ?? "المستخدم"}
            </p>
            <p style={{ margin: 0, fontSize: "0.67rem", color: "#6b7280", marginTop: 1 }}>
              {roleLabel}
            </p>
          </div>
          {isAdmin && (
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#22c55e", flexShrink: 0, boxShadow: "0 0 0 2px rgba(34,197,94,0.2)" }} />
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0.35rem 0 1rem", overflowY: "auto" }}>
          {groups.map((group, groupIdx) => {
            if (!can(group.permission)) return null;

            const visibleItems = group.items.filter((item) => can(item.permission));
            if (visibleItems.length === 0) return null;

            const isGroupOpen = group.alwaysOpen ? true : (openGroups[group.id] ?? false);
            const hasActiveItem = visibleItems.some((item) => isActive(item.href, item.exact));

            return (
              <div key={group.id}>
                {/* Section separator */}
                {groupIdx > 0 && (
                  <div style={{
                    height: 1,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    margin: "0.2rem 0.75rem",
                  }} />
                )}

                {/* Group header */}
                <button
                  onClick={() => !group.alwaysOpen && toggleGroup(group.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    width: "100%",
                    padding: "0.5rem 1rem",
                    background: "none",
                    border: "none",
                    cursor: group.alwaysOpen ? "default" : "pointer",
                    textAlign: "right",
                    direction: "rtl",
                  }}
                >
                  <span style={{ color: hasActiveItem ? "#4ade80" : "#4b5563", display: "flex" }}>
                    {group.icon}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: "0.69rem",
                      fontWeight: 700,
                      color: hasActiveItem ? "#d1fae5" : "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                    }}
                  >
                    {group.label}
                  </span>
                  {!group.alwaysOpen && <ChevronDown open={isGroupOpen} />}
                </button>

                {/* Items */}
                {isGroupOpen && (
                  <div>
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
                            padding: "0.38rem 1rem 0.38rem 1.3rem",
                            margin: "0.04rem 0.4rem",
                            borderRadius: 7,
                            fontSize: "0.81rem",
                            fontWeight: active ? 600 : 400,
                            color: active ? "#ffffff" : "#9ca3af",
                            backgroundColor: active ? "#166534" : "transparent",
                            textDecoration: "none",
                            direction: "rtl",
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
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          style={{
            padding: "0.6rem 1rem",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          {showBackLink && (
            <Link
              href="/dashboard"
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.74rem",
                color: "#4b5563",
                textDecoration: "none",
                padding: "0.3rem 0",
                direction: "rtl",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#6b7280"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#4b5563"; }}
            >
              {IC.back}
              العودة للوحة الرئيسية
            </Link>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "0.4rem 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.78rem",
              color: "#6b7280",
              direction: "rtl",
              textAlign: "right",
              transition: "color 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7280"; }}
          >
            {IC.logout}
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
