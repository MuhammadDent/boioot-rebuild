export const ADMIN_PAGE_SIZE = 20;

/**
 * Names that map to the backend UserRole enum — the only values accepted
 * by GET /api/admin/users?role=... and POST /api/admin/users (primary role).
 * Everything outside this set is a staff/RBAC-overlay role.
 */
export const PLATFORM_ROLE_NAMES = new Set([
  "Admin",
  "CompanyOwner",
  "Broker",
  "Agent",
  "Owner",
  "User",
]);

/**
 * Primary / direct customer roles — the accounts that subscribe and pay
 * for the platform directly. Brokers are included here.
 */
export const DIRECT_CUSTOMER_ROLES = new Set([
  "User",
  "Owner",
  "Broker",
  "CompanyOwner",
]);

/**
 * Subordinate / child roles — accounts created under a parent business account.
 * They are NOT independent monetizable customers.
 */
export const SUBORDINATE_ROLES = new Set([
  "Agent",
]);

/**
 * Derive a display category for a role name.
 * Returns: "admin" | "customer" | "subordinate" | "staff"
 */
export function getRoleCategory(
  name: string,
): "admin" | "customer" | "subordinate" | "staff" {
  if (name === "Admin") return "admin";
  if (DIRECT_CUSTOMER_ROLES.has(name)) return "customer";
  if (SUBORDINATE_ROLES.has(name)) return "subordinate";
  return "staff";
}

export const ROLE_LABELS: Record<string, string> = {
  // Platform roles
  Admin:            "مدير النظام",
  CompanyOwner:     "شركة تطوير",
  Broker:           "وسيط عقاري",
  Agent:            "وكيل عقاري",
  Owner:            "مالك عقار",
  User:             "مستخدم",
  // Internal staff roles
  AdminManager:     "مدير العمليات",
  CustomerSupport:  "دعم العملاء",
  TechnicalSupport: "الدعم التقني",
  ContentEditor:    "محرر المحتوى",
  SeoSpecialist:    "متخصص SEO",
  MarketingStaff:   "موظف تسويق",
};

export const ROLE_BADGE: Record<string, string> = {
  // Platform roles
  Admin:            "badge badge-red",
  CompanyOwner:     "badge badge-blue",
  Broker:           "badge badge-violet",
  Agent:            "badge badge-yellow",
  Owner:            "badge badge-green",
  User:             "badge badge-gray",
  // Internal staff roles
  AdminManager:     "badge badge-violet",
  CustomerSupport:  "badge badge-blue",
  TechnicalSupport: "badge badge-blue",
  ContentEditor:    "badge badge-green",
  SeoSpecialist:    "badge badge-yellow",
  MarketingStaff:   "badge badge-gray",
};

/**
 * Full badge class (including base "badge") for PropertyStatus enum values.
 * Defined here because features/properties/constants does not include badge classes.
 */
export const PROPERTY_STATUS_BADGE: Record<string, string> = {
  Available: "badge badge-green",
  Sold:      "badge badge-blue",
  Rented:    "badge badge-yellow",
  Inactive:  "badge badge-gray",
};

/**
 * Full badge class for ProjectStatus enum values.
 * features/projects/constants exports PROJECT_STATUS_BADGE without the "badge " prefix,
 * so we define the full class here for use in admin pages.
 */
export const ADMIN_PROJECT_STATUS_BADGE: Record<string, string> = {
  Upcoming:          "badge badge-yellow",
  UnderConstruction: "badge badge-blue",
  Completed:         "badge badge-green",
};

// ── Blog ──────────────────────────────────────────────────────────────────────

export const BLOG_STATUS_LABELS: Record<string, string> = {
  Draft:     "مسودة",
  Published: "منشور",
  Archived:  "مؤرشف",
};

export const BLOG_STATUS_BADGE: Record<string, string> = {
  Draft:     "badge badge-gray",
  Published: "badge badge-green",
  Archived:  "badge badge-yellow",
};

export const BLOG_POST_PAGE_SIZE = 20;

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  Pending:  "معلقة",
  Paid:     "مدفوعة",
  Failed:   "مرفوضة",
  Expired:  "منتهية",
  Cancelled:"ملغاة",
};

export const INVOICE_STATUS_BADGE: Record<string, string> = {
  Pending:  "badge badge-yellow",
  Paid:     "badge badge-green",
  Failed:   "badge badge-red",
  Expired:  "badge badge-gray",
  Cancelled:"badge badge-gray",
};
