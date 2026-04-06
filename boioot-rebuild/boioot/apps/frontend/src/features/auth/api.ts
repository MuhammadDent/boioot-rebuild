import { api } from "@/lib/api";
import type { AuthResponse, UserProfileResponse, SessionResponse } from "@/types";

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: "User" | "Owner" | "Broker" | "CompanyOwner";
  companyName?: string;
  companyType?: "RealEstateOffice" | "DeveloperCompany";
}

export interface UpdateProfilePayload {
  fullName: string;
  email?: string;
  phone?: string;
  profileImageUrl?: string | null;
  newPassword?: string;
  currentPassword?: string;
}

export const authApi = {
  login(payload: LoginPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>("/auth/login", payload);
  },

  register(payload: RegisterPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>("/auth/register", payload);
  },

  me(): Promise<UserProfileResponse> {
    return api.get<UserProfileResponse>("/auth/me");
  },

  updateProfile(payload: UpdateProfilePayload): Promise<UserProfileResponse> {
    return api.put<UserProfileResponse>("/auth/profile", payload);
  },

  /**
   * Exchange the HttpOnly refresh cookie for a new access token.
   * The cookie is sent automatically by the browser — no token in the body.
   * Called automatically by the silent refresh flow in api.ts.
   */
  refresh(): Promise<AuthResponse> {
    return api.post<AuthResponse>("/auth/refresh", {});
  },

  /**
   * Revoke the current refresh cookie (single device logout).
   * Server reads the cookie directly; no token needed in the body.
   * Best-effort — UI clears local state regardless of outcome.
   */
  async logout(): Promise<void> {
    try {
      await api.post<void>("/auth/logout", {});
    } catch {
      // Idempotent — server may already have revoked it
    }
  },

  /**
   * Revoke ALL active refresh tokens for the current user (all devices).
   * Requires a valid access token (sent via Authorization header).
   */
  async logoutAll(): Promise<void> {
    try {
      await api.post<void>("/auth/logout-all", {});
    } catch {
      // Best effort
    }
  },

  // ── Session management ────────────────────────────────────────────────────

  getSessions(): Promise<SessionResponse[]> {
    return api.get<SessionResponse[]>("/auth/sessions");
  },

  revokeSession(sessionId: string): Promise<void> {
    return api.delete<void>(`/auth/sessions/${sessionId}`);
  },

  revokeOtherSessions(): Promise<void> {
    return api.delete<void>("/auth/sessions/others");
  },
};
