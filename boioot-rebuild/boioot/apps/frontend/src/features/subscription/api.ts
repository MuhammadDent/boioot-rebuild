import { api } from "@/lib/api";
import type {
  CurrentSubscriptionResponse,
  SubscriptionHistoryDto,
  ChangePlanRequest,
  CancelSubscriptionRequest,
  UpgradeIntentRequest,
  UpgradeIntentResponse,
} from "./types";

export const subscriptionApi = {
  async getCurrent(): Promise<CurrentSubscriptionResponse | null> {
    return api.get<CurrentSubscriptionResponse | null>(
      "/dashboard/subscription/current"
    );
  },

  async getHistory(): Promise<SubscriptionHistoryDto[]> {
    return api.get<SubscriptionHistoryDto[]>("/dashboard/subscription/history");
  },

  async getUpgradeIntent(pricingId: string): Promise<UpgradeIntentResponse> {
    return api.post<UpgradeIntentResponse>(
      "/dashboard/subscription/upgrade-intent",
      { pricingId } satisfies UpgradeIntentRequest
    );
  },

  async changePlan(request: ChangePlanRequest): Promise<CurrentSubscriptionResponse> {
    return api.post<CurrentSubscriptionResponse>(
      "/dashboard/subscription/change-plan",
      request
    );
  },

  async cancel(request: CancelSubscriptionRequest): Promise<void> {
    await api.post("/dashboard/subscription/cancel", request);
  },
};
