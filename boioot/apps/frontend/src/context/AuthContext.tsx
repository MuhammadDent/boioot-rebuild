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
import { authApi } from "@/features/auth/api";

interface AuthState {
  user: UserProfileResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  /**
   * Called after a successful login or register response.
   * Phase 1B: refresh token is in the HttpOnly cookie — do not pass it here.
   */
  login: (
    token: string,
    user: UserProfileResponse,
    expiresAt?: string
  ) => void;
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
    // ── App startup cleanup ────────────────────────────────────────────────
    const hadNoSession = cleanExpiredSession();
    if (hadNoSession) {
      console.log("[auth] Startup: no session found — cleared");
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      return;
    }

    // ── Restore live session ───────────────────────────────────────────────
    const token   = tokenStorage.getToken();
    const userRaw = tokenStorage.getUserRaw();

    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as UserProfileResponse;
        console.log("[auth] Startup: session restored →", user.email, "| role:", user.role, "| perms:", user.permissions?.length ?? 0);
        setState({ user, token, isLoading: false, isAuthenticated: true });
      } catch {
        console.warn("[auth] Startup: corrupt session — cleared");
        tokenStorage.clear();
        setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      }
    } else {
      console.log("[auth] Startup: no stored session");
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback(
    (token: string, user: UserProfileResponse, expiresAt?: string) => {
      tokenStorage.setToken(token);
      tokenStorage.setUser(user);
      if (expiresAt) tokenStorage.setExpiresAt(expiresAt);
      console.log("[auth] login() → email:", user.email, "| role:", user.role, "| perms:", user.permissions?.length ?? 0, "| expires:", expiresAt ?? "not set");
      setState({ user, token, isLoading: false, isAuthenticated: true });
    },
    []
  );

  const logout = useCallback(() => {
    console.log("[auth] logout() called — clearing session");
    // Best-effort server-side revocation (server reads HttpOnly cookie)
    authApi.logout().catch(() => {});
    tokenStorage.clear();
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  const setUser = useCallback((user: UserProfileResponse) => {
    tokenStorage.setUser(user);
    setState((s) => ({ ...s, user }));
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!state.user) return false;
      return (state.user.permissions ?? []).includes(permission);
    },
    [state.user]
  );

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
