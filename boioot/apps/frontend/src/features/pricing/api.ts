import { apiConfig } from "@/lib/api-config";
import type { PublicPricingItem } from "./types";

export const pricingApi = {
  async getPublicPricing(): Promise<PublicPricingItem[]> {
    const res = await fetch(`${apiConfig.baseUrl}/public/pricing`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("فشل في تحميل بيانات الباقات");
    return res.json();
  },
};
