// ── Limit key → Arabic label override ────────────────────────────────────────
// These override or supplement the labels coming from the backend,
// providing richer frontend formatting.
export const LIMIT_LABELS: Record<string, string> = {
  max_active_listings: "إعلانات نشطة",
  max_agents:          "وكلاء",
  max_projects:        "مشاريع",
};

export const LIMIT_ICONS: Record<string, string> = {
  max_active_listings: "📋",
  max_agents:          "👥",
  max_projects:        "🏗️",
};

// ── Feature key → Arabic label override ──────────────────────────────────────
export const FEATURE_LABELS: Record<string, string> = {
  analytics_dashboard: "لوحة التحليلات",
  priority_support:    "دعم ذو أولوية",
  featured_listings:   "إعلانات مميزة",
};

// ── Billing cycle labels ──────────────────────────────────────────────────────
export const BILLING_CYCLE_LABELS: Record<string, string> = {
  Monthly: "شهري",
  Yearly:  "سنوي",
};

// ── Highlighted plan ──────────────────────────────────────────────────────────
/** The plan name shown with the "الأكثر شعبية" badge. */
export const POPULAR_PLAN_NAME = "AgentPro";

// ── Formatters ────────────────────────────────────────────────────────────────
/** Format a limit value: -1 = unlimited, 0 = unavailable */
export function formatLimitValue(value: number, unit: string | null): string {
  if (value === -1) return "غير محدود";
  if (value === 0)  return "غير متاح";
  return unit ? `${value} ${unit}` : String(value);
}

/** Format a price amount */
export function formatPrice(amount: number, currency: string): string {
  if (amount === 0) return "مجاني";
  return `${amount.toLocaleString("ar-SY")} ${currency}`;
}

/** Yearly saving percentage vs monthly (rounded) */
export function yearlySaving(monthly: number, yearlyTotal: number): number {
  if (!monthly) return 0;
  const effectiveMonthly = yearlyTotal / 12;
  return Math.round((1 - effectiveMonthly / monthly) * 100);
}
