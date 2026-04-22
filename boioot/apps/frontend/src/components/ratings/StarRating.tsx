"use client";

interface StarRatingProps {
  score: number;
  size?: number;
  showNumber?: boolean;
}

export default function StarRating({ score, size = 16, showNumber = false }: StarRatingProps) {
  const filled = Math.round(score);

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= filled ? "#f59e0b" : "none"}
          stroke={i <= filled ? "#f59e0b" : "#d1d5db"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      {showNumber && score > 0 && (
        <span style={{ fontSize: size * 0.85, fontWeight: 600, color: "#f59e0b", marginRight: 2 }}>
          {score.toFixed(1)}
        </span>
      )}
    </span>
  );
}
