import type { UserProfileResponse } from "@/types";

/**
 * Pure permission utilities — standalone, no React hook dependency.
 *
 * These functions take a user object directly and are safe to call
 * outside React component trees (server code, helpers, tests, etc.).
 *
 * SINGLE SOURCE OF TRUTH:
 * - All checks read from user.permissions[] (JWT-issued claims)
 * - No role-based shortcuts
 * - Same logic for all users, including Admin
 *
 * For in-component use, prefer useAuth().hasPermission() / hasAnyPermission()
 * which read the same source from context without prop-drilling.
 */

export type { UserProfileResponse };

/**
 * Returns true if the user holds the given permission string.
 *
 * @example
 * if (hasPermission(user, "users.view")) showUsersMenu();
 */
export function hasPermission(
  user: UserProfileResponse | null | undefined,
  permission: string,
): boolean {
  return (user?.permissions ?? []).includes(permission);
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
  const userPerms = user?.permissions ?? [];
  return permissions.some((p) => userPerms.includes(p));
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
  const userPerms = user?.permissions ?? [];
  return permissions.every((p) => userPerms.includes(p));
}

/**
 * Returns true if the user can access the admin shell.
 * A user qualifies if they hold at least one permission.
 *
 * This mirrors the admin layout gate: permissions.length > 0.
 */
export function canAccessAdminShell(
  user: UserProfileResponse | null | undefined,
): boolean {
  return (user?.permissions?.length ?? 0) > 0;
}
