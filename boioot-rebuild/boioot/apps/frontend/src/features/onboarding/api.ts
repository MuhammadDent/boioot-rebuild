import { api } from "@/lib/api";
import type { BusinessProfileResponse } from "@/types";

export interface UpdateBusinessProfilePayload {
  displayName: string;
  province?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
  phone?: string;
  whatsApp?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export const onboardingApi = {
  getBusinessProfile(): Promise<BusinessProfileResponse> {
    return api.get<BusinessProfileResponse>("/onboarding/business-profile");
  },

  updateBusinessProfile(payload: UpdateBusinessProfilePayload): Promise<BusinessProfileResponse> {
    return api.put<BusinessProfileResponse>("/onboarding/business-profile", payload);
  },
};
