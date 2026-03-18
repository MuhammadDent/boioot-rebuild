import { LIMIT_LABELS, LIMIT_ICONS, formatLimitValue } from "@/features/pricing/labels";
import type { PublicLimitItem } from "@/features/pricing/types";

interface LimitListProps {
  limits: PublicLimitItem[];
}

export default function LimitList({ limits }: LimitListProps) {
  if (!limits.length) return null;

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      {limits.map((l) => {
        const label     = LIMIT_LABELS[l.key] ?? l.name;
        const icon      = LIMIT_ICONS[l.key] ?? "•";
        const formatted = formatLimitValue(l.value, l.unit);
        const unlimited = l.value === -1;
        const unavailable = l.value === 0;

        return (
          <li
            key={l.key}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
              fontSize:       "0.86rem",
              gap:            "0.5rem",
              color:          unavailable ? "var(--color-text-muted)" : "var(--color-text)",
              opacity:        unavailable ? 0.55 : 1,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.9rem" }}>{icon}</span>
              {label}
            </span>
            <span style={{
              fontWeight: 700,
              fontSize:   "0.82rem",
              color:      unlimited
                ? "var(--color-primary)"
                : unavailable
                  ? "var(--color-text-muted)"
                  : "var(--color-text-primary)",
            }}>
              {formatted}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
