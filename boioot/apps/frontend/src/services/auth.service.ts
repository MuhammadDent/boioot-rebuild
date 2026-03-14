import { api } from "@/lib/api";
import type { AuthResponse, UserProfileResponse } from "@/types";

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  login(payload: LoginPayload): Promise<AuthResponse> {
    return api.post<AuthResponse>("/auth/login", payload);
  },

  me(): Promise<UserProfileResponse> {
    return api.get<UserProfileResponse>("/auth/me");
  },
};
