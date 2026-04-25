"use client";

// ─────────────────────────────────────────────────────────────────────────────
// useFeature — Unified single-feature check hook.
//
// The ONE way to check a feature flag in any component.
//
// Usage:
//   const videoAllowed  = useFeature("video_upload");
//   const chatAllowed   = useFeature("internal_chat");
//
// Behaviour:
//   • Returns false while the subscription is still loading (safe default).
//   • Returns true for Admin / Staff (bypass is handled inside SubscriptionContext).
//   • Returns true when the user's active plan has the feature enabled.
//   • Returns false when the user has no subscription or the feature is off.
//
// For declarative JSX gating use <FeatureGate feature="..."> instead.
// For limit checks use useLimit(key) or usePlan().getLimit(key) directly.
// ─────────────────────────────────────────────────────────────────────────────

import { usePlan } from "@/context/SubscriptionContext";
import type { FeatureKey } from "@/features/plan/types";

export function useFeature(key: FeatureKey): boolean {
  const { canAccess, isLoading } = usePlan();
  if (isLoading) return false;
  return canAccess(key);
}
