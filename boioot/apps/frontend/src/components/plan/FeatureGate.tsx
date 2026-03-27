"use client";

// ─────────────────────────────────────────────────────────────────────────────
// FeatureGate — Conditionally renders children based on plan feature access.
//
// Usage:
//   <FeatureGate feature="video_upload">
//     <VideoUploadButton />
//   </FeatureGate>
//
//   <FeatureGate feature="analytics_dashboard" fallback={<p>مقفل</p>}>
//     <AnalyticsDashboard />
//   </FeatureGate>
//
// Props:
//   feature    — the feature key to check
//   fallback   — what to render if access is denied (default: UpgradePrompt)
//   hideIfDenied — if true, renders nothing instead of the fallback (default: false)
//   compact    — pass through to UpgradePrompt for inline badge variant
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { usePlan } from "@/context/SubscriptionContext";
import type { FeatureKey } from "@/features/plan/types";
import UpgradePrompt from "./UpgradePrompt";

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  hideIfDenied?: boolean;
  compact?: boolean;
}

export default function FeatureGate({
  feature,
  children,
  fallback,
  hideIfDenied = false,
  compact = false,
}: FeatureGateProps) {
  const { canAccess, isLoading, subscription } = usePlan();

  if (isLoading) return null;

  if (canAccess(feature)) return <>{children}</>;

  if (hideIfDenied) return null;

  if (fallback !== undefined) return <>{fallback}</>;

  return (
    <UpgradePrompt
      feature={feature}
      compact={compact}
      currentPlan={subscription?.planName ?? null}
    />
  );
}
