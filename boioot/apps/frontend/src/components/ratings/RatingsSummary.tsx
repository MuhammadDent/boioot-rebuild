"use client";

import type { RatingSummaryResponse } from "@/types";
import StarRating from "./StarRating";

interface RatingsSummaryProps {
  summary: RatingSummaryResponse;
}

export default function RatingsSummary({ summary }: RatingsSummaryProps) {
  if (summary.count === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <StarRating score={0} size={18} />
        <span style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
          لا توجد تقييمات بعد
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1.25rem",
        padding: "1rem 1.25rem",
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      {/* Large score */}
      <div style={{ textAlign: "center", lineHeight: 1 }}>
        <p style={{ margin: 0, fontSize: "2.5rem", fontWeight: 800, color: "#f59e0b" }}>
          {summary.average.toFixed(1)}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
          من 5
        </p>
      </div>

      {/* Stars + count */}
      <div>
        <StarRating score={summary.average} size={20} />
        <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
          بناءً على {summary.count} {summary.count === 1 ? "تقييم" : "تقييمات"}
        </p>
      </div>
    </div>
  );
}
