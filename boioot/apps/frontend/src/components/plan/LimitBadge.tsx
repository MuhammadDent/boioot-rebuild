"use client";

// ─────────────────────────────────────────────────────────────────────────────
// LimitBadge — Displays current usage vs. plan limit.
//
// Usage:
//   <LimitBadge limit="max_active_listings" current={3} />
//   → "3 / 10 إعلان"   (green when under limit)
//   → "10 / 10 إعلان"  (red when at limit)
//   → "3 / ∞"           (when unlimited)
// ─────────────────────────────────────────────────────────────────────────────

import { usePlan } from "@/context/SubscriptionContext";
import type { LimitKey } from "@/features/plan/types";
import { UNLIMITED } from "@/features/plan/types";
import { LIMIT_META } from "@/features/plan/plans.config";

interface LimitBadgeProps {
  limit: LimitKey;
  current: number;
  showLabel?: boolean;
  style?: React.CSSProperties;
}

export default function LimitBadge({
  limit,
  current,
  showLabel = true,
  style,
}: LimitBadgeProps) {
  const { getLimit, isLoading } = usePlan();
  const meta = LIMIT_META[limit];

  if (isLoading) return null;

  const max         = getLimit(limit);
  const isUnlimited = max === UNLIMITED;
  const isAtLimit   = !isUnlimited && current >= max;
  const isNearLimit = !isUnlimited && max > 0 && current / max >= 0.8;

  const color = isAtLimit
    ? "#dc2626"
    : isNearLimit
    ? "#d97706"
    : "#166534";

  const bg = isAtLimit
    ? "#fef2f2"
    : isNearLimit
    ? "#fffbeb"
    : "#f0fdf4";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        padding: "0.2rem 0.55rem",
        borderRadius: 5,
        backgroundColor: bg,
        color,
        fontSize: "0.72rem",
        fontWeight: 600,
        direction: "rtl",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {isAtLimit && <span>⚠️</span>}
      <span>
        {current}
        {" / "}
        {isUnlimited ? "∞" : max}
      </span>
      {showLabel && (
        <span style={{ fontWeight: 400, opacity: 0.7 }}>
          {meta.unit}
        </span>
      )}
    </span>
  );
}
