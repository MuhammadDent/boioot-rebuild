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

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 5) * 100;
  const color = score >= 4 ? "#22c55e" : score >= 3 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flex: 1 }}>
      <div
        style={{
          flex: 1,
          height: 5,
          borderRadius: 3,
          background: "var(--color-border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: "0.74rem",
          fontWeight: 600,
          color,
          minWidth: 22,
          textAlign: "center",
        }}
      >
        {score}/5
      </span>
    </div>
  );
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
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill={i <= score ? "#f59e0b" : "none"}
          stroke={i <= score ? "#f59e0b" : "var(--color-border)"}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      <span
        style={{
          fontSize: "0.78rem",
          fontWeight: 700,
          color: "#f59e0b",
          marginRight: 2,
        }}
      >
        {score}
      </span>
    </div>
  );
}

const BREAKDOWN_FIELDS: Array<{
  key: keyof RatingResponse;
  label: string;
}> = [
  { key: "cleanlinessRating",   label: "النظافة" },
  { key: "accuracyRating",      label: "دقة الوصف" },
  { key: "facilitiesRating",    label: "جودة المرافق" },
  { key: "communicationRating", label: "التواصل مع المالك" },
  { key: "commitmentRating",    label: "الالتزام بالاتفاق" },
  { key: "valueRating",         label: "القيمة مقابل السعر" },
];

export default function ReviewCard({ review }: ReviewCardProps) {
  const activeFields = BREAKDOWN_FIELDS.filter(
    (f) => review[f.key] != null
  );
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
        gap: "0.75rem",
      }}
    >
      {/* ── Header: avatar + name + date + overall stars ── */}
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

      {/* ── Comment ── */}
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

      {/* ── Detailed breakdown ── */}
      {hasBreakdown && (
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
            paddingTop: "0.65rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "0.45rem 1.25rem",
          }}
        >
          {activeFields.map(({ key, label }) => {
            const val = review[key] as number;
            return (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.76rem",
                    color: "var(--color-text-secondary)",
                    whiteSpace: "nowrap",
                    minWidth: 110,
                    flexShrink: 0,
                  }}
                >
                  {label}
                </span>
                <ScoreBar score={val} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
