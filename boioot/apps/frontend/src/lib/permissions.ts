import type { UserProfileResponse } from "@/types";
import { PLATFORM_ROLE_PERMISSIONS } from "@/lib/rbac";

/**
 * Pure permission utilities — standalone, no React hook dependency.
 *
 * SINGLE SOURCE OF TRUTH (two-pass resolution):
 *
 * Pass 1 — JWT claims (user.permissions[]):
 *   Staff users (Admin, AdminManager, ContentEditor, …) have all their
 *   permissions embedded as "permission" claims in the backend-issued JWT.
 *   These are stored in user.permissions[] after login.
 *
 * Pass 2 — Platform role mapping (PLATFORM_ROLE_PERMISSIONS):
 *   Platform users (CompanyOwner, Broker, Agent, …) have an EMPTY
 *   permissions[] array because the admin RBAC does not cover them.
 *   Their platform-specific capabilities are derived from their role via
 *   the PLATFORM_ROLE_PERMISSIONS map defined in lib/rbac.ts.
 *
 * Admin (staff) passes Pass 1 for all admin permissions and also appears in
 * PLATFORM_ROLE_PERMISSIONS so that platform-specific strings (e.g.
 * "properties.create") resolve correctly via Pass 2.
 *
 * NO role-based shortcuts — resolution is always permission-string-first.
 *
 * For in-component use, useAuth().hasPermission() / hasAnyPermission() read
 * the same user object from context without prop-drilling.
 */

export type { UserProfileResponse };

// ── Core resolution ────────────────────────────────────────────────────────────

function resolvePermissions(user: UserProfileResponse | null | undefined): string[] {
  // Pass 1: JWT-embedded permissions (staff)
  const jwtPerms = user?.permissions ?? [];
  // Pass 2: Platform role-derived permissions
  const rolePerms: string[] = PLATFORM_ROLE_PERMISSIONS[user?.role ?? ""] ?? [];
  // Merge both sets (deduplicated at call site via .includes())
  return jwtPerms.length > 0 || rolePerms.length > 0
    ? [...jwtPerms, ...rolePerms]
    : [];
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Returns true if the user holds the given permission string.
 * Checks JWT claims first, then the platform role mapping.
 *
 * @example
 * if (hasPermission(user, "users.view")) showUsersMenu();
 * if (hasPermission(user, "properties.create")) showAddButton();
 */
export function hasPermission(
  user: UserProfileResponse | null | undefined,
  permission: string,
): boolean {
  // Pass 1: JWT claims
  if ((user?.permissions ?? []).includes(permission)) return true;
  // Pass 2: Platform role mapping
  return (PLATFORM_ROLE_PERMISSIONS[user?.role ?? ""] ?? []).includes(permission);
}

/**
 * Returns true if the user holds at least one of the given permissions.
 *
 * @example
 * if (hasAnyPermission(user, ["blog.edit", "blog.publish"])) showBlogActions();
 */
export function hasAnyPermission(
  user: UserProfileResponse | null | undefined,
  permissions: string[],
): boolean {
  const all = resolvePermissions(user);
  return permissions.some((p) => all.includes(p));
}

/**
 * Returns true if the user holds every one of the given permissions.
 *
 * @example
 * if (hasAllPermissions(user, ["staff.create", "staff.edit"])) showFullStaffActions();
 */
export function hasAllPermissions(
  user: UserProfileResponse | null | undefined,
  permissions: string[],
): boolean {
  const all = resolvePermissions(user);
  return permissions.every((p) => all.includes(p));
}

/**
 * Returns true if the user can access the admin shell.
 * A staff user qualifies if they hold at least one JWT permission.
 *
 * Mirrors the admin layout gate: permissions.length > 0.
 * Platform users (empty JWT permissions) correctly return false here.
 */
export function canAccessAdminShell(
  user: UserProfileResponse | null | undefined,
): boolean {
  return (user?.permissions?.length ?? 0) > 0;
}
