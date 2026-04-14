export interface PublicPricingEntry {
  pricingId:    string;
  billingCycle: "Monthly" | "Yearly" | "OneTime";
  priceAmount:  number;
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
  planId:               string;
  planName:             string;
  /** Primary Arabic display name — use this in UI instead of planName. */
  displayNameAr:        string | null;
  /** seeker | owner | broker | office | company */
  audienceType:         string | null;
  /** free | basic | advanced | enterprise */
  tier:                 string | null;
  description:          string | null;
  applicableAccountType: string | null;
  rank:                 number;
  displayOrder:         number;
  isRecommended:        boolean;
  planCategory:         string | null;
  /**
   * Billing type: "free_default" | "one_time_fixed_term" | "recurring"
   * Use this — not billingCycle — to drive UI decisions (hide toggle for one-time plans).
   */
  billingType:          string;
  pricing:              PublicPricingEntry[];
  limits:               PublicLimitItem[];
  features:             PublicFeatureItem[];
}
