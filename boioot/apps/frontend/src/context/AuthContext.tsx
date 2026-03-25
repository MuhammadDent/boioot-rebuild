"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { UserProfileResponse } from "@/types";
import { tokenStorage, cleanExpiredSession } from "@/lib/token";

interface AuthState {
  user: UserProfileResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: UserProfileResponse, expiresAt?: string) => void;
  logout: () => void;
  setUser: (user: UserProfileResponse) => void;
  /**
   * Returns true if the authenticated user holds the given permission string.
   *
   * Permission source: the `permissions[]` array embedded in the backend JWT
   * and stored in the user profile after login. No role-based shortcuts exist —
   * the check is the same for all users, including Admin.
   *
   * Admin always returns true because the backend issues all permissions in the
   * Admin JWT (Permissions.All), not because of a role bypass here.
   */
  hasPermission: (permission: string) => boolean;
  /**
   * Returns true if the user holds at least one of the given permissions.
   * Useful for showing UI sections that are unlocked by any one of several permissions.
   */
  hasAnyPermission: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // ── App startup cleanup ──────────────────────────────────────────────────
    // Clears any expired session data from localStorage before doing anything.
    // This handles the case where the user closed the tab with an active session
    // that has since expired — they always start from a clean state.
    const wasExpired = cleanExpiredSession();
    if (wasExpired) {
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      return;
    }

    // ── Restore live session ─────────────────────────────────────────────────
    const token   = tokenStorage.getToken();
    const userRaw = tokenStorage.getUserRaw();

    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as UserProfileResponse;
        setState({ user, token, isLoading: false, isAuthenticated: true });
      } catch {
        tokenStorage.clear();
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      }
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback(
    (token: string, user: UserProfileResponse, expiresAt?: string) => {
      tokenStorage.setToken(token);
      tokenStorage.setUser(user);
      if (expiresAt) tokenStorage.setExpiresAt(expiresAt);
      setState({ user, token, isLoading: false, isAuthenticated: true });
    },
    []
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  const setUser = useCallback((user: UserProfileResponse) => {
    tokenStorage.setUser(user);
    setState((s) => ({ ...s, user }));
  }, []);

  /**
   * Single permission check path — no role shortcuts.
   * All users (including Admin) are evaluated against their permissions[].
   * Admin access works because the backend embeds Permissions.All in the Admin JWT.
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!state.user) return false;
      return (state.user.permissions ?? []).includes(permission);
    },
    [state.user]
  );

  /**
   * Returns true if the user holds at least one of the listed permissions.
   */
  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!state.user) return false;
      const userPerms = state.user.permissions ?? [];
      return permissions.some((p) => userPerms.includes(p));
    },
    [state.user]
  );

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setUser, hasPermission, hasAnyPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
