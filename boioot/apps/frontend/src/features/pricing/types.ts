export interface PublicPricingEntry {
  billingCycle: "Monthly" | "Yearly";
  priceAmount: number;
  currencyCode: string;
}

export interface PublicLimitItem {
  key: string;
  name: string;
  value: number;
  unit: string | null;
}

export interface PublicFeatureItem {
  key: string;
  name: string;
  isEnabled: boolean;
  featureGroup: string | null;
}

export interface PublicPricingItem {
  planId: string;
  planName: string;
  description: string | null;
  applicableAccountType: string | null;
  pricing: PublicPricingEntry[];
  limits: PublicLimitItem[];
  features: PublicFeatureItem[];
}
