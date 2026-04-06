"use client";

// ─────────────────────────────────────────────────────────────────────────────
// PlanPageGuard — Route-level guard for plan-gated pages.
//
// Usage (in page.tsx):
//   export default function AnalyticsPage() {
//     return (
//       <PlanPageGuard feature="analytics_dashboard">
//         <AnalyticsContent />
//       </PlanPageGuard>
//     );
//   }
//
// Behaviour:
//   - Admin / Staff → always renders children.
//   - Feature enabled → renders children.
//   - Feature disabled → renders full-page upgrade UI.
//   - Loading → renders skeleton.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import Link from "next/link";
import { usePlan } from "@/context/SubscriptionContext";
import type { FeatureKey } from "@/features/plan/types";
import { FEATURE_META } from "@/features/plan/plans.config";

interface PlanPageGuardProps {
  feature: FeatureKey;
  children: ReactNode;
}

export default function PlanPageGuard({ feature, children }: PlanPageGuardProps) {
  const { canAccess, isLoading, isAdminBypass, subscription } = usePlan();

  if (isLoading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 200,
        color: "#6b7280",
        fontSize: "0.85rem",
      }}>
        جاري التحقق من صلاحيات الوصول…
      </div>
    );
  }

  if (isAdminBypass || canAccess(feature)) return <>{children}</>;

  const meta        = FEATURE_META[feature];
  const planName    = subscription?.planName ?? null;
  const tierLabel   = subscription?.tier ?? null;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 320,
      gap: "1rem",
      textAlign: "center",
      direction: "rtl",
      padding: "2rem",
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        backgroundColor: "#fef3c7",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.8rem",
      }}>
        🔒
      </div>

      <div>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>
          {meta.label} غير متاحة في باقتك الحالية
        </h2>
        <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "#6b7280", maxWidth: 380 }}>
          {meta.description}
        </p>
        {planName && (
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.75rem", color: "#a16207" }}>
            باقتك الحالية:&nbsp;
            <strong>{planName}</strong>
            {tierLabel && ` (${tierLabel})`}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/dashboard/subscription/plans"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.5rem 1.4rem",
            borderRadius: 8,
            backgroundColor: "#166534",
            color: "#fff",
            fontSize: "0.85rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          🚀 ترقية الباقة
        </Link>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.5rem 1.2rem",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            backgroundColor: "#fff",
            color: "#374151",
            fontSize: "0.85rem",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          العودة إلى لوحة التحكم
        </Link>
      </div>
    </div>
  );
}
