"use client";

import type { RatingResponse } from "@/types";

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

function OverallStars({ score }: { score: number }) {
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "0.2rem", flexShrink: 0 }}
      aria-label={`${score} من 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={13}
          height={13}
          viewBox="0 0 24 24"
          fill={i <= score ? "#f59e0b" : "none"}
          stroke={i <= score ? "#f59e0b" : "#d1d5db"}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#f59e0b", marginRight: 3 }}>
        {score}
      </span>
    </div>
  );
}

const BREAKDOWN_FIELDS: Array<{ key: keyof RatingResponse; label: string }> = [
  { key: "cleanlinessRating",   label: "النظافة" },
  { key: "accuracyRating",      label: "دقة الوصف" },
  { key: "facilitiesRating",    label: "جودة المرافق" },
  { key: "communicationRating", label: "التواصل مع المالك" },
  { key: "commitmentRating",    label: "الالتزام بالاتفاق" },
  { key: "valueRating",         label: "القيمة مقابل السعر" },
];

function ScoreChip({ score }: { score: number }) {
  const good = score >= 4;
  return (
    <span
      style={{
        fontSize: "0.76rem",
        fontWeight: 600,
        color:      good ? "var(--color-primary)" : "#94a3b8",
        background: good ? "color-mix(in srgb, var(--color-primary) 10%, transparent)" : "#f1f5f9",
        borderRadius: 6,
        padding: "1px 8px",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {score}/5
    </span>
  );
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const activeFields = BREAKDOWN_FIELDS.filter((f) => review[f.key] != null);
  const hasBreakdown = activeFields.length > 0;

  return (
    <div
      style={{
        padding: "1rem 1.25rem",
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "0.7rem",
      }}
    >
      {/* Header: avatar + name + date + overall stars */}
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
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
            {formatArabicDate(review.createdAt)}
          </p>
        </div>
        <OverallStars score={review.score} />
      </div>

      {/* Comment */}
      {review.comment && (
        <p
          style={{
            margin: 0,
            fontSize: "0.88rem",
            color: "var(--color-text)",
            lineHeight: 1.75,
          }}
        >
          {review.comment}
        </p>
      )}

      {/* Sub-rating breakdown — vertical list in a light box */}
      {hasBreakdown && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e9edf2",
            borderRadius: 10,
            padding: "0.6rem 0.9rem",
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {activeFields.map(({ key, label }, idx) => {
            const val = review[key] as number;
            const last = idx === activeFields.length - 1;
            return (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "0.5rem",
                  padding: "0.35rem 0",
                  borderBottom: last ? "none" : "1px solid #edf0f4",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {label}
                </span>
                <ScoreChip score={val} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
