"use client";

import { useState } from "react";
import { FEATURE_LABELS, FEATURE_ICONS } from "@/features/pricing/labels";
import type { PublicFeatureItem } from "@/features/pricing/types";

const FEATURE_TOOLTIPS: Record<string, string> = {
  featured_listings:   "إعلاناتك تظهر في أعلى نتائج البحث بشكل مميز",
  analytics_dashboard: "تقارير مفصّلة عن مشاهدات إعلاناتك وأداء حسابك",
  whatsapp_contact:    "يتواصل معك العملاء مباشرةً عبر واتساب من الإعلان",
  verified_badge:      "شارة التوثيق تزيد الثقة وتحسّن ظهورك",
  priority_support:    "دعم فني مخصص باستجابة أسرع من الدعم العادي",
};

function Tooltip({ text }: { text: string }) {
  return (
    <div style={{
      position:   "absolute",
      bottom:     "calc(100% + 6px)",
      right:      "50%",
      transform:  "translateX(50%)",
      background: "#1e293b",
      color:      "#fff",
      fontSize:   "0.72rem",
      lineHeight: 1.5,
      padding:    "0.4rem 0.65rem",
      borderRadius: 7,
      whiteSpace: "normal" as "normal",
      maxWidth:   220,
      textAlign:  "center",
      zIndex:     10,
      pointerEvents: "none",
      boxShadow:  "0 4px 12px rgba(0,0,0,0.25)",
    }}>
      {text}
      <div style={{
        position:    "absolute",
        top:         "100%",
        right:       "50%",
        transform:   "translateX(50%)",
        borderWidth: "5px 5px 0",
        borderStyle: "solid",
        borderColor: "#1e293b transparent transparent",
      }} />
    </div>
  );
}

interface FeatureListProps {
  features: PublicFeatureItem[];
}

export default function FeatureList({ features }: FeatureListProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  if (!features.length) return null;

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {features.map((f) => {
        const label   = FEATURE_LABELS[f.key] ?? f.name;
        const icon    = FEATURE_ICONS[f.key] ?? (f.isEnabled ? "✓" : "✕");
        const tooltip = FEATURE_TOOLTIPS[f.key];

        return (
          <li
            key={f.key}
            style={{
              display:    "flex",
              alignItems: "center",
              gap:        "0.5rem",
              fontSize:   "0.87rem",
              color:      f.isEnabled ? "var(--color-text)" : "var(--color-text-muted)",
              opacity:    f.isEnabled ? 1 : 0.5,
            }}
          >
            {/* Icon bubble */}
            <span style={{
              width:          "1.45rem",
              height:         "1.45rem",
              borderRadius:   "50%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              flexShrink:     0,
              fontSize:       "0.8rem",
              background:     f.isEnabled ? "var(--color-primary-subtle)" : "#f1f5f9",
            }}>
              {icon}
            </span>

            {/* Label */}
            <span style={{ flex: 1 }}>{label}</span>

            {/* Info icon with tooltip */}
            {tooltip && (
              <span
                style={{ position: "relative", cursor: "help", flexShrink: 0 }}
                onMouseEnter={() => setHovered(f.key)}
                onMouseLeave={() => setHovered(null)}
              >
                <span style={{
                  width:          "1rem",
                  height:         "1rem",
                  borderRadius:   "50%",
                  display:        "inline-flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  fontSize:       "0.6rem",
                  fontWeight:     700,
                  background:     "#e2e8f0",
                  color:          "#64748b",
                  lineHeight:     1,
                }}>
                  ؟
                </span>
                {hovered === f.key && <Tooltip text={tooltip} />}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
