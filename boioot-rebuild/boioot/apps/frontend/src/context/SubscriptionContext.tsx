"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SubscriptionContext — Plan-Based Access Control (PBAC) context.
//
// Provides:
//   • canAccess(feature)  — boolean feature gate
//   • getLimit(limit)     — numeric limit (-1 = unlimited)
//   • hasPlan(planCode)   — true if user's active plan matches
//   • isAdminBypass       — true for Admin / Staff (skip all PBAC)
//   • subscription        — raw CurrentSubscriptionResponse (may be null)
//   • refresh()           — re-fetch subscription
//
// Admin / Staff bypass:
//   • canAccess always returns true
//   • getLimit always returns -1 (unlimited)
//   • No subscription fetch is performed
//
// Graceful degradation:
//   • If fetch fails or user has no plan → returns false / free-tier defaults
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { subscriptionApi } from "@/features/subscription/api";
import type { CurrentSubscriptionResponse } from "@/features/subscription/types";
import type { FeatureKey, LimitKey } from "@/features/plan/types";
import { UNLIMITED } from "@/features/plan/types";
import { FREE_TIER_DEFAULTS } from "@/features/plan/plans.config";
import { isStaffRole } from "@/lib/rbac";

// ── Context value ─────────────────────────────────────────────────────────────

interface SubscriptionContextValue {
  subscription: CurrentSubscriptionResponse | null;
  isLoading: boolean;
  /** True for Admin and Staff — all feature/limit checks are bypassed. */
  isAdminBypass: boolean;
  /**
   * Returns true if the user's active plan has this feature enabled.
   * Always returns true for Admin/Staff.
   * Returns false if subscription is loading or unavailable.
   */
  canAccess: (feature: FeatureKey) => boolean;
  /**
   * Returns the configured numeric limit for this key.
   * Returns -1 (unlimited) for Admin/Staff.
   * Returns the free-tier default if no subscription is available.
   */
  getLimit: (limit: LimitKey) => number;
  /**
   * Returns true if the user's active plan has the given plan code.
   */
  hasPlan: (planCode: string) => boolean;
  /** Re-fetch the subscription from the server. */
  refresh: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [subscription, setSubscription] = useState<CurrentSubscriptionResponse | null>(null);
  const [isLoading, setIsLoading]       = useState(false);

  // Admin / Staff bypass — no plan fetch needed.
  // Covers ALL internal staff roles (Admin, AdminManager, ContentEditor, etc.)
  const isAdminBypass = !!user && (user.role === "Admin" || isStaffRole(user.role));

  // ── Fetch subscription ─────────────────────────────────────────────────

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated || isAdminBypass) {
      if (isAdminBypass) console.log("[subscription] Admin/Staff bypass — skipping plan fetch for role:", user?.role);
      setSubscription(null);
      return;
    }
    console.log("[subscription] Fetching plan for:", user?.email, "| role:", user?.role);
    setIsLoading(true);
    try {
      const data = await subscriptionApi.getCurrent();
      console.log("[subscription] Plan loaded:", data?.planCode ?? "none", "| active:", data?.isActive);
      setSubscription(data);
    } catch (err) {
      console.warn("[subscription] Failed to fetch subscription:", err);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAdminBypass, user?.email, user?.role]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setSubscription(null);
      return;
    }
    fetchSubscription();
  }, [isAuthenticated, authLoading, fetchSubscription]);

  // ── Helpers ────────────────────────────────────────────────────────────

  const canAccess = useCallback(
    (feature: FeatureKey): boolean => {
      if (isAdminBypass) return true;
      if (!subscription) return false;
      // Check dynamic features map first (most accurate)
      if (feature in subscription.features) {
        return subscription.features[feature] === true;
      }
      // Fallback: named boolean fields for backward compatibility
      switch (feature) {
        case "analytics_dashboard":  return subscription.hasAnalyticsDashboard;
        case "video_upload":         return subscription.hasVideoUpload;
        case "featured_listings":    return subscription.hasFeaturedListings;
        case "whatsapp_contact":     return subscription.hasWhatsappContact;
        case "verified_badge":       return subscription.hasVerifiedBadge;
        case "homepage_exposure":    return subscription.hasHomepageExposure;
        case "project_management":   return subscription.hasProjectManagement;
        default:                     return false;
      }
    },
    [isAdminBypass, subscription],
  );

  const getLimit = useCallback(
    (limit: LimitKey): number => {
      if (isAdminBypass) return UNLIMITED;
      if (!subscription) return FREE_TIER_DEFAULTS[limit] ?? 0;
      // Check dynamic limits map first
      if (limit in subscription.limits) {
        return subscription.limits[limit];
      }
      // Fallback: named numeric fields
      switch (limit) {
        case "max_active_listings":    return subscription.maxActiveListings;
        case "max_images_per_listing": return subscription.maxImagesPerListing;
        case "max_agents":             return subscription.maxAgents;
        case "max_featured_slots":     return subscription.maxFeaturedSlots;
        default:                       return 0;
      }
    },
    [isAdminBypass, subscription],
  );

  const hasPlan = useCallback(
    (planCode: string): boolean => {
      if (isAdminBypass) return true;
      return subscription?.planCode === planCode && subscription.isActive;
    },
    [isAdminBypass, subscription],
  );

  const refresh = useCallback(async () => {
    await fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        isAdminBypass,
        canAccess,
        getLimit,
        hasPlan,
        refresh,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns the plan-based access control context.
 *
 * Usage:
 *   const { canAccess, getLimit } = usePlan();
 *   if (!canAccess("video_upload")) { ... show upgrade ... }
 */
export function usePlan(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("usePlan must be used inside SubscriptionProvider");
  return ctx;
}
