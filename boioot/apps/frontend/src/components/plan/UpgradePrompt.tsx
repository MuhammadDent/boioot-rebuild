"use client";

// ─────────────────────────────────────────────────────────────────────────────
// UpgradePrompt — Shown when a feature is gated behind a higher plan.
//
// Variants:
//   default  — full card with icon, description, benefit bullets, and CTA
//   compact  — small inline badge ("🔒 ترقية مطلوبة")
//   inline   — horizontal strip for inside forms / inline contexts
//
// Usage:
//   <UpgradePrompt feature="video_upload" />
//   <UpgradePrompt feature="analytics_dashboard" compact />
//   <UpgradePrompt feature="video_upload" inline />
//   <UpgradePrompt message="..." />   — custom message, no feature key
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { FEATURE_META } from "@/features/plan/plans.config";
import type { FeatureKey } from "@/features/plan/types";

const UPGRADE_HREF = "/dashboard/subscription/plans";

interface UpgradePromptProps {
  feature?: FeatureKey;
  compact?: boolean;
  inline?: boolean;
  currentPlan?: string | null;
  className?: string;
  message?: string;
}

export default function UpgradePrompt({
  feature,
  compact = false,
  inline = false,
  currentPlan,
  className = "",
  message,
}: UpgradePromptProps) {
  const meta     = feature ? FEATURE_META[feature] : null;
  const icon     = meta?.icon ?? "🔒";
  const label    = meta?.label ?? "هذه الميزة";
  const desc     = message ?? meta?.description ?? "قم بترقية باقتك للوصول إلى هذه الميزة";
  const benefits = meta?.benefits ?? [];

  // ── Compact badge ────────────────────────────────────────────────────────
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

  // ── Inline strip (for inside forms / small contexts) ─────────────────────
  if (inline) {
    return (
      <div
        className={className}
        style={{
          background: "linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)",
          border: "1.5px solid #fcd34d",
          borderRadius: 10,
          padding: "0.85rem 1.1rem",
          display: "flex",
          alignItems: "flex-start",
          gap: "0.75rem",
          direction: "rtl",
        }}
      >
        <span style={{ fontSize: "1.35rem", lineHeight: 1.2, flexShrink: 0, marginTop: "0.05rem" }}>
          {icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#78350f", fontSize: "0.88rem" }}>
            {label} غير متاحة في باقتك الحالية
          </p>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#92400e", lineHeight: 1.5 }}>
            {desc}
          </p>
        </div>
        <Link
          href={UPGRADE_HREF}
          style={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "0.4rem 0.9rem",
            borderRadius: 7,
            background: "#d97706",
            color: "#fff",
            fontSize: "0.78rem",
            fontWeight: 700,
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          🚀 ترقية
        </Link>
      </div>
    );
  }

  // ── Full card (default) ───────────────────────────────────────────────────
  return (
    <div
      className={className}
      style={{
        background: "linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)",
        border: "1.5px solid #fcd34d",
        borderRadius: 14,
        padding: "1.75rem 1.5rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "1rem",
        direction: "rtl",
      }}
    >
      {/* Icon */}
      <div style={{
        width: 56, height: 56,
        borderRadius: "50%",
        background: "#fef3c7",
        border: "2px solid #fde68a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1.6rem",
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ maxWidth: 380 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#1c1917" }}>
          {label} غير متاحة في باقتك الحالية
        </p>
        <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "#57534e", lineHeight: 1.65 }}>
          {desc}
        </p>
        {currentPlan && (
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.75rem", color: "#a16207" }}>
            باقتك الحالية: <strong>{currentPlan}</strong>
          </p>
        )}
      </div>

      {/* Benefit bullets */}
      {benefits.length > 0 && (
        <ul style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
          alignSelf: "stretch",
          textAlign: "start",
          background: "#fff",
          border: "1px solid #fde68a",
          borderRadius: 9,
          padding: "0.75rem 1rem",
        }}>
          {benefits.map((b, i) => (
            <li key={i} style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.82rem",
              color: "#44403c",
            }}>
              <span style={{ color: "#d97706", fontWeight: 700, fontSize: "0.9rem" }}>✓</span>
              {b}
            </li>
          ))}
        </ul>
      )}

      {/* CTA */}
      <Link
        href={UPGRADE_HREF}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.6rem 1.75rem",
          borderRadius: 8,
          background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
          color: "#fff",
          fontSize: "0.9rem",
          fontWeight: 700,
          textDecoration: "none",
          boxShadow: "0 2px 8px rgba(180,83,9,0.25)",
        }}
      >
        🚀 ترقية الباقة الآن
      </Link>
    </div>
  );
}
