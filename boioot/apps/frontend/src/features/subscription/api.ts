import { api } from "@/lib/api";
import type {
  CurrentSubscriptionResponse,
  UpgradeIntentRequest,
  UpgradeIntentResponse,
} from "./types";

export const subscriptionApi = {
  /**
   * Fetch the current user's active subscription.
   * Returns null when the user has no account (204 No Content).
   * Throws ApiError on 401 (unauthenticated) — caller should handle this.
   */
  async getCurrent(): Promise<CurrentSubscriptionResponse | null> {
    return api.get<CurrentSubscriptionResponse | null>(
      "/dashboard/subscription/current"
    );
  },

  /**
   * Evaluate a plan-change intent (upgrade / downgrade / cycle change).
   * Does NOT process payment or mutate data.
   */
  async getUpgradeIntent(
    pricingId: string
  ): Promise<UpgradeIntentResponse> {
    return api.post<UpgradeIntentResponse>(
      "/dashboard/subscription/upgrade-intent",
      { pricingId } satisfies UpgradeIntentRequest
    );
  },
};
