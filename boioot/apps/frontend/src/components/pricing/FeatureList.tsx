import { FEATURE_LABELS } from "@/features/pricing/labels";
import type { PublicFeatureItem } from "@/features/pricing/types";

interface FeatureListProps {
  features: PublicFeatureItem[];
}

export default function FeatureList({ features }: FeatureListProps) {
  if (!features.length) return null;

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.55rem" }}>
      {features.map((f) => {
        const label = FEATURE_LABELS[f.key] ?? f.name;
        return (
          <li
            key={f.key}
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        "0.55rem",
              fontSize:   "0.88rem",
              color:      f.isEnabled ? "var(--color-text)" : "var(--color-text-muted)",
              opacity:    f.isEnabled ? 1 : 0.6,
            }}
          >
            <span style={{
              width:          "1.15rem",
              height:         "1.15rem",
              borderRadius:   "50%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
              fontSize:       "0.7rem",
              fontWeight:     700,
              background:     f.isEnabled ? "var(--color-primary-subtle)" : "var(--color-bg-secondary)",
              color:          f.isEnabled ? "var(--color-primary)" : "var(--color-text-muted)",
            }}>
              {f.isEnabled ? "✓" : "✕"}
            </span>
            {label}
          </li>
        );
      })}
    </ul>
  );
}
