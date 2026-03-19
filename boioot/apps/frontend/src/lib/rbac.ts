// ── Role constants ─────────────────────────────────────────────────────────────
export const ROLES = {
  ADMIN:            "Admin",
  ADMIN_MANAGER:    "AdminManager",
  CUSTOMER_SUPPORT: "CustomerSupport",
  TECHNICAL_SUPPORT:"TechnicalSupport",
  CONTENT_EDITOR:   "ContentEditor",
  SEO_SPECIALIST:   "SeoSpecialist",
  MARKETING_STAFF:  "MarketingStaff",
} as const;

// ── Platform (customer-facing) roles ──────────────────────────────────────────
export type PlatformRole =
  | "User"
  | "Owner"
  | "Broker"
  | "Agent"
  | "CompanyOwner";

// ── Internal staff roles ───────────────────────────────────────────────────────
export type StaffRole =
  | "Admin"           // SuperAdmin — full system access
  | "AdminManager"    // Operations manager
  | "CustomerSupport" // Customer support agents
  | "TechnicalSupport"// Technical support
  | "ContentEditor"   // Blog / content management
  | "SeoSpecialist"   // SEO management
  | "MarketingStaff"; // Marketing team

export type AppRole = PlatformRole | StaffRole;

// ── Permissions ────────────────────────────────────────────────────────────────
export type Permission =
  // Users
  | "users.view" | "users.edit" | "users.disable"
  // Staff
  | "staff.view" | "staff.create" | "staff.edit" | "staff.disable"
  // Roles
  | "roles.view" | "roles.manage"
  // Properties
  | "properties.view" | "properties.edit" | "properties.delete"
  // Projects
  | "projects.view" | "projects.edit"
  // Requests
  | "requests.view" | "requests.assign" | "requests.edit"
  // Companies
  | "companies.view" | "companies.edit"
  // Blog
  | "blog.view" | "blog.create" | "blog.edit" | "blog.publish" | "blog.delete"
  // SEO
  | "blog.seo.manage" | "seo.settings.manage"
  // Marketing
  | "marketing.view" | "marketing.manage"
  // Settings
  | "settings.view" | "settings.manage"
  // Billing
  | "billing.view" | "billing.manage";

// ── All permissions list (SuperAdmin) ─────────────────────────────────────────
export const ALL_PERMISSIONS: Permission[] = [
  "users.view", "users.edit", "users.disable",
  "staff.view", "staff.create", "staff.edit", "staff.disable",
  "roles.view", "roles.manage",
  "properties.view", "properties.edit", "properties.delete",
  "projects.view", "projects.edit",
  "requests.view", "requests.assign", "requests.edit",
  "companies.view", "companies.edit",
  "blog.view", "blog.create", "blog.edit", "blog.publish", "blog.delete",
  "blog.seo.manage", "seo.settings.manage",
  "marketing.view", "marketing.manage",
  "settings.view", "settings.manage",
  "billing.view", "billing.manage",
];

// ── Role → Permissions mapping ─────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  Admin: ALL_PERMISSIONS,

  AdminManager: [
    "users.view", "users.edit", "users.disable",
    "staff.view", "staff.create", "staff.edit",
    "roles.view",
    "properties.view", "properties.edit",
    "projects.view", "projects.edit",
    "requests.view", "requests.assign", "requests.edit",
    "companies.view", "companies.edit",
    "blog.view", "blog.create", "blog.edit", "blog.publish",
    "blog.seo.manage", "seo.settings.manage",
    "settings.view", "settings.manage",
    "billing.view",
  ],

  CustomerSupport: [
    "users.view",
    "properties.view",
    "projects.view",
    "requests.view", "requests.assign", "requests.edit",
    "companies.view",
    "blog.view",
  ],

  TechnicalSupport: [
    "users.view", "users.edit",
    "properties.view", "properties.edit",
    "projects.view",
    "requests.view",
    "companies.view",
    "settings.view",
  ],

  ContentEditor: [
    "blog.view", "blog.create", "blog.edit",
  ],

  SeoSpecialist: [
    "blog.view", "blog.edit",
    "blog.seo.manage", "seo.settings.manage",
  ],

  MarketingStaff: [
    "marketing.view", "marketing.manage",
    "blog.view",
  ],
};

// ── Staff roles list ───────────────────────────────────────────────────────────
export const STAFF_ROLES: StaffRole[] = [
  "Admin",
  "AdminManager",
  "CustomerSupport",
  "TechnicalSupport",
  "ContentEditor",
  "SeoSpecialist",
  "MarketingStaff",
];

export const PLATFORM_ROLES: PlatformRole[] = [
  "User", "Owner", "Broker", "Agent", "CompanyOwner",
];

// ── Staff role metadata ────────────────────────────────────────────────────────
export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  Admin:            "مدير النظام",
  AdminManager:     "مدير العمليات",
  CustomerSupport:  "دعم العملاء",
  TechnicalSupport: "الدعم التقني",
  ContentEditor:    "محرر المحتوى",
  SeoSpecialist:    "متخصص SEO",
  MarketingStaff:   "موظف تسويق",
};

export const STAFF_ROLE_BADGE_COLOR: Record<StaffRole, string> = {
  Admin:            "#dc2626",
  AdminManager:     "#7c3aed",
  CustomerSupport:  "#0284c7",
  TechnicalSupport: "#0891b2",
  ContentEditor:    "#059669",
  SeoSpecialist:    "#d97706",
  MarketingStaff:   "#db2777",
};

export const STAFF_ROLE_BADGE_BG: Record<StaffRole, string> = {
  Admin:            "#fef2f2",
  AdminManager:     "#f5f3ff",
  CustomerSupport:  "#e0f2fe",
  TechnicalSupport: "#ecfeff",
  ContentEditor:    "#ecfdf5",
  SeoSpecialist:    "#fffbeb",
  MarketingStaff:   "#fdf2f8",
};

// ── Permission group labels (for UI) ──────────────────────────────────────────
export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "المستخدمون",
    permissions: ["users.view", "users.edit", "users.disable"],
  },
  {
    label: "الفريق",
    permissions: ["staff.view", "staff.create", "staff.edit", "staff.disable"],
  },
  {
    label: "الأدوار",
    permissions: ["roles.view", "roles.manage"],
  },
  {
    label: "العقارات",
    permissions: ["properties.view", "properties.edit", "properties.delete"],
  },
  {
    label: "المشاريع",
    permissions: ["projects.view", "projects.edit"],
  },
  {
    label: "الطلبات",
    permissions: ["requests.view", "requests.assign", "requests.edit"],
  },
  {
    label: "الشركات",
    permissions: ["companies.view", "companies.edit"],
  },
  {
    label: "المدونة",
    permissions: ["blog.view", "blog.create", "blog.edit", "blog.publish", "blog.delete"],
  },
  {
    label: "SEO",
    permissions: ["blog.seo.manage", "seo.settings.manage"],
  },
  {
    label: "التسويق",
    permissions: ["marketing.view", "marketing.manage"],
  },
  {
    label: "الإعدادات",
    permissions: ["settings.view", "settings.manage"],
  },
  {
    label: "الفوترة",
    permissions: ["billing.view", "billing.manage"],
  },
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "users.view":        "عرض",
  "users.edit":        "تعديل",
  "users.disable":     "تعطيل",
  "staff.view":        "عرض",
  "staff.create":      "إنشاء",
  "staff.edit":        "تعديل",
  "staff.disable":     "تعطيل",
  "roles.view":        "عرض",
  "roles.manage":      "إدارة",
  "properties.view":   "عرض",
  "properties.edit":   "تعديل",
  "properties.delete": "حذف",
  "projects.view":     "عرض",
  "projects.edit":     "تعديل",
  "requests.view":     "عرض",
  "requests.assign":   "تعيين",
  "requests.edit":     "تعديل",
  "companies.view":    "عرض",
  "companies.edit":    "تعديل",
  "blog.view":         "عرض",
  "blog.create":       "إنشاء",
  "blog.edit":         "تعديل",
  "blog.publish":      "نشر",
  "blog.delete":       "حذف",
  "blog.seo.manage":   "SEO المقالات",
  "seo.settings.manage":"إعدادات SEO",
  "marketing.view":    "عرض",
  "marketing.manage":  "إدارة",
  "settings.view":     "عرض",
  "settings.manage":   "إدارة",
  "billing.view":      "عرض",
  "billing.manage":    "إدارة",
};

// ── Helper functions ───────────────────────────────────────────────────────────

/**
 * Classification helper: returns true if the role string belongs to the
 * known internal staff roles list.
 *
 * Use only for display, grouping, filtering, and metadata purposes.
 * NOT for runtime authorization decisions — use useAuth().hasPermission() instead.
 */
export function isStaffRole(role: string): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

/**
 * @deprecated Do not use for runtime authorization.
 * Returns the static permission list for a role (from the hardcoded map).
 * This map is kept in sync with the backend as a reference and for UI documentation.
 * For actual permission checks, use useAuth().hasPermission() which reads from the
 * backend-issued JWT claims stored in the user's session.
 */
export function getPermissions(role: string): Permission[] {
  if (isStaffRole(role)) return ROLE_PERMISSIONS[role] ?? [];
  return [];
}

/**
 * @deprecated Do not use for runtime authorization.
 * Static role→permission lookup for display and documentation purposes only
 * (e.g., the roles/permissions matrix page).
 * For actual access control, use useAuth().hasPermission() instead.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  return getPermissions(role).includes(permission);
}

/**
 * @deprecated Do not use for runtime authorization.
 * Classification helper for display purposes only.
 * For access control, use useAuth().hasPermission() or useAuth().hasAnyPermission().
 */
export function isAdminRole(role: string): boolean {
  return role === "Admin" || role === "AdminManager";
}
