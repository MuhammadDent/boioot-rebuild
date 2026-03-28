// ─────────────────────────────────────────────────────────────────────────────
// sidebar.config.ts — SINGLE SOURCE OF TRUTH for all sidebar navigation.
//
// Rules:
//   • ALL nav items live here. Nothing is hardcoded in the component.
//   • Max 2 levels: Group → Item (no deep nesting).
//   • Permission-based hiding is applied at render time (AppSidebar).
//   • Role-specific groups are returned by getSidebarGroups().
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import type { FeatureKey } from "@/features/plan/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SidebarItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  permission?: string;
  /** Plan feature required to see this item. Checked by AppSidebar via usePlan(). */
  feature?: FeatureKey;
};

export type SidebarGroup = {
  id: string;
  label: string;
  icon: ReactNode;
  items: SidebarItem[];
  alwaysOpen?: boolean;
  permission?: string;
  /** Plan feature required to see this entire group. Checked by AppSidebar via usePlan(). */
  feature?: FeatureKey;
};

// ── Icon helper ────────────────────────────────────────────────────────────────
// Defined here so the config is fully self-contained. AppSidebar just renders.

import { createElement } from "react";

function path(...segments: ReactNode[]) {
  return createElement(
    "svg",
    {
      width: 15,
      height: 15,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      style: { flexShrink: 0 },
    },
    ...segments,
  );
}

/* eslint-disable react/jsx-key */
const I = {
  dashboard: path(
    createElement("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1" }),
    createElement("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1" }),
    createElement("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1" }),
    createElement("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1" }),
  ),
  profile: path(
    createElement("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
    createElement("circle", { cx: "12", cy: "7", r: "4" }),
  ),
  sessions: path(
    createElement("rect", { x: "2", y: "3", width: "20", height: "14", rx: "2" }),
    createElement("path", { d: "M8 21h8M12 17v4" }),
  ),
  messages: path(
    createElement("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }),
  ),
  listings: path(
    createElement("path", { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }),
    createElement("polyline", { points: "9 22 9 12 15 12 15 22" }),
  ),
  projects: path(
    createElement("polygon", { points: "12 2 2 7 12 12 22 7 12 2" }),
    createElement("polyline", { points: "2 17 12 22 22 17" }),
    createElement("polyline", { points: "2 12 12 17 22 12" }),
  ),
  requests: path(
    createElement("path", { d: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" }),
    createElement("rect", { x: "9", y: "3", width: "6", height: "4", rx: "1" }),
    createElement("path", { d: "M9 12h6M9 16h4" }),
  ),
  clients: path(
    createElement("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
    createElement("circle", { cx: "9", cy: "7", r: "4" }),
    createElement("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
    createElement("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }),
  ),
  verify: path(
    createElement("path", { d: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" }),
    createElement("rect", { x: "9", y: "3", width: "6", height: "4", rx: "1" }),
    createElement("polyline", { points: "9 11 12 14 22 4" }),
  ),
  star: path(
    createElement("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" }),
  ),
  layers: path(
    createElement("polygon", { points: "12 2 2 7 12 12 22 7 12 2" }),
    createElement("polyline", { points: "2 17 12 22 22 17" }),
    createElement("polyline", { points: "2 12 12 17 22 12" }),
  ),
  shield: path(
    createElement("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }),
  ),
  system: path(
    createElement("circle", { cx: "12", cy: "12", r: "3" }),
    createElement("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" }),
  ),
  lock: path(
    createElement("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }),
    createElement("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" }),
  ),
  blog: path(
    createElement("path", { d: "M12 20h9" }),
    createElement("path", { d: "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" }),
  ),
  folder: path(
    createElement("path", { d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" }),
  ),
  search: path(
    createElement("circle", { cx: "11", cy: "11", r: "8" }),
    createElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" }),
  ),
  list: path(
    createElement("line", { x1: "8", y1: "6", x2: "21", y2: "6" }),
    createElement("line", { x1: "8", y1: "12", x2: "21", y2: "12" }),
    createElement("line", { x1: "8", y1: "18", x2: "21", y2: "18" }),
    createElement("line", { x1: "3", y1: "6", x2: "3.01", y2: "6" }),
    createElement("line", { x1: "3", y1: "12", x2: "3.01", y2: "12" }),
    createElement("line", { x1: "3", y1: "18", x2: "3.01", y2: "18" }),
  ),
  check: path(
    createElement("polyline", { points: "9 11 12 14 22 4" }),
    createElement("path", { d: "M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" }),
  ),
  grid: path(
    createElement("rect", { x: "3", y: "3", width: "18", height: "4", rx: "1" }),
    createElement("rect", { x: "3", y: "10", width: "18", height: "4", rx: "1" }),
    createElement("rect", { x: "3", y: "17", width: "18", height: "4", rx: "1" }),
  ),
  users: path(
    createElement("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }),
    createElement("circle", { cx: "12", cy: "7", r: "4" }),
  ),
  companies: path(
    createElement("path", { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }),
    createElement("rect", { x: "9", y: "14", width: "6", height: "7" }),
  ),
  billing: path(
    createElement("rect", { x: "1", y: "4", width: "22", height: "16", rx: "2", ry: "2" }),
    createElement("line", { x1: "1", y1: "10", x2: "23", y2: "10" }),
  ),
  team: path(
    createElement("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }),
    createElement("circle", { cx: "9", cy: "7", r: "4" }),
    createElement("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }),
    createElement("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }),
  ),
};
/* eslint-enable react/jsx-key */

// ── Access helpers — Thin wrappers around the central featureAccess map ─────────
//
// These thin wrappers are kept for backwards-compatibility with existing
// import sites. New code should import canAccessFeature from
// @/features/access/featureAccess instead of using these helpers directly.

export function canAccessProjects(accountType?: string | null): boolean {
  return accountType === "Company";
}

export function canAccessTeam(role?: string | null): boolean {
  return role === "CompanyOwner";
}

export function canAccessAgents(role?: string | null): boolean {
  return role === "CompanyOwner";
}

// ── Role display labels ────────────────────────────────────────────────────────

export const ROLE_DISPLAY: Record<string, string> = {
  Admin:        "مدير النظام",
  Staff:        "موظف",
  Broker:       "وسيط",
  Owner:        "مالك عقار",
  Agent:        "وكيل عقاري",
  CompanyOwner: "مالك شركة",
  User:         "مستخدم",
};

// ── Shared base groups for customer roles ──────────────────────────────────────

const OVERVIEW_GROUP: SidebarGroup = {
  id: "overview",
  label: "لوحة التحكم",
  icon: I.dashboard,
  alwaysOpen: true,
  items: [{ href: "/dashboard", label: "نظرة عامة", icon: I.dashboard, exact: true }],
};

const ACCOUNT_GROUP: SidebarGroup = {
  id: "account",
  label: "الحساب",
  icon: I.profile,
  items: [
    { href: "/dashboard/profile",  label: "الملف الشخصي",   icon: I.profile,  exact: true },
    { href: "/dashboard/sessions", label: "الجلسات النشطة",  icon: I.sessions, exact: true },
  ],
};

const MESSAGES_GROUP: SidebarGroup = {
  id: "messages",
  label: "التواصل",
  icon: I.messages,
  items: [{ href: "/dashboard/messages", label: "الرسائل", icon: I.messages }],
};

const VERIFICATION_GROUP: SidebarGroup = {
  id: "verification",
  label: "التوثيق",
  icon: I.verify,
  items: [{ href: "/dashboard/verification", label: "التوثيق", icon: I.verify }],
};

const SUBSCRIPTION_GROUP: SidebarGroup = {
  id: "subscription",
  label: "الاشتراك",
  icon: I.star,
  items: [
    { href: "/dashboard/subscription",       label: "اشتراكي",        icon: I.star,   exact: true },
    { href: "/dashboard/subscription/plans", label: "باقات الاشتراك", icon: I.layers },
  ],
};

// ── Full sidebar config per role ───────────────────────────────────────────────
//
// Key = role string (case-sensitive, matches backend).
// To add a new role: add a key here only — no other changes needed.

const SIDEBAR_CONFIG: Record<string, SidebarGroup[]> = {

  // ── Regular user ─────────────────────────────────────────────────────────────
  User: [
    OVERVIEW_GROUP,
    ACCOUNT_GROUP,
    MESSAGES_GROUP,
    {
      id: "business",
      label: "نشاطي",
      icon: I.requests,
      items: [
        { href: "/dashboard/my-requests", label: "طلباتي", icon: I.requests },
      ],
    },
    VERIFICATION_GROUP,
    SUBSCRIPTION_GROUP,
  ],

  // ── Property owner ────────────────────────────────────────────────────────────
  Owner: [
    OVERVIEW_GROUP,
    ACCOUNT_GROUP,
    MESSAGES_GROUP,
    {
      id: "business",
      label: "الأعمال",
      icon: I.listings,
      items: [
        { href: "/dashboard/my-listings",  label: "إعلاناتي",  icon: I.listings },
        { href: "/dashboard/my-requests",  label: "طلباتي",    icon: I.requests },
      ],
    },
    VERIFICATION_GROUP,
    SUBSCRIPTION_GROUP,
  ],

  // ── Real-estate agent ─────────────────────────────────────────────────────────
  Agent: [
    OVERVIEW_GROUP,
    ACCOUNT_GROUP,
    MESSAGES_GROUP,
    {
      id: "business",
      label: "الأعمال",
      icon: I.listings,
      items: [
        { href: "/dashboard/clients",     label: "العملاء",    icon: I.clients  },
        { href: "/dashboard/my-listings", label: "إعلاناتي",   icon: I.listings },
        { href: "/dashboard/my-requests", label: "طلباتي",     icon: I.requests },
      ],
    },
    VERIFICATION_GROUP,
    SUBSCRIPTION_GROUP,
  ],

  // ── Broker (individual, no Team / Projects) ────────────────────────────────
  Broker: [
    OVERVIEW_GROUP,
    ACCOUNT_GROUP,
    MESSAGES_GROUP,
    {
      id: "business",
      label: "الأعمال",
      icon: I.listings,
      items: [
        { href: "/dashboard/listings",    label: "الإعلانات",  icon: I.listings },
        { href: "/dashboard/my-requests", label: "الطلبات",    icon: I.requests },
      ],
    },
    VERIFICATION_GROUP,
    SUBSCRIPTION_GROUP,
  ],

  // ── CompanyOwner (Office + Company) ───────────────────────────────────────
  // "المشاريع" is conditionally injected by getSidebarGroups() when accountType === "Company"
  CompanyOwner: [
    OVERVIEW_GROUP,
    ACCOUNT_GROUP,
    MESSAGES_GROUP,
    {
      id: "business",
      label: "الأعمال",
      icon: I.listings,
      items: [
        { href: "/dashboard/listings",    label: "الإعلانات",  icon: I.listings },
        { href: "/dashboard/my-requests", label: "الطلبات",    icon: I.requests },
      ],
    },
    VERIFICATION_GROUP,
    SUBSCRIPTION_GROUP,
  ],

  // ── Admin ─────────────────────────────────────────────────────────────────────
  Admin: [
    {
      id: "overview",
      label: "لوحة التحكم",
      icon: I.dashboard,
      alwaysOpen: true,
      items: [{ href: "/dashboard/admin", label: "نظرة عامة", icon: I.dashboard, exact: true }],
    },
    {
      id: "operations",
      label: "الإدارة",
      icon: I.shield,
      items: [
        { href: "/dashboard/admin/payment-requests",      label: "طلبات الاشتراك",      icon: I.requests,  permission: "billing.view"    },
        { href: "/dashboard/admin/billing/invoices",      label: "الفواتير",              icon: I.billing,   permission: "billing.view"    },
        { href: "/dashboard/admin/subscriptions",         label: "الاشتراكات",            icon: I.layers,    permission: "billing.manage"  },
        { href: "/dashboard/admin/users",                 label: "المستخدمون",            icon: I.users,     permission: "users.view"      },
        { href: "/dashboard/admin/verification-requests", label: "طلبات التوثيق",         icon: I.verify,    permission: "users.view"      },
        { href: "/dashboard/admin/companies",             label: "الشركات",               icon: I.companies, permission: "companies.view"  },
        { href: "/dashboard/admin/requests",              label: "طلبات التواصل",         icon: I.messages,  permission: "requests.view"   },
        { href: "/dashboard/admin/buyer-requests",        label: "طلبات السوق",           icon: I.search,    permission: "requests.view"   },
        { href: "/dashboard/admin/special-requests",      label: "الطلبات الخاصة",        icon: I.blog,      permission: "requests.view"   },
        { href: "/dashboard/admin/special-request-types", label: "أنواع الطلبات الخاصة",  icon: I.list,      permission: "requests.view"   },
        { href: "/dashboard/admin/properties",            label: "العقارات",              icon: I.listings,  permission: "properties.view" },
        { href: "/dashboard/admin/projects",              label: "المشاريع",              icon: I.projects,  permission: "projects.view"   },
      ],
    },
    {
      id: "config",
      label: "إعدادات المنصة",
      icon: I.system,
      permission: "settings.view",
      items: [
        { href: "/dashboard/admin/system",            label: "النظام",           icon: I.system, exact: true, permission: "settings.view"   },
        { href: "/dashboard/admin/plans",             label: "خطط الاشتراك",     icon: I.layers,              permission: "settings.manage" },
        { href: "/dashboard/admin/plan-catalog",      label: "كتالوج الخطط",     icon: I.list,                permission: "settings.manage" },
        { href: "/dashboard/admin/listing-types",     label: "أنواع الإعلانات",  icon: I.check,               permission: "settings.manage" },
        { href: "/dashboard/admin/property-types",    label: "أنواع العقارات",   icon: I.check,               permission: "settings.manage" },
        { href: "/dashboard/admin/ownership-types",   label: "أنواع الملكية",    icon: I.check,               permission: "settings.manage" },
        { href: "/dashboard/admin/sections",          label: "مقاطع الصفحات",    icon: I.grid,                permission: "settings.manage" },
      ],
    },
    {
      id: "content",
      label: "المحتوى والـ SEO",
      icon: I.blog,
      permission: "blog.view",
      items: [
        { href: "/dashboard/admin/blog",              label: "المقالات",    icon: I.blog,   permission: "blog.view"           },
        { href: "/dashboard/admin/blog/categories",   label: "التصنيفات",   icon: I.folder, permission: "blog.view"           },
        { href: "/dashboard/admin/blog/seo-settings", label: "إعدادات SEO", icon: I.search, permission: "seo.settings.manage" },
      ],
    },
    {
      id: "permissions",
      label: "الصلاحيات",
      icon: I.lock,
      permission: "staff.view",
      items: [
        { href: "/dashboard/admin/staff", label: "إدارة الفريق",        icon: I.team, permission: "staff.view" },
        { href: "/dashboard/admin/roles", label: "الأدوار والصلاحيات", icon: I.lock, permission: "roles.view" },
      ],
    },
  ],
};

// Staff mirrors Admin
SIDEBAR_CONFIG["Staff"] = SIDEBAR_CONFIG["Admin"];

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns the sidebar groups for the given user.
 *
 * CompanyOwner (Office + Company):
 *   - Always injects "الوكلاء" link (both Office and Company manage agents).
 *   - Injects "المشاريع" only when accountType === "Company".
 *
 * All other roles: base config from SIDEBAR_CONFIG is returned as-is.
 */
export function getSidebarGroups(
  role: string | undefined,
  accountType: string | undefined,
): SidebarGroup[] {
  const groups: SidebarGroup[] = SIDEBAR_CONFIG[role ?? ""] ?? SIDEBAR_CONFIG["User"];

  if (role !== "CompanyOwner") return groups;

  const canProjects = canAccessProjects(accountType);
  const canAgents   = canAccessAgents(role);

  return groups.map((g) => {
    if (g.id !== "business") return g;

    const extraItems: SidebarItem[] = [];

    // Inject "الوكلاء" for all CompanyOwner accounts (Office + Company).
    if (canAgents && !g.items.some((i) => i.href === "/dashboard/agents")) {
      extraItems.push({
        href: "/dashboard/agents",
        label: "الوكلاء",
        icon: I.team,
      });
    }

    // Inject "المشاريع" only for Company accounts.
    if (canProjects && !g.items.some((i) => i.href === "/dashboard/projects")) {
      extraItems.push({
        href: "/dashboard/projects",
        label: "المشاريع",
        icon: I.projects,
        feature: "project_management" as FeatureKey,
      });
    }

    if (extraItems.length === 0) return g;
    return { ...g, items: [...g.items, ...extraItems] };
  });
}
