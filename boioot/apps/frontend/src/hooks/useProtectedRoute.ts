"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type Role = "Admin" | "Agent" | "CompanyOwner" | "User";

interface Options {
  /** Redirect target if unauthenticated. Defaults to "/login". */
  redirectTo?: string;
  /** If set, redirect to `unauthorizedRedirect` when user role is not in this list. */
  allowedRoles?: Role[];
  /** Redirect target if role is not allowed. Defaults to "/dashboard". */
  unauthorizedRedirect?: string;
}

/**
 * Protects a page by redirecting unauthenticated users.
 * Optionally restricts access to specific roles.
 *
 * Options are treated as static (per-page config) and are
 * stabilized internally to prevent useEffect re-render loops.
 *
 * Usage:
 *   const { user, isLoading } = useProtectedRoute();
 *   const { user, isLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });
 */
export function useProtectedRoute(options: Options = {}) {
  // Stabilize options — they are static per-page config and should
  // never be passed as new object literals on every render.
  const optionsRef = useRef(options);

  const {
    redirectTo          = "/login",
    allowedRoles,
    unauthorizedRedirect = "/dashboard",
  } = optionsRef.current;

  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role as Role)) {
      router.replace(unauthorizedRedirect);
    }
  }, [isLoading, isAuthenticated, user, router, redirectTo, allowedRoles, unauthorizedRedirect]);

  return { user, isLoading, isAuthenticated, logout };
}
