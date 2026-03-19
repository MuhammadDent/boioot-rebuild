"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface Options {
  /** Redirect target if unauthenticated. Defaults to "/login". */
  redirectTo?: string;
  /**
   * Permission key required to access this page.
   * Checked against the authenticated user's actual permission claims
   * from the backend (via AuthContext). SuperAdmin bypasses automatically.
   * This is the preferred guard for all admin-area pages.
   * Takes precedence over allowedRoles when both are provided.
   */
  requiredPermission?: string;
  /**
   * Legacy role-based guard — for platform-facing pages (Agent, CompanyOwner, etc.).
   * Do NOT use for admin pages; use requiredPermission instead.
   * When requiredPermission is set this option is ignored.
   */
  allowedRoles?: string[];
  /** Redirect target if access is denied. Defaults to "/dashboard". */
  unauthorizedRedirect?: string;
}

/**
 * Protects a page by redirecting unauthenticated users.
 *
 * Preferred usage (permission-based — admin pages):
 *   const { isLoading } = useProtectedRoute({ requiredPermission: "blog.view" });
 *
 * Legacy usage (role-based — platform pages):
 *   const { user, isLoading } = useProtectedRoute({ allowedRoles: ["Agent"] });
 *
 * Auth-only (no role/permission restriction):
 *   const { user, isLoading } = useProtectedRoute();
 *
 * Options are stabilized internally to prevent re-render loops.
 */
export function useProtectedRoute(options: Options = {}) {
  const optionsRef = useRef(options);

  const {
    redirectTo           = "/login",
    requiredPermission,
    allowedRoles,
    unauthorizedRedirect = "/dashboard",
  } = optionsRef.current;

  const { user, isAuthenticated, isLoading, logout, hasPermission } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    // Permission-based guard (preferred for admin pages)
    if (requiredPermission !== undefined) {
      if (!hasPermission(requiredPermission)) {
        router.replace(unauthorizedRedirect);
      }
      return;
    }

    // Role-based guard (legacy, for platform-facing pages)
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      router.replace(unauthorizedRedirect);
    }
  }, [isLoading, isAuthenticated, user, router, redirectTo, allowedRoles, unauthorizedRedirect, requiredPermission, hasPermission]);

  return { user, isLoading, isAuthenticated, logout };
}
