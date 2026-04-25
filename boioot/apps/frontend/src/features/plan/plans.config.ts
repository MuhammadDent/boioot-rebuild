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
  /** Short benefit bullets shown in the upgrade prompt (max 3). */
  benefits?: string[];
}

export const FEATURE_META: Record<FeatureKey, FeatureMeta> = {
  analytics_dashboard: {
    key: "analytics_dashboard",
    label: "لوحة الإحصاءات",
    description: "احصل على تقارير مفصّلة عن أداء إعلاناتك وفرص التحسين",
    icon: "📊",
    benefits: [
      "تقارير مفصّلة عن مشاهدات كل إعلان",
      "إحصاءات الطلبات والتواصل الوارد",
      "تتبّع الأداء العام لحسابك",
    ],
  },
  video_upload: {
    key: "video_upload",
    label: "رفع الفيديو",
    description: "اجذب مزيدًا من المشترين بجولة مرئية مقنعة لعقارك",
    icon: "🎥",
    benefits: [
      "جولة مرئية تُبرز مميزات العقار بوضوح",
      "زيادة التفاعل مع إعلانك",
      "تميّز عن الإعلانات الأخرى",
    ],
  },
  featured_listings: {
    key: "featured_listings",
    label: "الإعلانات المميزة",
    description: "ضع إعلانك في المقدمة وزد فرص البيع بشكل ملحوظ",
    icon: "⭐",
    benefits: [
      "إعلانك في أعلى نتائج البحث",
      "ظهور مميز في قوائم التصفح",
      "وصول أسرع لأكبر عدد من المشترين",
    ],
  },
  whatsapp_contact: {
    key: "whatsapp_contact",
    label: "التواصل عبر واتساب",
    description: "أتح التواصل الفوري مع العملاء بزر واتساب مباشر في إعلانك",
    icon: "💬",
    benefits: [
      "زر واتساب يظهر مباشرةً في صفحة إعلانك",
      "تواصل فوري مع المهتمين دون تأخير",
      "زيادة معدل الاستفسارات الواردة",
    ],
  },
  verified_badge: {
    key: "verified_badge",
    label: "شارة الموثوقية",
    description: "شارة توثيق تُظهر مصداقيتك وتزيد ثقة المشترين",
    icon: "✅",
    benefits: [
      "شارة موثوقية بارزة على جميع إعلاناتك",
      "مصداقية أعلى لدى المشترين والمستأجرين",
    ],
  },
  homepage_exposure: {
    key: "homepage_exposure",
    label: "الظهور في الصفحة الرئيسية",
    description: "ضع إعلانك أمام أكبر عدد من الزوار في الصفحة الرئيسية",
    icon: "🏠",
    benefits: [
      "إعلانك في واجهة الموقع الرئيسية",
      "أعلى نسبة مشاهدات لإعلانك",
      "وصول فوري لزوار الموقع الجدد",
    ],
  },
  project_management: {
    key: "project_management",
    label: "إدارة المشاريع",
    description: "أنشئ وروّج لمشاريعك العقارية بشكل احترافي مع وحدات وخيارات متعددة",
    icon: "🏗️",
    benefits: [
      "إنشاء مشاريع بوحدات وأسعار متعددة",
      "عرض احترافي للمشاريع للمستثمرين والعملاء",
      "إدارة مركزية لجميع مشاريعك",
    ],
  },
  internal_chat: {
    key: "internal_chat",
    label: "المراسلة الداخلية",
    description: "تواصل مباشرةً مع العملاء وأصحاب العقارات داخل التطبيق",
    icon: "💬",
    benefits: [
      "تواصل مباشر مع العملاء داخل التطبيق",
      "ردود سريعة على استفسارات المهتمين",
      "سجل محادثات منظم في مكان واحد",
    ],
  },
  priority_support:  { key: "priority_support",  label: "الدعم المتقدم",        description: "دعم ذو أولوية عالية من فريقنا",                      icon: "🎧" },
  multiple_photos:   { key: "multiple_photos",   label: "صور متعددة",           description: "رفع عدد أكبر من الصور لكل إعلان",                   icon: "🖼️" },
  advanced_reports:  { key: "advanced_reports",  label: "التقارير المتقدمة",    description: "تقارير أداء متقدمة ومفصّلة",                         icon: "📈" },
  lead_tracking:     { key: "lead_tracking",     label: "تتبع العملاء المحتملين", description: "تتبع ومتابعة العملاء المحتملين الواردين",            icon: "🎯" },
  lead_assignment:   { key: "lead_assignment",   label: "توزيع العملاء",        description: "توزيع العملاء المحتملين على وكلاء المبيعات",         icon: "👥" },
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
