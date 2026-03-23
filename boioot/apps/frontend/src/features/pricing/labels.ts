// ── Limit key → Arabic label + icon ──────────────────────────────────────────
export const LIMIT_LABELS: Record<string, string> = {
  max_active_listings:    "الإعلانات النشطة",
  max_agents:             "الوسطاء",
  max_projects:           "المشاريع",
  max_project_units:      "وحدات المشروع",
  max_images_per_listing: "الصور لكل إعلان",
  max_featured_slots:     "الإعلانات المميزة",
};

export const LIMIT_ICONS: Record<string, string> = {
  max_active_listings:    "📢",
  max_agents:             "👤",
  max_projects:           "🏗",
  max_project_units:      "🏢",
  max_images_per_listing: "🖼",
  max_featured_slots:     "⭐",
};

// ── Feature key → Arabic label + icon ────────────────────────────────────────
export const FEATURE_LABELS: Record<string, string> = {
  featured_listings:   "ظهور مميز",
  analytics_dashboard: "تحليلات",
  whatsapp_contact:    "دعم واتساب",
  verified_badge:      "حساب موثّق",
  priority_support:    "دعم سريع",
  project_management:  "إدارة المشاريع",
  video_upload:        "رفع فيديو",
  multiple_photos:     "صور متعددة",
  homepage_exposure:   "ظهور في الرئيسية",
};

export const FEATURE_ICONS: Record<string, string> = {
  featured_listings:   "⭐",
  analytics_dashboard: "📊",
  whatsapp_contact:    "📱",
  verified_badge:      "✅",
  priority_support:    "⚡",
  project_management:  "🏗",
  video_upload:        "🎬",
  multiple_photos:     "🖼",
  homepage_exposure:   "🏠",
};

// ── Billing cycle labels ──────────────────────────────────────────────────────
export const BILLING_CYCLE_LABELS: Record<string, string> = {
  Monthly: "شهري",
  Yearly:  "سنوي",
};

// ── Highlighted plan ──────────────────────────────────────────────────────────
export const POPULAR_PLAN_NAME = "AgentPro";

// ── Formatters ────────────────────────────────────────────────────────────────
export function formatLimitValue(value: number, unit: string | null): string {
  if (value === -1) return "غير محدود ∞";
  if (value === 0)  return "غير متاح";
  return unit ? `${value} ${unit}` : String(value);
}

export function formatPrice(amount: number, currency: string): string {
  if (amount === 0) return "مجاني";
  return `${amount.toLocaleString("ar-SY")} ${currency}`;
}

export function yearlySaving(monthly: number, yearlyTotal: number): number {
  if (!monthly) return 0;
  const effectiveMonthly = yearlyTotal / 12;
  return Math.round((1 - effectiveMonthly / monthly) * 100);
}
