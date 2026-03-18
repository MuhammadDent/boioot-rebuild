export interface CurrentSubscriptionResponse {
  planId:       string;
  planName:     string;
  pricingId:    string | null;
  billingCycle: "Monthly" | "Yearly";
  priceAmount:  number;
  currencyCode: string;
  rank:         number;
  status:       string;
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
