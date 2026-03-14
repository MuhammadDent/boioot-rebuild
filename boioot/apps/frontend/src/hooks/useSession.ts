"use client";

import { useAuth } from "@/context/AuthContext";

/**
 * A focused read-only hook for accessing the current user session.
 * Use this in pages/components that need session data but not auth actions.
 * For login/logout actions, use `useAuth` directly.
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
    /** Role helpers — all false when not authenticated. */
    isAdmin: user?.role === "Admin",
    isCompanyOwner: user?.role === "CompanyOwner",
    isAgent: user?.role === "Agent",
    /** Convenience: user display name or empty string. */
    displayName: user?.fullName ?? "",
  };
}
