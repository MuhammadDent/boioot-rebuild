"use client";

import { useAuth } from "@/context/AuthContext";

/**
 * A focused read-only hook for accessing the current user session.
 * Use this in pages/components that need session data but not auth actions.
 * For login/logout/permission checks, use `useAuth` directly.
 *
 * NOTE on role helpers (isAdmin, isCompanyOwner, isAgent):
 * These are CLASSIFICATION helpers for display and UI grouping purposes only.
 * They must NOT be used for access control or authorization decisions.
 * For any authorization decision, use useAuth().hasPermission() instead.
 */
export function useSession() {
  const { user, token, isAuthenticated, isLoading } = useAuth();

  return {
    /** The authenticated user profile, or null if not logged in. */
    user,
    /** The raw JWT token, or null if not logged in. */
    token,
    /** True once the session has been read from storage. */
    isLoading,
    /** True if a valid session exists. */
    isAuthenticated,
    /**
     * Display/grouping helpers — NOT for authorization.
     * Use hasPermission() from useAuth() for all access control decisions.
     */
    isAdmin: user?.role === "Admin",
    isCompanyOwner: user?.role === "CompanyOwner",
    isAgent: user?.role === "Agent",
    /** Convenience: user display name or empty string. */
    displayName: user?.fullName ?? "",
  };
}
