// ─────────────────────────────────────────────────────────────────────────────
// plans.config.ts — Frontend metadata for plan features, limits, and tiers.
//
// This file does NOT define which features belong to which plan.
// That source of truth lives in the backend DB and is returned per-user
// via CurrentSubscriptionResponse.features / .limits.
//
// This file provides:
//   • Arabic display labels for every feature key and limit key.
//   • Tier/audience display metadata for pricing pages.
//   • Static defaults when no subscription data is available.
// ─────────────────────────────────────────────────────────────────────────────

import type { FeatureKey, LimitKey } from "./types";

// ── Feature display metadata ───────────────────────────────────────────────────

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
  description: string;
  icon: string;
}

export const FEATURE_META: Record<FeatureKey, FeatureMeta> = {
  analytics_dashboard: {
    key: "analytics_dashboard",
    label: "لوحة الإحصاءات",
    description: "تحليلات وإحصاءات تفصيلية لإعلاناتك ومشاريعك",
    icon: "📊",
  },
  video_upload: {
    key: "video_upload",
    label: "رفع الفيديو",
    description: "إضافة مقاطع فيديو للإعلانات العقارية",
    icon: "🎥",
  },
  featured_listings: {
    key: "featured_listings",
    label: "الإعلانات المميزة",
    description: "إبراز إعلاناتك في نتائج البحث وقوائم الترشيح",
    icon: "⭐",
  },
  whatsapp_contact: {
    key: "whatsapp_contact",
    label: "التواصل عبر واتساب",
    description: "زر واتساب مباشر في إعلاناتك لسرعة التواصل",
    icon: "💬",
  },
  verified_badge: {
    key: "verified_badge",
    label: "شارة الموثوقية",
    description: "شارة توثيق موثوقة تُظهر مصداقيتك للمشترين",
    icon: "✅",
  },
  homepage_exposure: {
    key: "homepage_exposure",
    label: "الظهور في الصفحة الرئيسية",
    description: "عرض إعلاناتك في واجهة الموقع الرئيسية لأكبر انتشار",
    icon: "🏠",
  },
  project_management: {
    key: "project_management",
    label: "إدارة المشاريع",
    description: "إنشاء وإدارة مشاريع عقارية متكاملة مع وحدات وخيارات",
    icon: "🏗️",
  },
};

// ── Limit display metadata ─────────────────────────────────────────────────────

export interface LimitMeta {
  key: LimitKey;
  label: string;
  unit: string;
}

export const LIMIT_META: Record<LimitKey, LimitMeta> = {
  max_active_listings: {
    key: "max_active_listings",
    label: "الإعلانات النشطة",
    unit: "إعلان",
  },
  max_images_per_listing: {
    key: "max_images_per_listing",
    label: "الصور لكل إعلان",
    unit: "صورة",
  },
  max_agents: {
    key: "max_agents",
    label: "الوكلاء المسموح بهم",
    unit: "وكيل",
  },
  max_featured_slots: {
    key: "max_featured_slots",
    label: "مقاعد الإعلانات المميزة",
    unit: "إعلان",
  },
};

// ── Tier hierarchy ─────────────────────────────────────────────────────────────

/** Higher rank = better / more features. */
export const TIER_RANK: Record<string, number> = {
  free:       0,
  basic:      1,
  advanced:   2,
  enterprise: 3,
};

/** Arabic display name for each tier code. */
export const TIER_LABEL: Record<string, string> = {
  free:       "المجاني",
  basic:      "الأساسي",
  advanced:   "المتقدم",
  enterprise: "المؤسسي",
};

/** Arabic display name for each audience type code. */
export const AUDIENCE_LABEL: Record<string, string> = {
  seeker:  "باحث عن عقار",
  owner:   "مالك عقار",
  broker:  "وسيط عقاري",
  office:  "مكتب عقاري",
  company: "شركة تطوير عقاري",
};

// ── Default limits when no subscription data is available ─────────────────────
// These represent the floor for free-tier users. Used for graceful degradation
// when the subscription API is unreachable or the user has no active plan.

export const FREE_TIER_DEFAULTS: Record<LimitKey, number> = {
  max_active_listings:   3,
  max_images_per_listing: 5,
  max_agents:            0,
  max_featured_slots:    0,
};
