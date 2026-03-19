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
import { tokenStorage } from "@/lib/token";
import { ROLES } from "@/lib/rbac";

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
   * Returns true if the authenticated user has the given permission.
   * SuperAdmin (Admin role) always returns true.
   * Permissions are sourced from the backend response on login/profile fetch
   * and stored in the user object.
   */
  hasPermission: (permission: string) => boolean;
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
    const token   = tokenStorage.getToken();
    const userRaw = tokenStorage.getUserRaw();

    if (tokenStorage.isExpired()) {
      tokenStorage.clear();
      setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
      return;
    }

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
   * Checks whether the current user holds a given permission string.
   * SuperAdmin (Admin role) bypasses all checks and always returns true.
   * For all other roles the check is against the `permissions[]` array
   * returned by the backend and stored in the user profile.
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!state.user) return false;
      if (state.user.role === ROLES.ADMIN) return true;
      return (state.user.permissions ?? []).includes(permission);
    },
    [state.user]
  );

  return (
    <AuthContext.Provider value={{ ...state, login, logout, setUser, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
