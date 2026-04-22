"use client";

import { useState } from "react";

interface StarSelectorProps {
  value: number;
  onChange: (score: number) => void;
  disabled?: boolean;
  size?: number;
}

const LABELS: Record<number, string> = {
  1: "سيء جداً",
  2: "سيء",
  3: "مقبول",
  4: "جيد",
  5: "ممتاز",
};

export default function StarSelector({
  value,
  onChange,
  disabled = false,
  size = 28,
}: StarSelectorProps) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div>
      <div style={{ display: "inline-flex", gap: "4px", direction: "ltr" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(i)}
            onMouseEnter={() => !disabled && setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            aria-label={`${i} نجوم`}
            style={{
              background: "none",
              border: "none",
              padding: "2px",
              cursor: disabled ? "default" : "pointer",
              lineHeight: 1,
              opacity: disabled ? 0.5 : 1,
              transition: "transform 0.1s",
              transform: display === i ? "scale(1.15)" : "scale(1)",
            }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={i <= display ? "#f59e0b" : "none"}
              stroke={i <= display ? "#f59e0b" : "#9ca3af"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>
      {display > 0 && (
        <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
          {LABELS[display]}
        </p>
      )}
    </div>
  );
}
