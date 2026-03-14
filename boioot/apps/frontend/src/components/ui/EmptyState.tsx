import type { ReactNode } from "react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({
  title = "لا توجد نتائج",
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1rem",
        gap: "0.6rem",
        color: "var(--color-text-secondary)",
        textAlign: "center",
      }}
    >
      {icon ?? (
        <svg
          width="44"
          height="44"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.35 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )}

      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
        {title}
      </p>

      {description && (
        <p style={{ margin: 0, fontSize: "0.88rem", maxWidth: 320 }}>{description}</p>
      )}

      {action && <div style={{ marginTop: "0.5rem" }}>{action}</div>}
    </div>
  );
}
