"use client";

import { useMemo } from "react";
import { useSubscription } from "./useSubscription";
import type { CurrentSubscriptionResponse } from "@/features/subscription/types";

// ── Access policy constants (must match backend SubscriptionKeys) ──────────
const POLICY_OPEN         = "open";
const POLICY_ADMIN_ONLY   = "admin_only";
const POLICY_SELF_SERVICE = "self_service";

// ── Feature key constants ──────────────────────────────────────────────────
export const FeatureKeys = {
  analyticsDashboard : "analytics_dashboard",
  advancedReports    : "advanced_reports",
  featuredListings   : "featured_listings",
  projectManagement  : "project_management",
  videoUpload        : "video_upload",
  multiplePhotos     : "multiple_photos",
  whatsappContact    : "whatsapp_contact",
  verifiedBadge      : "verified_badge",
  homepageExposure   : "homepage_exposure",
  prioritySupport    : "priority_support",
  internalChat       : "internal_chat",
  leadTracking       : "lead_tracking",
  leadAssignment     : "lead_assignment",
} as const;

// ── Limit key constants ────────────────────────────────────────────────────
export const LimitKeys = {
  maxActiveListings   : "max_active_listings",
  maxAgents           : "max_agents",
  maxProjects         : "max_projects",
  maxImagesPerListing : "max_images_per_listing",
  maxVideosPerListing : "max_videos_per_listing",
  maxFeaturedSlots    : "max_featured_slots",
  maxConversations    : "max_conversations",
} as const;

export type FeatureKey = (typeof FeatureKeys)[keyof typeof FeatureKeys];
export type LimitKey   = (typeof LimitKeys)[keyof typeof LimitKeys];

// ── Return type ────────────────────────────────────────────────────────────
export interface PlanCapabilities {
  /** Raw subscription data. Null while loading or when user has no account. */
  subscription: CurrentSubscriptionResponse | null;
  loading: boolean;

  /**
   * Returns true when the plan has this feature enabled.
   * Does NOT check access policy — use canUse() for the combined check.
   */
  hasFeature(key: string): boolean;

  /**
   * Returns true when the user CAN use the feature:
   *   1. Plan has the feature enabled, AND
   *   2. Feature policy is not "admin_only".
   * Use this to control UI visibility.
   */
  canUse(key: string): boolean;

  /**
   * Returns true when the feature is gated by admin activation only.
   * Show an "admin activation required" badge instead of an upgrade prompt.
   */
  isAdminOnly(key: string): boolean;

  /**
   * Returns the numeric plan limit for a key.
   * -1 = unlimited, 0 = not available or not defined.
   */
  getLimit(key: string): number;

  /**
   * Returns true when currentUsage has reached (or exceeded) the plan limit.
   * Always false when the limit is -1 (unlimited).
   * Always true when the limit is 0 (blocked/not available).
   */
  isLimitReached(key: string, currentUsage: number): boolean;

  /**
   * Returns a readable label for a limit, e.g. "∞" or "5".
   * Shows "—" when the limit is 0 (not available on this plan).
   */
  formatLimit(key: string): string;

  /**
   * True when the subscription is on the Free plan.
   * Useful for showing generic "Upgrade" prompts.
   */
  isFreePlan: boolean;

  /**
   * True when the subscription is currently expired.
   */
  isExpired: boolean;
}

// ── Hook ──────────────────────────────────────────────────────────────────
/**
 * usePlanCapabilities — Phase 3B frontend enforcement hook.
 *
 * Reads from the current user's subscription entitlement response and exposes
 * helpers to gate UI elements based on features, limits, and access policies.
 *
 * @example
 * const caps = usePlanCapabilities();
 * if (!caps.canUse(FeatureKeys.videoUpload)) return <UpgradePrompt />;
 * if (caps.isLimitReached(LimitKeys.maxActiveListings, myListings.length)) return <LimitBanner />;
 * if (caps.isAdminOnly(FeatureKeys.verifiedBadge)) return <AdminOnlyBadge />;
 */
export function usePlanCapabilities(): PlanCapabilities {
  const { subscription, loading } = useSubscription();

  return useMemo(() => {
    const features = subscription?.features ?? {};
    const limits   = subscription?.limits   ?? {};
    const policies = subscription?.policies ?? {};

    function hasFeature(key: string): boolean {
      return features[key] === true;
    }

    function isAdminOnly(key: string): boolean {
      const p = policies[key];
      return !!p && p === POLICY_ADMIN_ONLY;
    }

    function canUse(key: string): boolean {
      if (isAdminOnly(key)) return false;
      return hasFeature(key);
    }

    function getLimit(key: string): number {
      return limits[key] ?? 0;
    }

    function isLimitReached(key: string, currentUsage: number): boolean {
      const limit = getLimit(key);
      if (limit === -1) return false; // unlimited
      if (limit === 0)  return true;  // not available
      return currentUsage >= limit;
    }

    function formatLimit(key: string): string {
      const limit = getLimit(key);
      if (limit === -1) return "∞";
      if (limit === 0)  return "—";
      return String(limit);
    }

    const isFreePlan = !subscription
      || subscription.planId === "00000001-0000-0000-0000-000000000000"
      || subscription.status === "Free";

    const isExpired = subscription?.isExpired === true;

    return {
      subscription,
      loading,
      hasFeature,
      canUse,
      isAdminOnly,
      getLimit,
      isLimitReached,
      formatLimit,
      isFreePlan,
      isExpired,
    };
  }, [subscription, loading]);
}
