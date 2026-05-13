import { apiConfig } from "@/lib/api-config";
import type { PublicPricingItem } from "./types";

/**
 * Normalizes a raw plan object from the API, ensuring array fields are
 * never null — production may return null instead of [] for plans with
 * no limits/features/pricing entries.
 */
function normalizePricingEntry(raw: unknown) {
  const e = (raw ?? {}) as Record<string, unknown>;
  return {
    pricingId:    String(e.pricingId ?? ""),
    billingCycle: (e.billingCycle as string) || "Monthly",
    priceAmount:  Number(e.priceAmount ?? 0),
    currencyCode: String(e.currencyCode ?? "SYP"),
  };
}

function normalizeLimitItem(raw: unknown) {
  const l = (raw ?? {}) as Record<string, unknown>;
  return {
    key:   String(l.key ?? ""),
    name:  String(l.name ?? ""),
    value: Number(l.value ?? 0),
    unit:  (l.unit as string | null) ?? null,
  };
}

function normalizeFeatureItem(raw: unknown) {
  const f = (raw ?? {}) as Record<string, unknown>;
  return {
    key:          String(f.key ?? ""),
    name:         String(f.name ?? ""),
    isEnabled:    Boolean(f.isEnabled ?? false),
    featureGroup: (f.featureGroup as string | null) ?? null,
  };
}

function normalizePlan(raw: unknown): PublicPricingItem {
  const p = (raw ?? {}) as Record<string, unknown>;
  return {
    planId:                String(p.planId ?? ""),
    planName:              String(p.planName ?? ""),
    displayNameAr:         (p.displayNameAr as string | null) ?? null,
    audienceType:          (p.audienceType as string | null) ?? null,
    tier:                  (p.tier as string | null) ?? null,
    description:           (p.description as string | null) ?? null,
    applicableAccountType: (p.applicableAccountType as string | null) ?? null,
    rank:                  Number(p.rank ?? 0),
    displayOrder:          Number(p.displayOrder ?? 0),
    isRecommended:         Boolean(p.isRecommended ?? false),
    planCategory:          (p.planCategory as string | null) ?? null,
    planBillingType:       String(p.planBillingType ?? "recurring"),
    pricing:  Array.isArray(p.pricing)  ? p.pricing.filter(Boolean).map(normalizePricingEntry)  : [],
    limits:   Array.isArray(p.limits)   ? p.limits.filter(Boolean).map(normalizeLimitItem)      : [],
    features: Array.isArray(p.features) ? p.features.filter(Boolean).map(normalizeFeatureItem)  : [],
  } as PublicPricingItem;
}

export const pricingApi = {
  async getPublicPricing(): Promise<PublicPricingItem[]> {
    const res = await fetch(`${apiConfig.baseUrl}/public/pricing`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("فشل في تحميل بيانات الباقات");
    const raw = await res.json();
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizePlan);
  },
};
