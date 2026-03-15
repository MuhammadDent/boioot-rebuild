export const ADMIN_PAGE_SIZE = 20;

export const ROLE_LABELS: Record<string, string> = {
  Admin:        "مدير النظام",
  CompanyOwner: "مالك شركة",
  Agent:        "وكيل عقاري",
  User:         "مستخدم",
};

export const ROLE_BADGE: Record<string, string> = {
  Admin:        "badge badge-red",
  CompanyOwner: "badge badge-blue",
  Agent:        "badge badge-yellow",
  User:         "badge badge-gray",
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
