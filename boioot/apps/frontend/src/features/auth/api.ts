import { api } from "@/lib/api";
import type { AuthResponse, UserProfileResponse } from "@/types";

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
   * Exchange a refresh token for a new access + refresh token pair.
   * Called automatically by the silent refresh flow in api.ts — consumers
   * generally do not need to call this directly.
   */
  refresh(refreshToken: string): Promise<AuthResponse> {
    return api.post<AuthResponse>("/auth/refresh", { refreshToken });
  },

  /**
   * Revoke the current refresh token (single device logout).
   * Best-effort — UI should clear local session regardless of outcome.
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await api.post<void>("/auth/logout", { refreshToken });
    } catch {
      // Idempotent — server may already have revoked it
    }
  },

  /**
   * Revoke ALL active refresh tokens for the current user (all devices).
   * Requires a valid access token.
   */
  async logoutAll(): Promise<void> {
    try {
      await api.post<void>("/auth/logout-all", {});
    } catch {
      // Best effort
    }
  },
};
