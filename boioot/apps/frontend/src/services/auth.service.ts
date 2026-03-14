import { api } from "@/lib/api";
import type { AuthResponse, UserProfileResponse } from "@/types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export const authService = {
  login(payload: LoginPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>("/auth/login", payload);
  },

  register(payload: RegisterPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>("/auth/register", payload);
  },

  me(): Promise<UserProfileResponse> {
    return api.get<UserProfileResponse>("/auth/me");
  },
};
