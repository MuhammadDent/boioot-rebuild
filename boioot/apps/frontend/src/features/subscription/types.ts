export interface CurrentSubscriptionResponse {
  subscriptionId: string;
  planId:         string;
  planName:       string;
  planCode:       string | null;
  audienceType:   string | null;
  tier:           string | null;
  pricingId:      string | null;
  billingCycle:   "Monthly" | "Yearly";
  priceAmount:    number;
  currencyCode:   string;
  rank:           number;
  status:         string;
  isActive:       boolean;
  autoRenew:      boolean;
  // ── Lifecycle dates ──────────────────────────────────────────────────────
  startDate:         string;
  endDate:           string | null;
  trialEndsAt:       string | null;
  currentPeriodEnd:  string | null;
  canceledAt:        string | null;
  // ── Feature entitlements (named — backward compat) ───────────────────────
  hasAnalyticsDashboard:  boolean;
  hasVideoUpload:         boolean;
  hasFeaturedListings:    boolean;
  hasWhatsappContact:     boolean;
  hasVerifiedBadge:       boolean;
  hasHomepageExposure:    boolean;
  hasProjectManagement:   boolean;
  // ── Limit entitlements (named — backward compat) ─────────────────────────
  maxActiveListings:      number;
  maxImagesPerListing:    number;
  maxAgents:              number;
  maxFeaturedSlots:       number;
  // ── Dynamic maps (Phase 3A) ───────────────────────────────────────────────
  features: Record<string, boolean>;
  limits:   Record<string, number>;
}

export interface SubscriptionHistoryDto {
  id:            string;
  eventType:     string;
  oldPlanName:   string | null;
  newPlanName:   string | null;
  notes:         string | null;
  createdAtUtc:  string;
  createdByName: string | null;
}

export interface ChangePlanRequest {
  planId:    string;
  pricingId: string | null;
  notes:     string | null;
}

export interface CancelSubscriptionRequest {
  notes: string | null;
}

export interface UpgradeIntentRequest {
  pricingId: string;
}

export type UpgradeIntentReason =
  | "upgrade"
  | "downgrade"
  | "cycle_change"
  | "new_subscription"
  | "already_subscribed"
  | "no_account";

export interface UpgradeIntentResponse {
  currentPlanName: string;
  targetPlanName:  string;
  billingCycle:    "Monthly" | "Yearly";
  priceAmount:     number;
  currencyCode:    string;
  allowed:         boolean;
  reason:          UpgradeIntentReason;
  message:         string;
}
