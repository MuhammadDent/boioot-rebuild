"use client";

import type { RatingResponse } from "@/types";
import StarRating from "./StarRating";

interface ReviewCardProps {
  review: RatingResponse;
}

function formatArabicDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar-SY", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function initials(name: string): string {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0][0] ?? "").toUpperCase();
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      {/* Header: avatar + name + date */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "var(--color-primary)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "0.85rem",
            flexShrink: 0,
          }}
        >
          {initials(review.reviewerName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>
            {review.reviewerName}
          </p>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
            {formatArabicDate(review.createdAt)}
          </p>
        </div>
        <StarRating score={review.score} size={14} />
      </div>

      {/* Comment */}
      {review.comment && (
        <p
          style={{
            margin: 0,
            fontSize: "0.88rem",
            color: "var(--color-text-secondary)",
            lineHeight: 1.7,
          }}
        >
          {review.comment}
        </p>
      )}
    </div>
  );
}
