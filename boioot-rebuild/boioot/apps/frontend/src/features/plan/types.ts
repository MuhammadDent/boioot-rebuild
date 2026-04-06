// ─────────────────────────────────────────────────────────────────────────────
// plan/types.ts — Typed keys for plan features & limits.
//
// Rules:
//   • Feature keys MUST match backend FeatureDefinition.Key exactly.
//   • Limit keys MUST match backend LimitDefinition.Key exactly.
//   • NEVER use raw strings in application code — always import from here.
// ─────────────────────────────────────────────────────────────────────────────

// ── Feature keys ──────────────────────────────────────────────────────────────
// Backend source: FeatureDefinition.Key (stable — never rename after seeding)

export type FeatureKey =
  | "analytics_dashboard"
  | "video_upload"
  | "featured_listings"
  | "whatsapp_contact"
  | "verified_badge"
  | "homepage_exposure"
  | "project_management";

// ── Limit keys ────────────────────────────────────────────────────────────────
// Backend source: LimitDefinition.Key (stable — never rename after seeding)

export type LimitKey =
  | "max_active_listings"
  | "max_images_per_listing"
  | "max_agents"
  | "max_featured_slots";

// ── Sentinel values ───────────────────────────────────────────────────────────

/** Backend returns -1 to indicate no cap on a limit. */
export const UNLIMITED = -1;

/** Used in UI when subscription has not been fetched yet. */
export const LIMIT_UNKNOWN = 0;

// ── Result types ──────────────────────────────────────────────────────────────

export interface FeatureCheckResult {
  allowed: boolean;
  /** True when the check was bypassed (admin / staff user). */
  isBypass: boolean;
  /** True when the subscription is still loading. */
  isLoading: boolean;
}

export interface LimitCheckResult {
  /** Configured maximum for this limit key (-1 = unlimited). */
  max: number;
  /** True when max === -1. */
  isUnlimited: boolean;
  /** True when the check was bypassed (admin / staff user). */
  isBypass: boolean;
  /** True when the subscription is still loading. */
  isLoading: boolean;
}
