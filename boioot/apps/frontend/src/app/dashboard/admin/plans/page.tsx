"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { adminApi } from "@/features/admin/api";
import { normalizeError } from "@/lib/api";
import type { AdminPlanSummary, AdminPlanDetail, AdminPlanPricingEntry, PlanLimitItem, PlanFeatureItem } from "@/types";

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, padding: "0.75rem 1.5rem", borderRadius: 10,
      background: type === "ok" ? "#166534" : "#991b1b",
      color: "#fff", fontWeight: 600, fontSize: "0.9rem",
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)", whiteSpace: "nowrap",
    }}>
      {msg}
    </div>
  );
}

// ── Audience → AccountType/Category derivation ────────────────────────────────
function audienceToAccountType(audience: string): string {
  if (audience === "office")  return "Office";
  if (audience === "company") return "Company";
  if (audience === "seeker" || audience === "owner" || audience === "broker") return "Individual";
  return "";
}
function audienceToPlanCategory(audience: string): string {
  if (audience === "office" || audience === "company") return "Business";
  if (audience === "seeker" || audience === "owner" || audience === "broker") return "Individual";
  return "";
}

// ── Audience / Tier display helpers ───────────────────────────────────────────

const AUDIENCE_AR_LABEL: Record<string, string> = {
  seeker: "باحث", owner: "مالك", broker: "وسيط", office: "مكتب", company: "شركة",
};
const AUDIENCE_BG: Record<string, string> = {
  seeker: "#1d4ed8", owner: "#15803d", broker: "#c2410c", office: "#6d28d9", company: "#b91c1c",
};
const TIER_AR_LABEL: Record<string, string> = {
  free: "مجاني", basic: "أساسي", advanced: "متقدم", enterprise: "مؤسسي",
};
const TIER_BG: Record<string, string> = {
  free: "#374151", basic: "#1e40af", advanced: "#4338ca", enterprise: "#5b21b6",
};

// ── Feature group labels ───────────────────────────────────────────────────────

const FEATURE_GROUP_LABELS: Record<string, string> = {
  marketing:     "📢 التسويق والظهور",
  content:       "🏠 محتوى الإعلان",
  business:      "📊 إدارة الأعمال",
  communication: "💬 التواصل",
  support:       "🛠 الدعم الفني",
  // legacy keys kept for backward compatibility
  analytics:     "📊 إدارة الأعمال",
  listing:       "🏠 محتوى الإعلان",
  media:         "🏠 محتوى الإعلان",
  team:          "📊 إدارة الأعمال",
  projects:      "📊 إدارة الأعمال",
  general:       "عام",
};

function featureGroupLabel(raw?: string): string {
  if (!raw) return "عام";
  return FEATURE_GROUP_LABELS[raw] ?? raw;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPrice(n: number, currency = "ل.س") {
  if (n === 0) return "مجاني";
  return n.toLocaleString("ar-SY") + " " + currency;
}

function limitLabel(value: number) {
  if (value === -1) return "غير محدود";
  return String(value);
}

// ── ToggleSwitch ───────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? "var(--color-primary, #2563eb)" : "#d1d5db",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.85rem", fontWeight: 600,
  marginBottom: "0.3rem", color: "var(--color-text-secondary)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.75rem", borderRadius: 8,
  border: "1.5px solid var(--color-border, #e5e7eb)", fontSize: "0.95rem",
  background: "#ffffff", color: "var(--color-text-primary)", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

// ── Currency options (locked dropdown — only USD / SYP allowed) ──────────────

const CURRENCY_OPTIONS = [
  { value: "SYP", label: "SYP — ليرة سورية" },
  { value: "USD", label: "USD — دولار أمريكي" },
];

// ── Unified Feature + Limit catalog ──────────────────────────────────────────
//
// t: "limit"   → numeric input only (no toggle)
// t: "sim"     → simulated toggle derived from limit value (> 0 = ON)
// t: "flt"     → backend feature toggle + associated limit input when ON
// t: "feature" → backend feature toggle only (no numeric limit)

type UnifiedItem =
  | { t: "limit";   key: string;  icon: string; label: string; hint: string }
  | { t: "sim";     key: string;  icon: string; label: string; hint: string; limitLabel: string;
      /** All possible backend FEATURE keys that represent this capability —
       *  suppressed from the fallback feature renderer via SUPPRESSED_FEATURE_KEYS. */
      possibleFks: string[];
      /** All possible backend LIMIT keys (other than `key`) that represent the same capability —
       *  suppressed from the fallback limit renderer via SUPPRESSED_LIMIT_KEYS. */
      possibleLimitKeys?: string[] }
  | { t: "flt";     fk: string; key: string; icon: string; label: string; hint: string; limitLabel: string }
  | { t: "feature"; fk: string;  icon: string; label: string; hint: string };

const UNIFIED_ITEMS: UnifiedItem[] = [
  // ── Core limit (always configurable) ─────────────────────────────────────
  { t: "limit",   key: "max_active_listings",   icon: "🏠", label: "الإعلانات النشطة",        hint: "الحد الأقصى لعدد الإعلانات النشطة في آن واحد (-1 = غير محدود)." },

  // ── Simulated toggles — own BOTH toggle (via backend feature OR limit>0) + numeric limit ──
  // possibleFks: every backend key variant that represents this capability.
  // The card consumes the first match found; ALL variants are suppressed from the fallback.
  {
    t: "sim", key: "max_images_per_listing", icon: "📸",
    label: "صور متعددة لكل إعلان",
    hint: "السماح برفع أكثر من صورة لكل إعلان. عند التعطيل يُصبح 0.",
    limitLabel: "عدد الصور لكل إعلان",
    possibleFks: [
      // snake_case
      "multi_images","multiple_images","images_per_listing","multiple_images_per_listing",
      "multi_image","image_limit","image_upload","allow_multiple_images","multiple_image_upload",
      "max_image","images","image","image_count","allow_images","images_count",
      // camelCase (ASP.NET Core JSON serializer default)
      "multiImages","multipleImages","imagesPerListing","multipleImagesPerListing",
      "multiImage","imageLimit","imageUpload","allowMultipleImages","multipleImageUpload",
      "maxImage","imageCount","allowImages","imagesCount",
    ],
    possibleLimitKeys: [
      "max_images","image_limit","max_image_count","images_limit",
      "image_per_listing","images_per_listing","images_count","max_image",
      "listing_image_limit","per_listing_images",
    ],
  },
  // max_messages sim item removed — backend does not support this limit key (404).
  // Messaging feature aliases are still suppressed via MESSAGING_EXTRA_FEATURES below.
  {
    t: "sim", key: "max_requests", icon: "📨",
    label: "طلبات التواصل",
    hint: "الحد الأقصى لعدد طلبات التواصل المستقبَلة.",
    limitLabel: "عدد الطلبات",
    possibleFks: [
      "requests","contact_requests","request_limit","max_contact_requests","request",
      "contact_request","allow_requests","inquiry","inquiries","inquiry_limit",
    ],
    possibleLimitKeys: [
      "max_contact_requests","contact_request_limit","inquiry_limit","max_inquiries",
      "request_limit","max_request","contact_limit","max_leads",
    ],
  },

  // ── Backend feature toggle + associated limit ─────────────────────────────
  { t: "flt", fk: "video_upload",       key: "max_videos_per_listing", icon: "🎬", label: "رفع فيديو",             hint: "السماح برفع مقاطع فيديو داخل الإعلان.",          limitLabel: "عدد الفيديوهات لكل إعلان" },
  { t: "flt", fk: "featured_listings",  key: "max_featured_slots",     icon: "⭐", label: "إعلانات مميزة (Boost)", hint: "رفع الإعلانات لأقسام مميزة في الموقع.",          limitLabel: "عدد الإعلانات المميزة" },
  { t: "flt", fk: "project_management", key: "max_projects",           icon: "🏗", label: "إدارة المشاريع",        hint: "إنشاء مشاريع عقارية متعددة الوحدات.",           limitLabel: "عدد المشاريع" },
  { t: "flt", fk: "team_management",    key: "max_agents",             icon: "👥", label: "إدارة الفريق (وسطاء)", hint: "إضافة وسطاء وأعضاء ضمن الحساب التجاري.",       limitLabel: "عدد الوسطاء" },

  // ── Pure features — toggle only ───────────────────────────────────────────
  { t: "feature", fk: "analytics_dashboard",  icon: "📊", label: "لوحة التحليلات",             hint: "إحصاءات وتقارير مفصّلة لأداء الإعلانات." },
  { t: "feature", fk: "priority_support",     icon: "🛠", label: "دعم فني بأولوية",            hint: "استجابة أسرع من فريق الدعم الفني." },
  { t: "feature", fk: "homepage_exposure",    icon: "🏠", label: "ظهور في الصفحة الرئيسية",   hint: "عرض الإعلانات ضمن أقسام الصفحة الرئيسية." },
  { t: "feature", fk: "verified_badge",       icon: "✅", label: "شارة موثّق",                 hint: "تمييز الملف الشخصي بشارة الموثوقية." },
  { t: "feature", fk: "search_priority",      icon: "🔍", label: "أولوية في نتائج البحث",     hint: "ظهور الإعلانات في مقدمة نتائج البحث." },
  { t: "feature", fk: "whatsapp_contact",     icon: "💬", label: "زر واتساب مباشر",           hint: "تمكين زر التواصل عبر واتساب في الإعلان." },
  { t: "feature", fk: "lead_insights",        icon: "📈", label: "تحليلات العملاء المحتملين", hint: "بيانات مفصّلة عن الطلبات والعملاء المحتملين." },
];

const KNOWN_MARKETING: { key: string; icon: string; label: string; description: string }[] = [
  { key: "listing_priority",     icon: "📌", label: "أولوية الإعلان",         description: "درجة الأولوية في خوارزمية الترتيب (0 = بلا أولوية)" },
  { key: "search_ranking_boost", icon: "🔍", label: "تعزيز الظهور في البحث",  description: "معامل التعزيز في نتائج البحث (0 = لا تعزيز)" },
  { key: "homepage_slots",       icon: "🏠", label: "خانات الصفحة الرئيسية", description: "عدد الخانات المخصصة في الصفحة الرئيسية" },
];

// Messaging feature / limit aliases that need suppressing even though the
// max_messages sim card has been removed (backend does not support it).
// These prevent any general "messaging" backend feature from appearing as a
// standalone editable toggle in the plan configuration UI.
const MESSAGING_EXTRA_FEATURES: readonly string[] = [
  "messaging","internal_messaging","direct_messaging","chat","messages","message",
  "messaging_enabled","allow_messaging","message_limit","chat_enabled","inbox",
  "direct_messages","conversations","conversation_limit","allow_chat",
  "private_messaging","private_chat","paid_messaging","paid_chat","premium_chat",
  "internalMessaging","directMessaging","messagingEnabled","allowMessaging",
  "messageLimit","chatEnabled","directMessages","conversationLimit","allowChat",
  "privateMessaging","privateChat","paidMessaging","paidChat","premiumChat",
];
const MESSAGING_EXTRA_LIMITS: readonly string[] = [
  "max_messages","max_conversations","conversation_limit","max_conversation","conversations",
  "message_limit","max_chat","chat_limit","inbox_limit","private_message_limit",
  "max_private_messages","max_inbox","messaging_limit","max_messaging",
  "maxMessages","maxConversations","conversationLimit","maxConversation",
  "chatLimit","inboxLimit","messageLimit","messagesLimit","privatMessageLimit",
  "maxPrivateMessages","maxInbox","messagingLimit","maxMessaging",
];

// Feature keys that are stripped from React state entirely.
// ONLY includes alias / extra keys that have NO unified card.
// CRITICAL: flt/feature fk values (video_upload, featured_listings, analytics_dashboard etc.)
//   are NOT included here — their feature objects MUST stay in state so the unified
//   flt/feature cards can find them via features.find(f => f.key === item.fk).
// Removing them from state causes "لم تُعرَّف" (not defined) on every flt/feature card.
const SUPPRESSED_FEATURE_KEYS: ReadonlySet<string> = new Set<string>([
  // sim-item possibleFks are alias keys only — no unified card reads them from state
  ...UNIFIED_ITEMS.flatMap(u => {
    if (u.t === "sim") return [u.key, ...u.possibleFks].flatMap(k => [k, k.toLowerCase()]);
    return [];
  }),
  // messaging extras — suppressed from state and fallback renderer
  ...MESSAGING_EXTRA_FEATURES.flatMap(k => [k, k.toLowerCase()]),
]);

/** True when a key should be removed from React features state.
 *  Does NOT include flt/feature fk values — those must stay in state so unified cards work. */
function isSuppressedFromState(key: string): boolean {
  return SUPPRESSED_FEATURE_KEYS.has(key) || SUPPRESSED_FEATURE_KEYS.has(key.toLowerCase());
}

/** Strips only alias/extra keys from a features array.
 *  flt/feature keys are kept so unified cards can find their feature object. */
function normalizeFeatures(arr: PlanFeatureItem[]): PlanFeatureItem[] {
  return arr.filter(f => !isSuppressedFromState(f.key));
}

// Limit fallback renderer removed — only UNIFIED_ITEMS cards render limits now.

// ── Validated limit key allowlist ─────────────────────────────────────────────
// Only keys present here will be sent to the backend during save.
// Keys NOT in this set (e.g. max_messages which 404s) are silently skipped.
const VALID_LIMIT_KEYS: ReadonlySet<string> = new Set([
  "max_active_listings",
  "max_images_per_listing",
  "max_requests",
  "max_videos_per_listing",
  "max_featured_slots",
  "max_projects",
  "max_agents",
  // marketing / boost keys (rendered in القيمة التسويقية section)
  "listing_priority",
  "search_ranking_boost",
  "homepage_slots",
]);

// ── Limit-alias normalisation ─────────────────────────────────────────────────
// Consolidates backend alias keys into one canonical key so:
//  • limitValues state never holds duplicate / conflicting entries
//  • formSnapshot never goes dirty because of a ghost alias key
//  • UI always shows a single source of truth per logical limit

// canonical key → set of backend alias keys that map to it
const LIMIT_CANONICAL_ALIASES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  // The backend may store the images limit under max_images or other variants.
  ["max_images_per_listing", new Set([
    "max_images","image_limit","max_image_count","images_limit",
    "image_per_listing","images_per_listing","images_count","max_image",
    "listing_image_limit","per_listing_images",
    // camelCase
    "maxImages","imageLimit","maxImageCount","imagesLimit",
    "imagePerListing","imagesPerListing","imagesCount","maxImage",
    "listingImageLimit","perListingImages",
  ])],
  // The backend may store the requests limit under different keys.
  ["max_requests", new Set([
    "max_contact_requests","contact_request_limit","inquiry_limit","max_inquiries",
    "request_limit","max_request","contact_limit","max_leads",
    "maxContactRequests","contactRequestLimit","inquiryLimit","maxInquiries",
    "requestLimit","maxRequest","contactLimit","maxLeads",
  ])],
]);

// Flat set of ALL alias keys (used for fast O(1) look-up)
const ALL_ALIAS_KEYS: ReadonlySet<string> = new Set(
  [...LIMIT_CANONICAL_ALIASES.values()].flatMap(s => [...s])
);

function isAliasKey(key: string): boolean {
  return ALL_ALIAS_KEYS.has(key) || ALL_ALIAS_KEYS.has(key.toLowerCase());
}

/**
 * Accepts raw limitValues from the backend and returns a normalised copy where:
 *  - Every alias key has been removed
 *  - If the canonical key is absent or zero and an alias carries a non-zero value,
 *    the alias value is promoted into the canonical key
 */
function normalizeLimitValues(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};

  // Best non-zero value found for each canonical key from its aliases
  const promotedValues = new Map<string, string>();

  for (const [key, val] of Object.entries(raw)) {
    let handled = false;
    for (const [canonical, aliases] of LIMIT_CANONICAL_ALIASES) {
      if (aliases.has(key) || aliases.has(key.toLowerCase())) {
        // This key is an alias — collect its value for possible promotion
        const n = parseInt(val, 10);
        if (!isNaN(n) && n > 0) {
          const existing = parseInt(promotedValues.get(canonical) ?? "0", 10);
          if (existing === 0) promotedValues.set(canonical, val);
        }
        handled = true;
        break;
      }
    }
    if (!handled) out[key] = val;
  }

  // Promote collected alias values into canonical keys only when the canonical
  // key is absent or zero in the output
  for (const [canonical, promoted] of promotedValues) {
    if (!out[canonical] || out[canonical] === "0") {
      out[canonical] = promoted;
    }
  }

  return out;
}

// ── UnifiedItemCard ───────────────────────────────────────────────────────────
// Renders one item from UNIFIED_ITEMS.
// Handles all four types: limit / sim / flt / feature

interface UnifiedCardProps {
  item: UnifiedItem;
  features: PlanFeatureItem[];
  limits: PlanLimitItem[];
  limitValues: Record<string, string>;
  featureSaving: string | null;
  onFeatureToggle: (fk: string, val: boolean) => void;
  onLimitChange: (key: string, val: string) => void;
  onSimToggle: (limitKey: string, enabled: boolean) => void;
  onFeatureLimitToggle: (fk: string, limitKey: string, val: boolean) => void;
}

function UnifiedItemCard({
  item, features, limits, limitValues, featureSaving,
  onFeatureToggle, onLimitChange, onSimToggle, onFeatureLimitToggle,
}: UnifiedCardProps) {
  const cardBase: React.CSSProperties = {
    borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff",
    padding: "0.9rem 1rem", transition: "border-color 0.15s, background 0.15s",
  };

  // ── t: "limit" — always-visible numeric input ──────────────────────────────
  if (item.t === "limit") {
    const limItem = limits.find(l => l.key === item.key);
    const val = limitValues[item.key] ?? String(limItem?.value ?? 0);
    const dirty = limItem ? val !== String(limItem.value) : false;
    return (
      <div style={{ ...cardBase, border: dirty ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <span style={{ fontSize: "1.15rem" }}>{item.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600 }}>{item.label}</p>
            <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>{item.hint}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
            <input
              type="number" min={-1}
              value={val}
              onChange={e => onLimitChange(item.key, e.target.value)}
              style={{ ...inputStyle, width: 82, textAlign: "center", padding: "0.3rem 0.5rem", margin: 0 }}
            />
            <button type="button" title="غير محدود ∞" onClick={() => onLimitChange(item.key, "-1")}
              style={{ padding: "0.3rem 0.5rem", borderRadius: 6, border: "1.5px solid #e2e8f0", background: val === "-1" ? "#f0fdf4" : "#f8fafc", fontSize: "0.82rem", cursor: "pointer", color: val === "-1" ? "#166534" : "#475569", fontWeight: 700 }}>∞</button>
          </div>
        </div>
      </div>
    );
  }

  // ── t: "sim" — pure limit-driven toggle + numeric limit ───────────────────
  // Toggle state = limitValue > 0 (never reads backend feature.isEnabled).
  // possibleFks is used ONLY for suppression via SUPPRESSED_FEATURE_KEYS —
  // no backend feature is claimed here, so general features (e.g. buyer/seller
  // messaging) are silently hidden and never exposed as plan configuration.
  if (item.t === "sim") {
    const limItem = limits.find(l => l.key === item.key);
    const val = limitValues[item.key] ?? String(limItem?.value ?? 0);
    const enabled = val !== "0" && val !== "";
    const dirty = limItem ? val !== String(limItem.value) : false;

    return (
      <div style={{ ...cardBase, background: enabled ? "#f0fdf4" : "#fff", border: enabled ? "1.5px solid #86efac" : dirty ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0", transition: "all 0.18s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <span style={{ fontSize: "1.15rem" }}>{item.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: enabled ? 600 : 400, color: enabled ? "#166534" : "#334155" }}>{item.label}</p>
            <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>{item.hint}</p>
          </div>
          <span style={{ fontSize: "0.75rem", color: enabled ? "#16a34a" : "#94a3b8", fontWeight: 600, flexShrink: 0 }}>
            {enabled ? "مفعّل" : "معطّل"}
          </span>
          <ToggleSwitch checked={enabled} onChange={v => onSimToggle(item.key, v)} />
        </div>
        {enabled && (
          <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid #dcfce7" }}>
            <label style={{ ...labelStyle, fontSize: "0.78rem" }}>{item.limitLabel}</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input
                type="number" min={0}
                value={val}
                onChange={e => onLimitChange(item.key, e.target.value)}
                style={{ ...inputStyle, width: 110, textAlign: "center", padding: "0.35rem 0.6rem" }}
              />
              <button type="button" title="غير محدود ∞" onClick={() => onLimitChange(item.key, "-1")}
                style={{ padding: "0.35rem 0.6rem", borderRadius: 6, border: "1.5px solid #e2e8f0", background: val === "-1" ? "#f0fdf4" : "#f8fafc", fontSize: "0.82rem", cursor: "pointer", color: val === "-1" ? "#166534" : "#475569", fontWeight: 700 }}>∞</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── t: "flt" — backend feature toggle + associated limit ───────────────────
  if (item.t === "flt") {
    const feat = features.find(f => f.key === item.fk);
    const limItem = limits.find(l => l.key === item.key);
    const enabled = feat?.isEnabled ?? false;
    const saving = featureSaving === item.fk;
    const val = limitValues[item.key] ?? String(limItem?.value ?? 0);
    const limitDirty = limItem ? val !== String(limItem.value) : false;

    if (!feat) {
      return (
        <div style={{ ...cardBase, background: "#f8fafc", border: "1.5px dashed #d1d5db", opacity: 0.65 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <span style={{ fontSize: "1.15rem" }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "#64748b" }}>{item.label}</p>
              <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>لم تُعرَّف في كتالوج الميزات — أضفها أولاً.</p>
            </div>
            <ToggleSwitch checked={false} onChange={() => {}} disabled />
          </div>
        </div>
      );
    }

    return (
      <div style={{ ...cardBase, background: enabled ? "#f0fdf4" : "#fff", border: enabled ? "1.5px solid #86efac" : "1.5px solid #e2e8f0", opacity: saving ? 0.6 : 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <span style={{ fontSize: "1.15rem" }}>{item.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: enabled ? 600 : 400, color: enabled ? "#166534" : "#334155" }}>{item.label}</p>
            <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>{item.hint}</p>
          </div>
          <span style={{ fontSize: "0.75rem", color: enabled ? "#16a34a" : "#94a3b8", fontWeight: 600, flexShrink: 0 }}>
            {enabled ? "مفعّل" : "معطّل"}
          </span>
          <ToggleSwitch checked={enabled} onChange={v => onFeatureLimitToggle(item.fk, item.key, v)} disabled={saving} />
        </div>
        {enabled && (
          <div style={{ marginTop: "0.75rem", paddingTop: "0.65rem", borderTop: "1px solid #dcfce7" }}>
            <label style={{ ...labelStyle, fontSize: "0.78rem" }}>{item.limitLabel}</label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <input
                type="number" min={0}
                value={val}
                onChange={e => onLimitChange(item.key, e.target.value)}
                style={{ ...inputStyle, width: 110, textAlign: "center", padding: "0.35rem 0.6rem", border: limitDirty ? "1.5px solid #93c5fd" : undefined }}
              />
              <button type="button" title="غير محدود ∞" onClick={() => onLimitChange(item.key, "-1")}
                style={{ padding: "0.35rem 0.6rem", borderRadius: 6, border: "1.5px solid #e2e8f0", background: val === "-1" ? "#f0fdf4" : "#f8fafc", fontSize: "0.82rem", cursor: "pointer", color: val === "-1" ? "#166534" : "#475569", fontWeight: 700 }}>∞</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── t: "feature" — pure feature toggle (no limit) ─────────────────────────
  const feat = features.find(f => f.key === item.fk);
  const saving = featureSaving === item.fk;

  if (!feat) {
    return (
      <div style={{ ...cardBase, background: "#f8fafc", border: "1.5px dashed #d1d5db", opacity: 0.65 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <span style={{ fontSize: "1.15rem" }}>{item.icon}</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 600, color: "#64748b" }}>{item.label}</p>
            <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>لم تُعرَّف في كتالوج الميزات — أضفها أولاً.</p>
          </div>
          <ToggleSwitch checked={false} onChange={() => {}} disabled />
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...cardBase, background: feat.isEnabled ? "#f0fdf4" : "#fff", border: feat.isEnabled ? "1.5px solid #86efac" : "1.5px solid #e2e8f0", opacity: saving ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
        <span style={{ fontSize: "1.15rem" }}>{item.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: feat.isEnabled ? 600 : 400, color: feat.isEnabled ? "#166534" : "#334155" }}>{item.label}</p>
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>{item.hint}</p>
        </div>
        <span style={{ fontSize: "0.75rem", color: feat.isEnabled ? "#16a34a" : "#94a3b8", fontWeight: 600, flexShrink: 0 }}>
          {feat.isEnabled ? "مفعّل" : "معطّل"}
        </span>
        <ToggleSwitch checked={feat.isEnabled} onChange={v => onFeatureToggle(item.fk, v)} disabled={saving} />
      </div>
    </div>
  );
}

// ── PricingPanel ───────────────────────────────────────────────────────────────

interface PricingRowProps {
  entry: AdminPlanPricingEntry;
  planId: string;
  planBillingType: string;
  onUpdated: (entry: AdminPlanPricingEntry) => void;
  onDeleted: (id: string) => void;
}

function PricingRow({ entry, planId, planBillingType, onUpdated, onDeleted }: PricingRowProps) {
  const [editing, setEditing]     = useState(false);
  const [price, setPrice]         = useState(String(entry.priceAmount));
  const [currency, setCurrency]   = useState(entry.currencyCode);
  const [cycle, setCycle]         = useState(entry.billingCycle);
  const [isActive, setIsActive]   = useState(entry.isActive);
  const [isPublic, setIsPublic]   = useState(entry.isPublic);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [deleting, setDeleting]   = useState(false);

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const updated = await adminApi.updatePlanPricing(planId, entry.id, {
        billingCycle:  cycle,
        priceAmount:   parseFloat(price) || 0,
        currencyCode:  currency,
        isActive,
        isPublic,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (e) { setError(normalizeError(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm("حذف هذا السعر نهائياً؟")) return;
    setDeleting(true); setError("");
    try {
      await adminApi.deletePlanPricing(planId, entry.id);
      onDeleted(entry.id);
    } catch (e) { setError(normalizeError(e)); }
    finally { setDeleting(false); }
  }

  const CYCLE_LABELS: Record<string, string> = { Monthly: "شهري", Yearly: "سنوي", OneTime: "مرة واحدة" };
  const cycleLabel = CYCLE_LABELS[entry.billingCycle] ?? entry.billingCycle;

  if (!editing) {
    return (
      <div style={{ padding: "0.75rem 1rem", borderRadius: 8, background: "var(--color-bg-secondary, #f9fafb)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{formatPrice(entry.priceAmount, entry.currencyCode)}</span>
          <span className="badge badge-gray">{cycleLabel}</span>
          {entry.isActive ? <span className="badge badge-green">نشط</span> : <span className="badge badge-red">معطل</span>}
          {entry.isPublic ? <span className="badge badge-blue">عام</span> : <span className="badge badge-gray">خاص</span>}
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button className="btn" style={{ padding: "0.25rem 0.7rem", fontSize: "0.8rem" }} onClick={() => setEditing(true)}>تعديل</button>
          <button className="btn" style={{ padding: "0.25rem 0.7rem", fontSize: "0.8rem", color: "var(--color-error)", borderColor: "var(--color-error)" }} onClick={handleDelete} disabled={deleting}>{deleting ? "..." : "حذف"}</button>
        </div>
        {error && <p style={{ color: "var(--color-error)", fontSize: "0.82rem", width: "100%", margin: 0 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", borderRadius: 8, border: "1.5px solid var(--color-primary)", background: "var(--color-bg-secondary, #f9fafb)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div>
          <label style={labelStyle}>دورة الفوترة</label>
          <select value={cycle} onChange={e => setCycle(e.target.value)} style={selectStyle}>
            {planBillingType !== "one_time_fixed_term" && <option value="Monthly">شهري</option>}
            {planBillingType !== "one_time_fixed_term" && <option value="Yearly">سنوي</option>}
            {planBillingType === "one_time_fixed_term" && <option value="OneTime">مرة واحدة</option>}
          </select>
        </div>
        <div>
          <label style={labelStyle}>السعر</label>
          <input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>العملة</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} style={selectStyle} required>
            {CURRENCY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>نشط</label>
          <ToggleSwitch checked={isActive} onChange={setIsActive} disabled={saving} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>مرئي للعموم</label>
          <ToggleSwitch checked={isPublic} onChange={setIsPublic} disabled={saving} />
        </div>
      </div>
      {error && <p style={{ color: "var(--color-error)", fontSize: "0.82rem", marginBottom: "0.5rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ"}</button>
        <button className="btn" style={{ flex: 1 }} onClick={() => { setEditing(false); setError(""); }} disabled={saving}>إلغاء</button>
      </div>
    </div>
  );
}

interface AddPricingFormProps {
  planId: string;
  planBillingType: string;
  onCreated: (entry: AdminPlanPricingEntry) => void;
  onCancel: () => void;
}

function AddPricingForm({ planId, planBillingType, onCreated, onCancel }: AddPricingFormProps) {
  const defaultCycle = planBillingType === "one_time_fixed_term" ? "OneTime" : "Monthly";
  const [cycle, setCycle]         = useState(defaultCycle);
  const [price, setPrice]         = useState("0");
  const [currency, setCurrency]   = useState("SYP");
  const [isActive, setIsActive]   = useState(true);
  const [isPublic, setIsPublic]   = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const entry = await adminApi.createPlanPricing(planId, {
        billingCycle:  cycle,
        priceAmount:   parseFloat(price) || 0,
        currencyCode:  currency,
        isActive,
        isPublic,
      });
      onCreated(entry);
    } catch (e) { setError(normalizeError(e)); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ padding: "1rem", borderRadius: 8, border: "1.5px dashed var(--color-primary)", background: "var(--color-bg-secondary, #f9fafb)" }}>
      <p style={{ margin: "0 0 0.75rem", fontWeight: 600, fontSize: "0.9rem" }}>إضافة سعر جديد</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div>
          <label style={labelStyle}>دورة الفوترة</label>
          <select value={cycle} onChange={e => setCycle(e.target.value)} style={selectStyle}>
            {planBillingType !== "one_time_fixed_term" && <option value="Monthly">شهري</option>}
            {planBillingType !== "one_time_fixed_term" && <option value="Yearly">سنوي</option>}
            {planBillingType === "one_time_fixed_term" && <option value="OneTime">مرة واحدة</option>}
          </select>
        </div>
        <div>
          <label style={labelStyle}>السعر</label>
          <input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>العملة</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} style={selectStyle} required>
            {CURRENCY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>نشط</label>
          <ToggleSwitch checked={isActive} onChange={setIsActive} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>مرئي للعموم</label>
          <ToggleSwitch checked={isPublic} onChange={setIsPublic} />
        </div>
      </div>
      {error && <p style={{ color: "var(--color-error)", fontSize: "0.82rem", marginBottom: "0.5rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>{saving ? "جاري الإضافة..." : "إضافة"}</button>
        <button className="btn" style={{ flex: 1 }} onClick={onCancel} disabled={saving}>إلغاء</button>
      </div>
    </div>
  );
}

// ── SectionCard ────────────────────────────────────────────────────────────────

function SectionCard({
  title, icon, children, accent,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      marginBottom: "1rem",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        padding: "0.7rem 1.1rem",
        background: accent ? accent + "08" : "#f8fafc",
        borderBottom: "1px solid #e5e7eb",
      }}>
        <span style={{ fontSize: "1rem" }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" }}>{title}</span>
      </div>
      <div style={{ padding: "1rem 1.1rem" }}>
        {children}
      </div>
    </div>
  );
}

// ── CollapsibleSection ─────────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  count,
  accent,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: string;
  count?: number;
  accent?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 10, marginBottom: "0.75rem", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 1rem",
          background: open ? "#f0f7ff" : "#f8fafc",
          border: "none",
          borderBottom: open ? "1px solid var(--color-border, #e5e7eb)" : "none",
          cursor: "pointer",
          fontSize: "0.82rem",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          transition: "background 0.15s",
        }}
      >
        <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {open ? "▲" : "▼"}
          {count !== undefined && (
            <span style={{ background: accent ?? "var(--color-primary, #2563eb)", color: "#fff", borderRadius: 20, padding: "0 0.45rem", fontSize: "0.68rem", fontWeight: 700, lineHeight: "1.5" }}>
              {count}
            </span>
          )}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span>{title}</span>
          <span style={{ fontSize: "1rem" }}>{icon}</span>
        </span>
      </button>
      {open && (
        <div style={{ padding: "1rem" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── getPlanVisibleName ────────────────────────────────────────────────────────
//
// Single source of truth for user-facing plan name.
// Always prefer displayNameAr in Arabic UI, with displayNameEn as fallback,
// and internal `name` as last resort. NEVER expose internal name directly.

function getPlanVisibleName(
  displayNameAr: string,
  displayNameEn: string,
  internalName: string,
  locale: "ar" | "en" = "ar",
): string {
  if (locale === "ar") {
    return displayNameAr.trim() || displayNameEn.trim() || internalName.trim() || "";
  }
  return displayNameEn.trim() || displayNameAr.trim() || internalName.trim() || "";
}

// ── PlanPreviewCard ─────────────────────────────────────────────────────────────

function PlanPreviewCard({
  displayNameAr,
  displayNameEn,
  internalName,
  badgeText,
  planColor,
  isRecommended,
  basePriceMonthly,
  enabledFeatures,
  limits,
}: {
  displayNameAr: string;
  displayNameEn: string;
  internalName: string;
  badgeText: string;
  planColor: string;
  isRecommended: boolean;
  basePriceMonthly: string;
  enabledFeatures: PlanFeatureItem[];
  limits?: PlanLimitItem[];
}) {
  const visibleName = getPlanVisibleName(displayNameAr, displayNameEn, internalName);
  const accent = planColor.trim() || "#2e7d32";
  const price  = parseFloat(basePriceMonthly);

  // Limit helpers
  const lv = (key: string) => limits?.find(l => l.key === key)?.value ?? 0;
  const lbl = (val: number, unit: string) => val === 0 ? null : val === -1 ? `∞ ${unit}` : `${val} ${unit}`;

  const listingChip  = lbl(lv("max_active_listings"),     "إعلان");
  const imagesChip   = lbl(lv("max_images_per_listing"),  "صورة");
  const featuredChip = lbl(lv("max_featured_slots"),       "مميز");
  const agentsChip   = lbl(lv("max_agents"),               "وسيط");
  const limitsChips  = [listingChip, imagesChip, agentsChip, featuredChip].filter(Boolean) as string[];

  // Show ALL features with ✔ / ✗
  const allFeatures = enabledFeatures.slice(0, 8);

  return (
    <div style={{ border: `2px solid ${accent}`, borderRadius: 14, padding: "1.25rem", background: "#fff", maxWidth: 270, margin: "0 auto", position: "relative", fontFamily: "inherit" }}>
      {isRecommended && (
        <div style={{ position: "absolute", top: -14, right: 16, background: accent, color: "#fff", padding: "0.2rem 0.8rem", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
          ⭐ موصى بها
        </div>
      )}
      {badgeText.trim() && (
        <div style={{ background: accent + "22", color: accent, padding: "0.2rem 0.65rem", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, display: "inline-block", marginBottom: "0.5rem" }}>
          {badgeText}
        </div>
      )}
      <h3 style={{ margin: "0 0 0.2rem", fontSize: "1.1rem", fontWeight: 800 }}>{visibleName || "اسم الباقة"}</h3>
      <p style={{ margin: "0 0 0.6rem", fontSize: "1.25rem", fontWeight: 800, color: accent }}>
        {price === 0 ? "مجاني" : `${price.toLocaleString("ar-SY")} ل.س / شهر`}
      </p>

      {/* ── Limit chips ── */}
      {limitsChips.length > 0 && (
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {limitsChips.map(chip => (
            <span key={chip} style={{ background: accent + "18", color: accent, borderRadius: 20, padding: "0.15rem 0.6rem", fontSize: "0.72rem", fontWeight: 700 }}>
              {chip}
            </span>
          ))}
        </div>
      )}

      {/* ── Features with ✔ / ✗ ── */}
      {allFeatures.length > 0 ? (
        <ul style={{ margin: "0 0 0.8rem", padding: 0, listStyle: "none" }}>
          {allFeatures.map(f => (
            <li key={f.key} style={{ fontSize: "0.8rem", padding: "0.2rem 0", display: "flex", gap: "0.45rem", alignItems: "center", color: f.isEnabled ? "#1e293b" : "#94a3b8" }}>
              <span style={{ fontWeight: 700, fontSize: "0.75rem", flexShrink: 0, color: f.isEnabled ? "#059669" : "#cbd5e1" }}>
                {f.isEnabled ? "✔" : "✗"}
              </span>
              <span style={{ textDecoration: f.isEnabled ? "none" : "none" }}>{f.icon ? `${f.icon} ` : ""}{f.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: "0.8rem", color: "#bbb", marginBottom: "0.8rem" }}>لا توجد ميزات مضافة بعد</p>
      )}

      <div style={{ background: accent, color: "#fff", borderRadius: 8, padding: "0.5rem", textAlign: "center", fontSize: "0.82rem", fontWeight: 600 }}>
        اشترك الآن
      </div>
    </div>
  );
}

// ── PlanComparisonTable ─────────────────────────────────────────────────────────

function limitCell(val: number) {
  if (val === 0) return { text: "✗", color: "#cbd5e1", weight: 400 };
  if (val === -1) return { text: "∞", color: "#059669", weight: 700 };
  return { text: String(val), color: "#1e293b", weight: 600 };
}

function boolCell(v: boolean) {
  return v
    ? { text: "✔", color: "#059669", weight: 700 }
    : { text: "✗", color: "#cbd5e1", weight: 400 };
}

function PlanComparisonTable({ plans }: { plans: AdminPlanSummary[] }) {
  const active = plans.filter(p => p.isActive && p.isPublic).sort((a, b) => a.displayOrder - b.displayOrder);
  if (active.length === 0) return null;

  type Row = { label: string; icon: string; cell: (p: AdminPlanSummary) => { text: string; color: string; weight: number } };
  const ROWS: Row[] = [
    { label: "الإعلانات النشطة",     icon: "🏠", cell: p => limitCell(p.listingsLimit) },
    { label: "صور لكل إعلان",        icon: "📸", cell: p => limitCell(p.imagesPerListing) },
    { label: "الوسطاء",               icon: "👤", cell: p => limitCell(p.agentsLimit) },
    { label: "المشاريع",              icon: "🏗", cell: p => limitCell(p.projectsLimit) },
    { label: "إعلانات مميزة (Boost)", icon: "⭐", cell: p => limitCell(p.featuredSlots) },
    { label: "لوحة التحليلات",        icon: "📊", cell: p => boolCell(p.hasAnalytics) },
    { label: "الإعلانات المميزة",     icon: "✨", cell: p => boolCell(p.hasFeaturedListings) },
    { label: "إدارة المشاريع",        icon: "🏗", cell: p => boolCell(p.hasProjectMgmt) },
    { label: "تواصل واتساب",         icon: "💬", cell: p => boolCell(p.hasWhatsApp) },
    { label: "شارة موثق",            icon: "✅", cell: p => boolCell(p.hasVerifiedBadge) },
    { label: "دعم فني أولوية",       icon: "🛠", cell: p => boolCell(p.hasPrioritySupport) },
  ];

  const thBase: React.CSSProperties = { padding: "0.55rem 0.85rem", fontWeight: 700, fontSize: "0.78rem", color: "#475569", borderBottom: "2px solid #e2e8f0", textAlign: "center", whiteSpace: "nowrap" };
  const tdLabel: React.CSSProperties = { padding: "0.5rem 0.85rem", fontSize: "0.82rem", color: "#334155", borderBottom: "1px solid #f1f5f9", textAlign: "right", whiteSpace: "nowrap" };
  const tdCell: React.CSSProperties = { padding: "0.5rem 0.85rem", textAlign: "center", borderBottom: "1px solid #f1f5f9" };

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8ecf0", borderRadius: 14, overflow: "hidden", marginTop: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "0.9rem 1.1rem", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>مقارنة الخطط</span>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginRight: "0.6rem" }}>الخطط العامة النشطة فقط</span>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc" }}>
              <th style={{ ...thBase, textAlign: "right", minWidth: 160 }}>المزايا والحدود</th>
              {active.map(p => (
                <th key={p.id} style={{ ...thBase, minWidth: 110 }}>
                  {p.planColor && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: p.planColor, marginLeft: "0.3rem", verticalAlign: "middle" }} />}
                  {p.name}
                  {p.isRecommended && <div style={{ fontSize: "0.62rem", color: "#d97706", fontWeight: 700 }}>⭐ موصى بها</div>}
                  <div style={{ fontSize: "0.7rem", color: p.planColor || "#2563eb", fontWeight: 700, marginTop: "0.1rem" }}>
                    {p.basePriceMonthly === 0 ? "مجاني" : `${p.basePriceMonthly.toLocaleString("ar-SY")} ل.س`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                <td style={tdLabel}>
                  <span style={{ marginLeft: "0.35rem" }}>{row.icon}</span>{row.label}
                </td>
                {active.map(p => {
                  const c = row.cell(p);
                  return (
                    <td key={p.id} style={tdCell}>
                      <span style={{ fontWeight: c.weight, color: c.color, fontSize: c.text === "✔" || c.text === "✗" ? "1rem" : "0.88rem" }}>
                        {c.text}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── EditPlanModal ──────────────────────────────────────────────────────────────

interface EditModalProps {
  plan: AdminPlanDetail | null;
  onClose: () => void;
  onSaved: (updated: AdminPlanDetail) => void;
}

function EditPlanModal({ plan, onClose, onSaved }: EditModalProps) {
  const isNew = plan === null;

  const [name, setName]                           = useState(plan?.name ?? "");
  const [description, setDescription]             = useState(plan?.description ?? "");
  const [applicableAccountType, setApplicableAccountType] = useState(plan?.applicableAccountType ?? "");
  const [priceMonthly, setPriceMonthly]           = useState(String(plan?.basePriceMonthly ?? 0));
  const [priceYearly, setPriceYearly]             = useState(String(plan?.basePriceYearly ?? 0));
  const [isActive, setIsActive]                   = useState(plan?.isActive ?? true);
  const [isPublic, setIsPublic]                   = useState(plan?.isPublic ?? true);
  const [isRecommended, setIsRecommended]         = useState(plan?.isRecommended ?? false);
  const [displayOrder, setDisplayOrder]           = useState(String(plan?.displayOrder ?? 0));
  const [billingMode, setBillingMode]             = useState(plan?.billingMode ?? "InternalOnly");
  const [planBillingType, setPlanBillingType]     = useState(plan?.planBillingType ?? "recurring");
  const [recurringCycle, setRecurringCycle]       = useState(plan?.recurringCycle ?? "monthly");
  const [durationDays, setDurationDays]           = useState(String(plan?.durationDays ?? ""));
  const [consumptionPolicy, setConsumptionPolicy] = useState(plan?.consumptionPolicy ?? "none");
  const [expiryRule, setExpiryRule]               = useState(plan?.expiryRule ?? "expire_by_date");
  const [downgradePlanCode, setDowngradePlanCode] = useState(plan?.downgradePlanCode ?? "");
  const [displayNameAr, setDisplayNameAr]         = useState(plan?.displayNameAr ?? "");
  const [displayNameEn, setDisplayNameEn]         = useState(plan?.displayNameEn ?? "");
  const [audienceType, setAudienceType]           = useState(plan?.audienceType ?? "");
  const [tier, setTier]                           = useState(plan?.tier ?? "");
  const [badgeText, setBadgeText]                 = useState(plan?.badgeText ?? "");
  const [planColor, setPlanColor]                 = useState(plan?.planColor ?? "");

  // Auto-derive applicableAccountType from audienceType (audience is single source of truth)
  useEffect(() => {
    const derived = audienceToAccountType(audienceType);
    if (derived) setApplicableAccountType(derived);
  }, [audienceType]);

  const [limits, setLimits]     = useState<PlanLimitItem[]>(plan?.limits ?? []);
  const [features, setFeatures] = useState<PlanFeatureItem[]>(
    () => normalizeFeatures(plan?.features ?? [])
  );

  // ── Trial ──────────────────────────────────────────────────────────────────
  const [hasTrial, setHasTrial]                           = useState(plan?.hasTrial ?? false);
  const [trialDays, setTrialDays]                         = useState(String(plan?.trialDays ?? 0));
  const [requiresPaymentForTrial, setRequiresPaymentForTrial] = useState(plan?.requiresPaymentForTrial ?? false);

  // ── Business Rules ─────────────────────────────────────────────────────────
  const [isDefaultForNewUsers, setIsDefaultForNewUsers]   = useState(plan?.isDefaultForNewUsers ?? false);
  const [availableForSelfSignup, setAvailableForSelfSignup] = useState(plan?.availableForSelfSignup ?? true);
  const [requiresAdminApproval, setRequiresAdminApproval] = useState(plan?.requiresAdminApproval ?? false);
  const [allowAddOns, setAllowAddOns]                     = useState(plan?.allowAddOns ?? false);
  const [allowUpgrade, setAllowUpgrade]                   = useState(plan?.allowUpgrade ?? true);
  const [allowDowngrade, setAllowDowngrade]               = useState(plan?.allowDowngrade ?? true);
  const [autoDowngradeOnExpiry, setAutoDowngradeOnExpiry] = useState(plan?.autoDowngradeOnExpiry ?? true);
  const [allowRepurchaseOnConsumption, setAllowRepurchaseOnConsumption]     = useState(plan?.allowRepurchaseOnConsumption ?? false);
  const [allowEarlyRenewalOnConsumption, setAllowEarlyRenewalOnConsumption] = useState(plan?.allowEarlyRenewalOnConsumption ?? false);

  const [pricing, setPricing]               = useState<AdminPlanPricingEntry[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [showAddPricing, setShowAddPricing] = useState(false);

  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");
  const [featureSaving, setFeatureSaving] = useState<string | null>(null);
  const [saveStatus, setSaveStatus]       = useState<"idle" | "dirty" | "saving" | "saved">("idle");
  const [limitValues, setLimitValues]     = useState<Record<string, string>>(
    () => normalizeLimitValues(
      Object.fromEntries((plan?.limits ?? []).map(l => [l.key, String(l.value)]))
    )
  );
  // Stores limit values before a simulated-toggle turns them OFF (so we can restore on re-enable)
  const [prevLimitValues, setPrevLimitValues] = useState<Record<string, string>>({});

  const initialSnapshot = useRef<string>("");
  const initialFeaturesRef = useRef<PlanFeatureItem[]>(plan?.features ?? []);
  const formRef = useRef<HTMLFormElement>(null);

  const formSnapshot = JSON.stringify({
    name, description, applicableAccountType, priceMonthly, priceYearly,
    isActive, isPublic, isRecommended, displayOrder, billingMode, planBillingType,
    recurringCycle, durationDays, consumptionPolicy, expiryRule, downgradePlanCode,
    displayNameAr, displayNameEn, audienceType, tier, badgeText, planColor,
    hasTrial, trialDays, requiresPaymentForTrial, isDefaultForNewUsers,
    availableForSelfSignup, requiresAdminApproval, allowAddOns, allowUpgrade,
    allowDowngrade, autoDowngradeOnExpiry, allowRepurchaseOnConsumption,
    allowEarlyRenewalOnConsumption,
    limitValues,
    featureEnabledKeys: features.filter(f => f.isEnabled).map(f => f.key).sort().join(","),
  });

  // eslint-disable-next-line react-hooks/refs
  const isDirty = formSnapshot !== initialSnapshot.current;

  useEffect(() => {
    if (!isNew && plan?.id) {
      setPricingLoading(true);
      adminApi.getPlanPricing(plan.id)
        .then(setPricing)
        .catch(() => {})
        .finally(() => setPricingLoading(false));
    }
    initialSnapshot.current = formSnapshot;
    initialFeaturesRef.current = plan?.features ?? [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doSave() {
    console.log("[plans] ▶ doSave ENTERED", new Error("doSave call site").stack);
    if (!plan?.id || saving) return;
    setSaving(true); setSaveStatus("saving"); setError("");
    try {
      console.log("[plans] API CALL: updatePlan →", plan.id);
      const result = await adminApi.updatePlan(plan.id, {
        name:                   name.trim(),
        description:            description.trim() || undefined,
        basePriceMonthly:       parseFloat(priceMonthly) || 0,
        basePriceYearly:        parseFloat(priceYearly)  || 0,
        isActive,
        applicableAccountType:  applicableAccountType || undefined,
        displayOrder:           parseInt(displayOrder) || 0,
        isPublic,
        isRecommended,
        planCategory:           audienceToPlanCategory(audienceType) || undefined,
        displayNameAr:          displayNameAr.trim() || undefined,
        displayNameEn:          displayNameEn.trim() || undefined,
        audienceType:           audienceType || undefined,
        tier:                   tier || undefined,
        billingMode,
        planBillingType,
        recurringCycle:         planBillingType === "recurring" ? (recurringCycle || undefined) : undefined,
        durationDays:           planBillingType === "one_time_fixed_term" ? (parseInt(durationDays) || undefined) : undefined,
        consumptionPolicy:      planBillingType === "one_time_fixed_term" ? consumptionPolicy : "none",
        expiryRule:             planBillingType === "one_time_fixed_term" ? expiryRule : "expire_by_date",
        downgradePlanCode:      downgradePlanCode.trim() || undefined,
        badgeText:              badgeText.trim() || undefined,
        planColor:              planColor.trim() || undefined,
        hasTrial,
        trialDays:               hasTrial ? (parseInt(trialDays) || 0) : 0,
        requiresPaymentForTrial: hasTrial ? requiresPaymentForTrial : false,
        isDefaultForNewUsers,
        availableForSelfSignup,
        requiresAdminApproval,
        allowAddOns,
        allowUpgrade,
        allowDowngrade,
        autoDowngradeOnExpiry,
        allowRepurchaseOnConsumption,
        allowEarlyRenewalOnConsumption,
      });
      const updatedLimits = [...result.limits];

      // ── STEP 1: build validated payload ────────────────────────────────────
      // Only send keys that:
      //  a) Are in VALID_LIMIT_KEYS (backend supports them — unknown keys 404)
      //  b) Are not alias keys (only canonical keys reach the API)
      //  c) Actually changed vs the server value, OR are new non-zero values
      const changedLimits = Object.entries(limitValues).filter(([key, val]) => {
        if (!VALID_LIMIT_KEYS.has(key)) return false; // key not in backend catalog
        if (isAliasKey(key)) return false;             // never send an alias
        const parsedVal = parseInt(val, 10);
        if (isNaN(parsedVal)) return false;
        const original = result.limits.find(l => l.key === key);
        if (original) return val !== String(original.value); // existing → only if changed
        return parsedVal !== 0; // new → only if non-zero
      });

      // ── STEP 2: sequential save — one failure must NOT block snapshot update ─
      for (const [key, rawVal] of changedLimits) {
        const val = parseInt(rawVal, 10);
        try {
          console.log("[plans] API CALL: setPlanLimit →", key, "=", val);
          const updated = await adminApi.setPlanLimit(plan!.id, key, val);
          const idx = updatedLimits.findIndex(l => l.key === key);
          if (idx >= 0) updatedLimits[idx] = updated;
          else updatedLimits.push(updated);
        } catch (limErr) {
          // Backend does not support this limit key — skip silently.
          // The snapshot will still be updated so the UI clears "unsaved changes".
          console.warn(`[plans] Limit "${key}" not accepted by backend — skipping.`, limErr);
        }
      }

      // ── STEP 3: rebuild clean limit state from server ────────────────────────
      // normalizeLimitValues promotes any alias keys the server may have returned
      // (e.g. max_images → max_images_per_listing) so the sim cards read correctly.
      const newLimitValues = normalizeLimitValues(
        Object.fromEntries(updatedLimits.map(l => [l.key, String(l.value)]))
      );

      // ── STEP 4: save feature toggles that changed vs initial server state ────
      // Features were edited locally (no API call on toggle); we now flush them.
      const origFeats = initialFeaturesRef.current;
      const updatedFeatures = [...features];
      for (const feat of features) {
        const orig = origFeats.find(f => f.key === feat.key);
        const changed = orig ? orig.isEnabled !== feat.isEnabled : feat.isEnabled;
        if (!changed) continue;
        try {
          setFeatureSaving(feat.key);
          console.log("[plans] API CALL: setPlanFeature →", feat.key, "=", feat.isEnabled);
          const serverFeat = await adminApi.setPlanFeature(plan!.id, feat.key, feat.isEnabled);
          const idx = updatedFeatures.findIndex(f => f.key === feat.key);
          if (idx >= 0) updatedFeatures[idx] = serverFeat;
        } catch (featErr) {
          console.warn(`[plans] Feature "${feat.key}" save failed`, featErr);
        }
      }
      setFeatureSaving(null);

      setLimits(updatedLimits);
      setLimitValues(newLimitValues);
      setFeatures(updatedFeatures);
      initialFeaturesRef.current = updatedFeatures;
      onSaved({ ...result, limits: updatedLimits });

      // ── STEP 5: store snapshot matching the NEXT render exactly ─────────────
      // Uses newLimitValues + updatedFeatures so formSnapshot === initialSnapshot
      // after re-render → isDirty = false → "unsaved changes" disappears ALWAYS.
      initialSnapshot.current = JSON.stringify({
        name, description, applicableAccountType, priceMonthly, priceYearly,
        isActive, isPublic, isRecommended, displayOrder, billingMode, planBillingType,
        recurringCycle, durationDays, consumptionPolicy, expiryRule, downgradePlanCode,
        displayNameAr, displayNameEn, audienceType, tier, badgeText, planColor,
        hasTrial, trialDays, requiresPaymentForTrial, isDefaultForNewUsers,
        availableForSelfSignup, requiresAdminApproval, allowAddOns, allowUpgrade,
        allowDowngrade, autoDowngradeOnExpiry, allowRepurchaseOnConsumption,
        allowEarlyRenewalOnConsumption,
        limitValues: newLimitValues,
        featureEnabledKeys: updatedFeatures.filter(f => f.isEnabled).map(f => f.key).sort().join(","),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (e) {
      setError(normalizeError(e));
      setSaveStatus("dirty");
    } finally {
      setSaving(false);
    }
  }

  function handleCloseModal() {
    if (isDirty) {
      if (!window.confirm("لديك تغييرات غير محفوظة، هل تريد الخروج؟")) return;
    }
    onClose();
  }

  useEffect(() => {
    console.log("[plans] useEffect:formSnapshot isDirty=", isDirty, "saveStatus=", saveStatus, "— NO SAVE TRIGGERED");
    if (!isNew && isDirty && saveStatus !== "saving" && saveStatus !== "saved") {
      setSaveStatus("dirty");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formSnapshot]);

  async function doCreate() {
    console.log("[plans] ▶ doCreate ENTERED");
    if (saving) return;
    setSaving(true); setSaveStatus("saving"); setError("");
    try {
      const result = await adminApi.createPlan({
        name:                   name.trim(),
        displayNameAr:          displayNameAr.trim() || undefined,
        displayNameEn:          displayNameEn.trim() || undefined,
        audienceType:           audienceType || undefined,
        tier:                   tier || undefined,
        description:            description.trim() || undefined,
        basePriceMonthly:       parseFloat(priceMonthly) || 0,
        basePriceYearly:        parseFloat(priceYearly)  || 0,
        applicableAccountType:  applicableAccountType || undefined,
        planCategory:           audienceToPlanCategory(audienceType) || undefined,
        displayOrder:           parseInt(displayOrder) || 0,
        billingMode,
        planBillingType,
        recurringCycle:         planBillingType === "recurring" ? (recurringCycle || undefined) : undefined,
        durationDays:           planBillingType === "one_time_fixed_term" ? (parseInt(durationDays) || undefined) : undefined,
        consumptionPolicy:      planBillingType === "one_time_fixed_term" ? consumptionPolicy : "none",
        expiryRule:             planBillingType === "one_time_fixed_term" ? expiryRule : "expire_by_date",
        downgradePlanCode:      downgradePlanCode.trim() || undefined,
        badgeText:              badgeText.trim() || undefined,
        planColor:              planColor.trim() || undefined,
        hasTrial,
        trialDays:              hasTrial ? (parseInt(trialDays) || 0) : 0,
        requiresPaymentForTrial: hasTrial ? requiresPaymentForTrial : false,
        isDefaultForNewUsers,
        availableForSelfSignup,
        requiresAdminApproval,
        allowAddOns,
        allowUpgrade,
        allowDowngrade,
        autoDowngradeOnExpiry,
        allowRepurchaseOnConsumption,
        allowEarlyRenewalOnConsumption,
      });
      setLimits(result.limits);
      setFeatures(normalizeFeatures(result.features));
      onSaved(result);
      onClose();
    } catch (e) {
      setError(normalizeError(e));
      setSaveStatus("dirty");
    } finally {
      setSaving(false);
    }
  }

  function handleLimitChange(key: string, rawVal: string) {
    const parsed = parseInt(rawVal, 10);
    const safe = isNaN(parsed) ? "0" : String(Math.max(-1, parsed));
    setLimitValues(prev => ({ ...prev, [key]: rawVal === "-1" ? "-1" : rawVal === "" ? "" : safe }));
  }

  function handleSimToggle(limitKey: string, enabled: boolean) {
    if (!enabled) {
      setPrevLimitValues(prev => ({ ...prev, [limitKey]: limitValues[limitKey] ?? "0" }));
      setLimitValues(prev => ({ ...prev, [limitKey]: "0" }));
    } else {
      const restored = prevLimitValues[limitKey];
      setLimitValues(prev => ({
        ...prev,
        [limitKey]: restored && restored !== "0" ? restored : "1",
      }));
    }
  }

  function handleFeatureLimitToggle(fk: string, limitKey: string, val: boolean) {
    console.log("[plans] handleFeatureLimitToggle — LOCAL ONLY (no API)", fk, val);
    handleFeatureToggle(fk, val);
    if (!val) {
      setLimitValues(prev => ({ ...prev, [limitKey]: "0" }));
    } else {
      const original = limits.find(l => l.key === limitKey);
      if (original && original.value > 0) {
        setLimitValues(prev => ({ ...prev, [limitKey]: String(original.value) }));
      }
    }
  }

  function handleFeatureToggle(key: string, newVal: boolean) {
    console.log("[plans] handleFeatureToggle — LOCAL ONLY (no API)", key, newVal);
    setFeatures(prev => prev.map(f => f.key === key ? { ...f, isEnabled: newVal } : f));
  }

  const featureGroups = features.reduce<Record<string, PlanFeatureItem[]>>((acc, feat) => {
    const grp = featureGroupLabel(feat.featureGroup);
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(feat);
    return acc;
  }, {});

  const enabledCount = features.filter(f => f.isEnabled).length;

  // ── Derived helpers for summary bar ────────────────────────────────────────
  const summaryPriceLabel = (() => {
    if (planBillingType === "free_default") return "🎁 مجاني";
    const p = parseFloat(priceMonthly) || 0;
    if (planBillingType === "one_time_fixed_term") return p ? `💳 ${p.toLocaleString("ar-SY")} ل.س` : "💳 —";
    return p ? `🔄 ${p.toLocaleString("ar-SY")} ل.س/شهر` : "🔄 —";
  })();
  const summaryListings = limitValues["max_active_listings"];
  const summaryListingsLabel = summaryListings === "-1" ? "∞ إعلان" : summaryListings ? `${summaryListings} إعلان` : null;

  const modalContent = (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 3000, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={(e) => e.target === e.currentTarget && handleCloseModal()}
    >
      <div style={{ backgroundColor: "#ffffff", borderRadius: 14, width: "100%", maxWidth: 800, maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", overflow: "hidden" }}>

        {/* ── Sticky Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.4rem", borderBottom: "1px solid #e5e7eb", flexShrink: 0, backgroundColor: "#ffffff" }}>
          <button
            onClick={handleCloseModal}
            style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, color: "#94a3b8", padding: "0.15rem 0.5rem", borderRadius: 6 }}
          >
            ×
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.15rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1e293b" }}>
              {isNew ? "✦ إنشاء خطة جديدة" : `تعديل: ${getPlanVisibleName(displayNameAr, displayNameEn, plan!.name)}`}
            </h2>
            {!isNew && isDirty && (
              <span style={{ fontSize: "0.7rem", color: "#b45309", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#b45309", display: "inline-block" }} />
                لديك تغييرات غير محفوظة
              </span>
            )}
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "1.1rem 1.25rem" }}>

          {/* ── Summary Bar ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap",
            padding: "0.65rem 1rem", marginBottom: "1rem",
            background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10,
          }}>
            <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, flexShrink: 0 }}>ملخص</span>
            <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1e293b", flexShrink: 0 }}>
              {displayNameAr || displayNameEn || name || "—"}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#475569", padding: "0.1rem 0.55rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, flexShrink: 0 }}>
              {summaryPriceLabel}
            </span>
            {summaryListingsLabel && (
              <span style={{ fontSize: "0.72rem", color: "#475569", padding: "0.1rem 0.55rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, flexShrink: 0 }}>
                🏠 {summaryListingsLabel}
              </span>
            )}
            {audienceType && (
              <span style={{ fontSize: "0.72rem", padding: "0.1rem 0.55rem", background: (AUDIENCE_BG[audienceType] ?? "#475569") + "18", color: AUDIENCE_BG[audienceType] ?? "#475569", border: `1px solid ${(AUDIENCE_BG[audienceType] ?? "#475569")}33`, borderRadius: 20, flexShrink: 0 }}>
                {AUDIENCE_AR_LABEL[audienceType] ?? audienceType}
              </span>
            )}
            {tier && (
              <span style={{ fontSize: "0.72rem", padding: "0.1rem 0.55rem", background: (TIER_BG[tier] ?? "#374151") + "18", color: TIER_BG[tier] ?? "#374151", border: `1px solid ${(TIER_BG[tier] ?? "#374151")}33`, borderRadius: 20, flexShrink: 0 }}>
                {TIER_AR_LABEL[tier] ?? tier}
              </span>
            )}
          </div>

          {error && (
            <div style={{ background: "#fef2f2", color: "var(--color-error)", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.88rem" }}>
              {error}
            </div>
          )}

          <form
            ref={formRef}
            onSubmit={e => e.preventDefault()}
            onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
          >

            {/* ═══════════════════════════════════════════════
                1. المعلومات الأساسية
            ═══════════════════════════════════════════════ */}
            <SectionCard title="المعلومات الأساسية" icon="📋">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>

                {/* Row: internal name full width */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>اسم الخطة الداخلي *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="مثال: owner_advanced" />
                </div>

                {/* Row: Arabic + English display names */}
                <div>
                  <label style={labelStyle}>الاسم العربي للعرض</label>
                  <input value={displayNameAr} onChange={e => setDisplayNameAr(e.target.value)} style={inputStyle} placeholder="مثال: متقدم للمالك" maxLength={120} />
                </div>
                <div>
                  <label style={labelStyle}>الاسم الإنجليزي للعرض</label>
                  <input value={displayNameEn} onChange={e => setDisplayNameEn(e.target.value)} style={inputStyle} placeholder="e.g. Owner Advanced" maxLength={120} dir="ltr" />
                </div>

                {/* Row: description full width */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>الوصف</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 62, resize: "vertical" }} placeholder="وصف مختصر يظهر للمستخدم..." />
                </div>

                {/* Row: audience + tier */}
                <div>
                  <label style={labelStyle}>الجمهور المستهدف</label>
                  <select value={audienceType} onChange={e => setAudienceType(e.target.value)} style={selectStyle}>
                    <option value="">— بدون تحديد —</option>
                    <option value="seeker">🔍 باحث (seeker)</option>
                    <option value="owner">🏠 مالك (owner)</option>
                    <option value="broker">🤝 وسيط (broker)</option>
                    <option value="office">🏢 مكتب (office)</option>
                    <option value="company">🏗 شركة (company)</option>
                  </select>
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.25rem", display: "block" }}>
                    حدد لمن هذه الخطة (مالك، مكتب، شركة...)
                  </span>
                </div>
                <div>
                  <label style={labelStyle}>المستوى (Tier)</label>
                  <select value={tier} onChange={e => setTier(e.target.value)} style={selectStyle}>
                    <option value="">— بدون تحديد —</option>
                    <option value="free">مجاني</option>
                    <option value="basic">أساسي</option>
                    <option value="advanced">متقدم</option>
                    <option value="enterprise">مؤسسي</option>
                  </select>
                </div>

                {/* Row: badge + color */}
                <div>
                  <label style={labelStyle}>نص الشارة (Badge)</label>
                  <input value={badgeText} onChange={e => setBadgeText(e.target.value)} style={inputStyle} placeholder="مثال: الأكثر مبيعاً" maxLength={80} />
                </div>
                <div>
                  <label style={labelStyle}>لون الخطة</label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input type="color" value={planColor || "#2e7d32"} onChange={e => setPlanColor(e.target.value)} style={{ width: 40, height: 34, borderRadius: 6, border: "1.5px solid #e5e7eb", cursor: "pointer", padding: 2, flexShrink: 0 }} />
                    <input value={planColor} onChange={e => setPlanColor(e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="#2e7d32" maxLength={20} />
                  </div>
                </div>

                {/* Row: display order */}
                <div>
                  <label style={labelStyle}>ترتيب العرض</label>
                  <input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} style={inputStyle} min={0} />
                </div>
              </div>
            </SectionCard>

            {/* ═══════════════════════════════════════════════
                2. التسعير
            ═══════════════════════════════════════════════ */}
            <SectionCard title="التسعير" icon="💰">

              {/* Plan Type 3-way selector */}
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>نوع الخطة</p>
              <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                {([
                  { val: "free_default",        icon: "🎁", label: "مجاني تماماً",    desc: "بدون دفع" },
                  { val: "one_time_fixed_term",  icon: "💳", label: "دفعة واحدة",     desc: "شراء مرة" },
                  { val: "recurring",            icon: "🔄", label: "اشتراك دوري",    desc: "شهري / سنوي" },
                ] as { val: string; icon: string; label: string; desc: string }[]).map(opt => {
                  const active = planBillingType === opt.val;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      disabled={saving}
                      onClick={() => setPlanBillingType(opt.val)}
                      style={{
                        flex: 1, minWidth: 110, padding: "0.65rem 0.75rem",
                        borderRadius: 10,
                        border: active ? "2px solid #059669" : "1.5px solid #e2e8f0",
                        background: active ? "#f0fdf4" : "#f8fafc",
                        cursor: saving ? "default" : "pointer",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "1.2rem", marginBottom: "0.15rem" }}>{opt.icon}</div>
                      <div style={{ fontSize: "0.82rem", fontWeight: active ? 700 : 500, color: active ? "#065f46" : "#374151" }}>{opt.label}</div>
                      <div style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Free plan */}
              {planBillingType === "free_default" && (
                <div style={{ padding: "0.75rem 1rem", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>🎁 الخطة المجانية — لا تحتاج إلى تحديد سعر.</p>
                </div>
              )}

              {/* Pricing note — prices are managed exclusively in "Subscription Prices" section below */}
              {planBillingType !== "free_default" && (
                <div style={{ padding: "0.8rem 1rem", background: "#f0f9ff", borderRadius: 8, border: "1px solid #bae6fd", marginTop: "0.5rem" }}>
                  <p style={{ margin: 0, fontSize: "0.84rem", color: "#0369a1", fontWeight: 500 }}>
                    💡 أضف الأسعار بعملات متعددة (ل.س / دولار) من قسم <strong>«أسعار الاشتراك»</strong> أدناه — هو المصدر الوحيد للتسعير.
                  </p>
                </div>
              )}

              {/* Status & Visibility (existing plans only) */}
              {!isNew && (
                <div style={{ marginTop: "1.1rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
                  <p style={{ margin: "0 0 0.6rem", fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>الحالة والظهور</p>
                  <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ToggleSwitch checked={isActive} onChange={setIsActive} disabled={saving} />
                      <label style={{ ...labelStyle, marginBottom: 0 }}>نشطة</label>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ToggleSwitch checked={isPublic} onChange={setIsPublic} disabled={saving} />
                      <label style={{ ...labelStyle, marginBottom: 0 }}>مرئية للعموم</label>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ToggleSwitch checked={isRecommended} onChange={setIsRecommended} disabled={saving} />
                      <label style={{ ...labelStyle, marginBottom: 0 }}>موصى بها ⭐</label>
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* ═══════════════════════════════════════════════
                5. الإعدادات المتقدمة (مطوية افتراضياً)
            ═══════════════════════════════════════════════ */}
            <CollapsibleSection title="الإعدادات المتقدمة" icon="⚙️" defaultOpen={false}>

              {/* Billing mode */}
              {!isNew && (
                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>وضع الفوترة</label>
                  <select value={billingMode} onChange={e => setBillingMode(e.target.value)} style={selectStyle}>
                    <option value="InternalOnly">داخلي فقط (تحويل بنكي)</option>
                    <option value="StripeOnly">Stripe فقط</option>
                    <option value="Hybrid">هجين (داخلي + Stripe)</option>
                  </select>
                </div>
              )}

              {/* Lifecycle (one_time only) */}
              {planBillingType === "one_time_fixed_term" && (
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ margin: "0 0 0.6rem", fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>دورة الحياة</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                    <div>
                      <label style={labelStyle}>مدة الصلاحية (أيام)</label>
                      <input type="number" min={1} value={durationDays} onChange={e => setDurationDays(e.target.value)} style={inputStyle} placeholder="مثال: 90" disabled={saving} />
                    </div>
                    <div>
                      <label style={labelStyle}>سياسة الاستهلاك</label>
                      <select value={consumptionPolicy} onChange={e => setConsumptionPolicy(e.target.value)} style={selectStyle} disabled={saving}>
                        <option value="none">لا يوجد</option>
                        <option value="listing_quota">حصة إعلانات</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>قاعدة الانتهاء</label>
                      <select value={expiryRule} onChange={e => setExpiryRule(e.target.value)} style={selectStyle} disabled={saving}>
                        <option value="expire_by_date">بالتاريخ فقط</option>
                        <option value="expire_by_consumption">بالاستهلاك فقط</option>
                        <option value="expire_by_whichever_comes_first">الأسبق — تاريخ أو استهلاك</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Downgrade plan code */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={labelStyle}>كود خطة التخفيض التلقائي عند الانتهاء</label>
                <input type="text" value={downgradePlanCode} onChange={e => setDowngradePlanCode(e.target.value)} style={inputStyle} placeholder="مثال: seeker_free — اتركه فارغاً لإيقاف التخفيض" disabled={saving} />
              </div>

              {/* Trial settings */}
              <div style={{ marginBottom: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                <p style={{ margin: "0 0 0.6rem", fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>🎁 الفترة التجريبية</p>
                <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: hasTrial ? "0.75rem" : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <ToggleSwitch checked={hasTrial} onChange={setHasTrial} disabled={saving} />
                    <label style={{ ...labelStyle, marginBottom: 0 }}>يوفّر فترة تجريبية</label>
                  </div>
                  {hasTrial && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ToggleSwitch checked={requiresPaymentForTrial} onChange={setRequiresPaymentForTrial} disabled={saving} />
                      <label style={{ ...labelStyle, marginBottom: 0 }}>يتطلب طريقة دفع للتجربة</label>
                    </div>
                  )}
                </div>
                {hasTrial && (
                  <div style={{ maxWidth: 200 }}>
                    <label style={labelStyle}>عدد أيام التجربة</label>
                    <input type="number" min={1} max={365} value={trialDays} onChange={e => setTrialDays(e.target.value)} style={inputStyle} placeholder="14" />
                  </div>
                )}
              </div>

              {/* Business rules */}
              <div style={{ paddingTop: "0.75rem", borderTop: "1px solid #f1f5f9" }}>
                <p style={{ margin: "0 0 0.6rem", fontSize: "0.82rem", fontWeight: 700, color: "#374151" }}>قواعد الاشتراك التجاري</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem 2rem" }}>
                  {([
                    { label: "الخطة الافتراضية للمستخدمين الجدد", val: isDefaultForNewUsers, set: setIsDefaultForNewUsers },
                    { label: "متاحة للتسجيل الذاتي", val: availableForSelfSignup, set: setAvailableForSelfSignup },
                    { label: "تتطلب موافقة الإدارة", val: requiresAdminApproval, set: setRequiresAdminApproval },
                    { label: "تسمح بالإضافات (Add-ons)", val: allowAddOns, set: setAllowAddOns },
                    { label: "تسمح بالترقية", val: allowUpgrade, set: setAllowUpgrade },
                    { label: "تسمح بالتخفيض", val: allowDowngrade, set: setAllowDowngrade },
                    { label: "تخفيض تلقائي عند الانتهاء", val: autoDowngradeOnExpiry, set: setAutoDowngradeOnExpiry },
                    { label: "إعادة الشراء عند استنزاف الحصة", val: allowRepurchaseOnConsumption, set: setAllowRepurchaseOnConsumption },
                    { label: "تجديد مبكر عند استنزاف الحصة", val: allowEarlyRenewalOnConsumption, set: setAllowEarlyRenewalOnConsumption },
                  ] as { label: string; val: boolean; set: (v: boolean) => void }[]).map(row => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <ToggleSwitch checked={row.val} onChange={row.set} disabled={saving} />
                      <label style={{ ...labelStyle, marginBottom: 0, fontSize: "0.8rem" }}>{row.label}</label>
                    </div>
                  ))}
                </div>
              </div>

            </CollapsibleSection>

          </form>

          {/* ═══════════════════════════════════════════════
              أسعار الاشتراك (خارج الفورم — existing plans only)
          ═══════════════════════════════════════════════ */}
          {!isNew && (() => {
            const visiblePricing = planBillingType === "one_time_fixed_term"
              ? pricing.filter(p => p.billingCycle === "OneTime")
              : planBillingType === "recurring"
                ? pricing.filter(p => p.billingCycle !== "OneTime")
                : pricing;
            const hiddenCount = pricing.length - visiblePricing.length;
            return (
              <CollapsibleSection title="أسعار الاشتراك" icon="🏷" count={visiblePricing.length} defaultOpen={visiblePricing.length === 0 && planBillingType !== "free_default"}>
                {planBillingType === "free_default" && (
                  <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>الخطط المجانية لا تحتاج إلى أسعار.</p>
                )}
                {hiddenCount > 0 && (
                  <p style={{ color: "#b45309", background: "#fef9c3", borderRadius: 6, padding: "0.4rem 0.75rem", fontSize: "0.82rem", marginBottom: "0.75rem", border: "1px solid #fde68a" }}>
                    ⚠ {hiddenCount} سعر غير متوافق مع نمط الفوترة الحالي.
                  </p>
                )}
                {planBillingType !== "free_default" && !showAddPricing && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <button type="button" className="btn btn-primary" style={{ padding: "0.3rem 0.85rem", fontSize: "0.82rem" }} onClick={() => setShowAddPricing(true)}>
                      + إضافة سعر
                    </button>
                  </div>
                )}
                {pricingLoading && <p style={{ color: "#64748b", fontSize: "0.88rem" }}>جاري التحميل...</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {visiblePricing.map(entry => (
                    <PricingRow key={entry.id} entry={entry} planId={plan!.id} planBillingType={planBillingType}
                      onUpdated={updated => setPricing(prev => prev.map(p => p.id === updated.id ? updated : p))}
                      onDeleted={id => setPricing(prev => prev.filter(p => p.id !== id))}
                    />
                  ))}
                  {!pricingLoading && visiblePricing.length === 0 && !showAddPricing && planBillingType !== "free_default" && (
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "0.75rem 0" }}>لا توجد أسعار بعد — أضف سعراً أولاً حتى تظهر الخطة للمستخدمين.</p>
                  )}
                  {showAddPricing && (
                    <AddPricingForm planId={plan!.id} planBillingType={planBillingType}
                      onCreated={entry => { setPricing(prev => [...prev, entry]); setShowAddPricing(false); }}
                      onCancel={() => setShowAddPricing(false)}
                    />
                  )}
                </div>
              </CollapsibleSection>
            );
          })()}

          {/* ═══════════════════════════════════════════════
              3. المميزات والحدود — Unified section (existing plans only)
          ═══════════════════════════════════════════════ */}
          {!isNew && (
            <SectionCard title={`المميزات والحدود ${enabledCount > 0 ? `· ${enabledCount} مفعّل` : ""}`} icon="🎛">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {UNIFIED_ITEMS.map(item => {
                  const itemKey = "key" in item ? item.key : item.fk;
                  return (
                    <UnifiedItemCard
                      key={itemKey}
                      item={item}
                      features={features}
                      limits={limits}
                      limitValues={limitValues}
                      featureSaving={featureSaving}
                      onFeatureToggle={handleFeatureToggle}
                      onLimitChange={handleLimitChange}
                      onSimToggle={handleSimToggle}
                      onFeatureLimitToggle={handleFeatureLimitToggle}
                    />
                  );
                })}

                {/* Fallback renderers removed — only UNIFIED_ITEMS cards are shown.
                    Any backend key not covered by a unified card is silently ignored.
                    This prevents duplicate controls and unknown-feature confusion. */}

                {limits.length === 0 && features.length === 0 && (
                  <p style={{ fontSize: "0.83rem", color: "#94a3b8", textAlign: "center", padding: "1rem 0", margin: 0 }}>
                    لم تُحدَّد حدود أو ميزات بعد — أضفها من <strong>كتالوج الميزات والحدود</strong> أولاً.
                  </p>
                )}
              </div>
            </SectionCard>
          )}

          {/* القيمة التسويقية */}
          {!isNew && limits.some(l => KNOWN_MARKETING.some(k => k.key === l.key)) && (
            <CollapsibleSection title="القيمة التسويقية" icon="📈" defaultOpen={false}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                {KNOWN_MARKETING.map(km => {
                  const limItem = limits.find(l => l.key === km.key);
                  if (!limItem) return null;
                  const val = limitValues[km.key] ?? String(limItem.value);
                  const dirty = val !== String(limItem.value);
                  return (
                    <div key={km.key} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.85rem", borderRadius: 8, background: "#fff", border: dirty ? "1.5px solid #93c5fd" : "1.5px solid #e2e8f0" }}>
                      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{km.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600 }}>{km.label}</p>
                        <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b" }}>{km.description}</p>
                      </div>
                      <input type="number" min={0} value={val}
                        onChange={e => handleLimitChange(km.key, e.target.value)}
                        style={{ ...inputStyle, width: 82, textAlign: "center", padding: "0.35rem 0.5rem", margin: 0, flexShrink: 0 }} />
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* معاينة الخطة */}
          {!isNew && (
            <CollapsibleSection title="معاينة الخطة" icon="🔍" defaultOpen={false}>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", color: "#64748b" }}>معاينة مباشرة لكيفية ظهور الخطة في صفحة التسعير.</p>
              <PlanPreviewCard
                displayNameAr={displayNameAr} displayNameEn={displayNameEn} internalName={name}
                badgeText={badgeText} planColor={planColor} isRecommended={isRecommended}
                basePriceMonthly={priceMonthly}
                enabledFeatures={features} limits={limits}
              />
            </CollapsibleSection>
          )}

        </div>

        {/* ── Sticky Save Footer ── */}
        <div style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb", backgroundColor: "#ffffff", padding: "0.85rem 1.4rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <div style={{ fontSize: "0.82rem", color: "#64748b", minWidth: 130 }}>
            {saveStatus === "saving" && (
              <span style={{ color: "#2563eb", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ display: "inline-block", width: 10, height: 10, border: "2px solid #2563eb", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                جارٍ الحفظ...
              </span>
            )}
            {saveStatus === "saved"  && <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ تم الحفظ</span>}
            {saveStatus === "dirty"  && <span style={{ color: "#b45309" }}>لم يتم الحفظ بعد</span>}
          </div>
          <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
            <button type="button" className="btn btn-ghost" onClick={handleCloseModal} disabled={saving} style={{ minWidth: 80 }}>
              إلغاء
            </button>
            <button
              type="button" className="btn btn-primary"
              onClick={() => { if (isNew) { void doCreate(); } else { void doSave(); } }}
              disabled={saving || (!isNew && !isDirty)}
              style={{ minWidth: 130 }}
            >
              {saving ? "جارٍ الحفظ..." : isNew ? "إنشاء الخطة" : "حفظ التغييرات"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "settings.manage" });

  const [plans, setPlans]         = useState<AdminPlanSummary[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [activeFilter, setActiveFilter] = useState<"active" | "archived" | "all">("active");

  const [toastMsg,  setToastMsg]  = useState("");
  const [toastType, setToastType] = useState<"ok" | "err">("ok");
  const [toastKey,  setToastKey]  = useState(0);

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToastMsg(msg);
    setToastType(type);
    setToastKey(k => k + 1);
    setTimeout(() => setToastMsg(""), 3500);
  }, []);

  const [editTarget, setEditTarget]     = useState<AdminPlanDetail | null | undefined>(undefined);
  const [modalOpen, setModalOpen]       = useState(false);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]   = useState("");

  const [duplicating, setDuplicating]   = useState<string | null>(null);

  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setFetching(true); setFetchError("");
    try {
      const data = await adminApi.getPlans();
      setPlans(data);
    } catch (e) { setFetchError(normalizeError(e)); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load();
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  async function handleOpenEdit(id: string) {
    setDetailLoading(id); setActionError("");
    try {
      const detail = await adminApi.getPlanDetail(id);
      setEditTarget(detail);
      setModalOpen(true);
    } catch (e) { setActionError(normalizeError(e)); }
    finally { setDetailLoading(null); }
  }

  function handleOpenCreate() { setEditTarget(null); setModalOpen(true); }
  function handleModalClose() { setModalOpen(false); setEditTarget(undefined as any); }

  function handleSaved(updated: AdminPlanDetail) {
    setPlans(prev => {
      const exists = prev.find(p => p.id === updated.id);
      if (exists) return prev.map(p => p.id === updated.id ? updated : p);
      return [...prev, updated];
    });
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true); setDeleteError("");
    try {
      await adminApi.deletePlan(id);
      setPlans(prev => prev.map(p => p.id === id ? { ...p, isActive: false } : p));
      setDeleteId(null);
      showToast("تمت أرشفة الخطة بنجاح");
    } catch (e) { setDeleteError(normalizeError(e)); }
    finally { setDeleteLoading(false); }
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id); setActionError("");
    try {
      const copy = await adminApi.duplicatePlan(id);
      setPlans(prev => [...prev, copy]);
    } catch (e) { setActionError(normalizeError(e)); }
    finally { setDuplicating(null); }
  }

  const sorted   = [...plans].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  const filtered = sorted.filter(p =>
    activeFilter === "all"      ? true :
    activeFilter === "active"   ? p.isActive :
    /* archived */                !p.isActive
  );
  const activeCount   = plans.filter(p =>  p.isActive).length;
  const archivedCount = plans.filter(p => !p.isActive).length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background, #f9f9f9)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>إدارة خطط الاشتراك</h1>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                {activeFilter === "active"   ? `${activeCount} خطة نشطة` :
                 activeFilter === "archived" ? `${archivedCount} خطة مؤرشفة` :
                 `${plans.length} خطة (${activeCount} نشطة · ${archivedCount} مؤرشفة)`}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.6rem", flexShrink: 0 }}>
              <a
                href="/dashboard/admin/plan-matrix"
                style={{ display: "inline-flex", alignItems: "center", padding: "0.4rem 1rem", borderRadius: 8, fontSize: "0.85rem", border: "1.5px solid rgba(167,139,250,0.4)", color: "#a78bfa", textDecoration: "none", background: "rgba(167,139,250,0.07)", gap: "0.3rem" }}>
                📊 مصفوفة الخطط
              </a>
              <a
                href="/dashboard/admin/plan-catalog"
                style={{ display: "inline-flex", alignItems: "center", padding: "0.4rem 1rem", borderRadius: 8, fontSize: "0.85rem", border: "1.5px solid var(--color-border, #e5e7eb)", color: "var(--color-text-secondary)", textDecoration: "none", background: "#ffffff" }}>
                كتالوج الميزات والحدود
              </a>
              <button
                className="btn btn-primary"
                onClick={handleOpenCreate}
                style={{ flexShrink: 0 }}>
                + خطة جديدة
              </button>
            </div>
          </div>
        </div>

        {(fetchError || actionError) && <InlineBanner message={fetchError || actionError} />}

        {/* ── Filter Tabs ── */}
        {!fetching && (
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", borderBottom: "2px solid var(--color-border, #e5e7eb)", paddingBottom: "0" }}>
            {(["active", "archived", "all"] as const).map(tab => {
              const label = tab === "active" ? `النشطة (${activeCount})` : tab === "archived" ? `المؤرشفة (${archivedCount})` : `الكل (${plans.length})`;
              const isSelected = activeFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  style={{
                    padding: "0.45rem 1.1rem", fontSize: "0.85rem", fontWeight: isSelected ? 700 : 500,
                    border: "none", background: "none", cursor: "pointer",
                    borderBottom: isSelected ? "2.5px solid var(--color-primary, #2563eb)" : "2.5px solid transparent",
                    color: isSelected ? "var(--color-primary, #2563eb)" : "var(--color-text-secondary)",
                    marginBottom: "-2px", transition: "color 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {fetching && <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>جاري التحميل...</div>}

        {!fetching && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>
            {activeFilter === "archived" ? "لا توجد خطط مؤرشفة." : activeFilter === "active" ? "لا توجد خطط نشطة. أنشئ أول خطة!" : "لا توجد خطط بعد. أنشئ أول خطة!"}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map(plan => {
            const isLoadingThis = detailLoading === plan.id;
            const monthlyPrice  = plan.basePriceMonthly === 0 ? "مجاني" : `${plan.basePriceMonthly.toLocaleString("ar-SY")} ل.س/شهر`;
            const yearlyPrice   = plan.basePriceYearly  === 0 ? null     : `${plan.basePriceYearly.toLocaleString("ar-SY")} ل.س/سنة`;
            return (
            <div key={plan.id} className="form-card" style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                  {plan.planColor && (
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: plan.planColor, flexShrink: 0 }} />
                  )}
                  <span style={{ fontWeight: 700, fontSize: "1rem" }}>{plan.displayNameAr}</span>
                  {plan.code && <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontFamily: "monospace" }}>{plan.code}</span>}
                  <span className={plan.isActive ? "badge badge-green" : "badge badge-red"}>{plan.isActive ? "نشطة" : "معطلة"}</span>
                  <span className={plan.isPublic ? "badge badge-blue" : "badge badge-gray"}>{plan.isPublic ? "عامة" : "مخفية"}</span>
                  {plan.isRecommended && <span className="badge badge-yellow">⭐ موصى بها</span>}
                  {plan.hasTrial && <span className="badge badge-green">🎁 تجريبية {plan.trialDays}ي</span>}
                  {plan.audienceType && <span className="badge" style={{ background: AUDIENCE_BG[plan.audienceType], color: "#fff" }}>{AUDIENCE_AR_LABEL[plan.audienceType] ?? plan.audienceType}</span>}
                  {plan.tier && <span className="badge" style={{ background: TIER_BG[plan.tier], color: "#fff" }}>{TIER_AR_LABEL[plan.tier] ?? plan.tier}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: plan.planColor || "var(--color-primary, #2563eb)" }}>{monthlyPrice}</span>
                  {yearlyPrice && <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{yearlyPrice}</span>}
                </div>
                {plan.description && <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>{plan.description}</p>}
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                  ترتيب: {plan.displayOrder}
                  &nbsp;·&nbsp;رتبة: {plan.rank}
                  &nbsp;·&nbsp;{plan.billingMode === "InternalOnly" ? "داخلي" : plan.billingMode === "StripeOnly" ? "Stripe" : "هجين"}
                </p>
                {/* ── Key Commercial Data ── */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                  {plan.listingsLimit !== 0 && (
                    <span style={{ fontSize: "0.72rem", background: "var(--color-bg-secondary, #f3f4f6)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 4, padding: "0.1rem 0.45rem", color: "var(--color-text-secondary)" }}>
                      🏠 {plan.listingsLimit === -1 ? "∞" : plan.listingsLimit} إعلان
                    </span>
                  )}
                  {plan.agentsLimit !== 0 && (
                    <span style={{ fontSize: "0.72rem", background: "var(--color-bg-secondary, #f3f4f6)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 4, padding: "0.1rem 0.45rem", color: "var(--color-text-secondary)" }}>
                      👤 {plan.agentsLimit === -1 ? "∞" : plan.agentsLimit} وكيل
                    </span>
                  )}
                  {plan.projectsLimit !== 0 && (
                    <span style={{ fontSize: "0.72rem", background: "var(--color-bg-secondary, #f3f4f6)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 4, padding: "0.1rem 0.45rem", color: "var(--color-text-secondary)" }}>
                      🏗 {plan.projectsLimit === -1 ? "∞" : plan.projectsLimit} مشروع
                    </span>
                  )}
                  {plan.imagesPerListing !== 0 && (
                    <span style={{ fontSize: "0.72rem", background: "var(--color-bg-secondary, #f3f4f6)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 4, padding: "0.1rem 0.45rem", color: "var(--color-text-secondary)" }}>
                      📸 {plan.imagesPerListing === -1 ? "∞" : plan.imagesPerListing} صورة
                    </span>
                  )}
                  {plan.featuredSlots !== 0 && (
                    <span style={{ fontSize: "0.72rem", background: "var(--color-bg-secondary, #f3f4f6)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 4, padding: "0.1rem 0.45rem", color: "var(--color-text-secondary)" }}>
                      ⭐ {plan.featuredSlots === -1 ? "∞" : plan.featuredSlots} مميز
                    </span>
                  )}
                  {plan.hasAnalytics        && <span style={{ fontSize: "0.72rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 4, padding: "0.1rem 0.45rem", color: "#1d4ed8" }}>📊 تحليلات</span>}
                  {plan.hasFeaturedListings && <span style={{ fontSize: "0.72rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 4, padding: "0.1rem 0.45rem", color: "#1d4ed8" }}>⭐ إعلانات مميزة</span>}
                  {plan.hasProjectMgmt      && <span style={{ fontSize: "0.72rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 4, padding: "0.1rem 0.45rem", color: "#1d4ed8" }}>🏗 إدارة مشاريع</span>}
                  {plan.hasWhatsApp         && <span style={{ fontSize: "0.72rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "0.1rem 0.45rem", color: "#15803d" }}>💬 واتساب</span>}
                  {plan.hasVerifiedBadge    && <span style={{ fontSize: "0.72rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "0.1rem 0.45rem", color: "#15803d" }}>✅ شارة موثق</span>}
                  {plan.hasPrioritySupport  && <span style={{ fontSize: "0.72rem", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 4, padding: "0.1rem 0.45rem", color: "#7e22ce" }}>🛠 دعم أولوية</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <button
                  className="btn"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
                  disabled={isLoadingThis || !!detailLoading}
                  onClick={() => handleOpenEdit(plan.id)}
                >
                  {isLoadingThis ? "..." : "تعديل"}
                </button>
                <button
                  className="btn"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", opacity: duplicating === plan.id ? 0.5 : 1 }}
                  disabled={duplicating === plan.id}
                  onClick={() => handleDuplicate(plan.id)}
                >
                  {duplicating === plan.id ? "..." : "نسخ"}
                </button>
                <button
                  className="btn"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", border: "1.5px solid var(--color-error)", color: "var(--color-error)", backgroundColor: "transparent" }}
                  onClick={() => { setDeleteId(plan.id); setDeleteError(""); }}
                >
                  أرشفة
                </button>
              </div>
            </div>
            );
          })}
        </div>

        {/* ── Plan Comparison Table ── */}
        {!fetching && plans.length > 0 && (
          <PlanComparisonTable plans={plans} />
        )}

      </div>

      {/* ── Archive Confirmation ── */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "#ffffff", borderRadius: 12, padding: "2rem", maxWidth: 440, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 0.75rem" }}>تأكيد الأرشفة</h3>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "1rem" }}>سيتم إخفاء هذه الخطة وتعطيلها. لا يمكن أرشفة خطة لها مشتركون نشطون. يمكن إعادة تفعيلها لاحقاً من خلال التعديل.</p>
            {deleteError && <p style={{ color: "var(--color-error)", fontSize: "0.9rem", marginBottom: "1rem" }}>{deleteError}</p>}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: "var(--color-error, #dc2626)", borderColor: "var(--color-error, #dc2626)" }}
                disabled={deleteLoading}
                onClick={() => handleDelete(deleteId)}
              >
                {deleteLoading ? "جاري الأرشفة..." : "تأكيد الأرشفة"}
              </button>
              <button
                className="btn"
                style={{ flex: 1 }}
                disabled={deleteLoading}
                onClick={() => { setDeleteId(null); setDeleteError(""); }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit / Create Modal ── */}
      {modalOpen && (
        <EditPlanModal
          plan={editTarget ?? null}
          onClose={handleModalClose}
          onSaved={(updated) => handleSaved(updated)}
        />
      )}

      {/* ── Toast ── */}
      {toastMsg && <Toast msg={toastMsg} type={toastType} key={toastKey} />}
    </div>
  );
}
