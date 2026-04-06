"use client";

// ─────────────────────────────────────────────────────────────────────────────
// UpgradePrompt — Shown when a user tries to access a locked feature.
//
// Props:
//   feature      — the feature key the user is missing
//   compact      — render a small inline badge instead of full card
//   currentPlan  — optional current plan name for display
//   className    — extra class names
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { FEATURE_META } from "@/features/plan/plans.config";
import type { FeatureKey } from "@/features/plan/types";

interface UpgradePromptProps {
  feature?: FeatureKey;
  compact?: boolean;
  currentPlan?: string | null;
  className?: string;
  message?: string;
}

export default function UpgradePrompt({
  feature,
  compact = false,
  currentPlan,
  className = "",
  message,
}: UpgradePromptProps) {
  const meta     = feature ? FEATURE_META[feature] : null;
  const icon     = meta?.icon ?? "🔒";
  const label    = meta?.label ?? "هذه الميزة";
  const desc     = message ?? meta?.description ?? "قم بترقية باقتك للوصول إلى هذه الميزة";

  if (compact) {
    return (
      <span
        className={className}
        title={`${label} غير متاح في باقتك الحالية`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          padding: "0.15rem 0.5rem",
          borderRadius: 4,
          backgroundColor: "#fef3c7",
          color: "#92400e",
          fontSize: "0.7rem",
          fontWeight: 600,
          cursor: "default",
          whiteSpace: "nowrap",
        }}
      >
        🔒 ترقية مطلوبة
      </span>
    );
  }

  return (
    <div
      className={className}
      style={{
        backgroundColor: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: 10,
        padding: "1.25rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "0.75rem",
        direction: "rtl",
      }}
    >
      <span style={{ fontSize: "2rem" }}>{icon}</span>

      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "#1c1917" }}>
          {label} غير متاحة في باقتك الحالية
        </p>
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.83rem", color: "#78716c" }}>
          {desc}
        </p>
        {currentPlan && (
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#a16207" }}>
            باقتك الحالية: <strong>{currentPlan}</strong>
          </p>
        )}
      </div>

      <Link
        href="/dashboard/subscription/plans"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.45rem 1.2rem",
          borderRadius: 7,
          backgroundColor: "#166534",
          color: "#fff",
          fontSize: "0.82rem",
          fontWeight: 600,
          textDecoration: "none",
          transition: "background-color 0.15s",
        }}
      >
        🚀 ترقية الباقة
      </Link>
    </div>
  );
}
