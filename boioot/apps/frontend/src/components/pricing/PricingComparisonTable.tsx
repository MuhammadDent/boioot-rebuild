"use client";

import type { PublicPricingItem } from "@/features/pricing/types";
import type { CurrentSubscriptionResponse } from "@/features/subscription/types";

// ── Icon hints for well-known keys ────────────────────────────────────────────

const LIMIT_ICONS: Record<string, string> = {
  max_active_listings:    "📢",
  max_images_per_listing: "🖼",
  max_agents:             "👤",
  max_projects:           "🏗",
  max_featured_slots:     "⭐",
  max_videos_per_listing: "🎬",
};

const FEATURE_ICONS: Record<string, string> = {
  featured_listings:   "⭐",
  analytics_dashboard: "📊",
  whatsapp_contact:    "📱",
  verified_badge:      "✅",
  priority_support:    "⚡",
  internal_chat:       "💬",
  video_upload:        "🎬",
  project_management:  "🏗",
};

// ── Value formatters ───────────────────────────────────────────────────────────

function formatLimit(value: number | undefined): { text: string; color: string; weight: number } {
  if (value === undefined || value === 0) return { text: "—",  color: "#94a3b8", weight: 400 };
  if (value === -1)                       return { text: "∞",  color: "#059669", weight: 900 };
  return { text: String(value),           color: "#1e293b",   weight: 700 };
}

function FeatureBadge({ enabled }: { enabled: boolean }) {
  return (
    <span style={{
      display:        "inline-flex",
      alignItems:     "center",
      justifyContent: "center",
      width:          "1.6rem",
      height:         "1.6rem",
      borderRadius:   "50%",
      fontSize:       "0.82rem",
      background:     enabled ? "#dcfce7" : "#f1f5f9",
      color:          enabled ? "#15803d" : "#94a3b8",
      fontWeight:     700,
    }}>
      {enabled ? "✔" : "✗"}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  plans:               PublicPricingItem[];
  currentSubscription: CurrentSubscriptionResponse | null;
}

export default function PricingComparisonTable({ plans, currentSubscription }: Props) {
  if (plans.length === 0) return null;

  const colW = `${Math.max(110, Math.floor(640 / plans.length))}px`;

  // ── Derive rows dynamically from plan data ────────────────────────────────
  // Collect all unique limit keys across all plans (preserving encounter order)
  const seenLimitKeys = new Set<string>();
  const limitRows: { key: string; label: string; icon: string }[] = [];
  for (const plan of plans) {
    for (const lim of plan.limits ?? []) {
      if (!seenLimitKeys.has(lim.key)) {
        seenLimitKeys.add(lim.key);
        limitRows.push({ key: lim.key, label: lim.name, icon: LIMIT_ICONS[lim.key] ?? "🔢" });
      }
    }
  }

  // Collect all unique feature keys across all plans
  const seenFeatureKeys = new Set<string>();
  const featureRows: { key: string; label: string; icon: string }[] = [];
  for (const plan of plans) {
    for (const feat of plan.features ?? []) {
      if (!seenFeatureKeys.has(feat.key)) {
        seenFeatureKeys.add(feat.key);
        featureRows.push({ key: feat.key, label: feat.name, icon: FEATURE_ICONS[feat.key] ?? feat.icon ?? "✦" });
      }
    }
  }

  function isCurrent(plan: PublicPricingItem) {
    return currentSubscription?.planId === plan.planId;
  }

  function isBest(plan: PublicPricingItem) {
    return plan.isRecommended;
  }

  return (
    <section style={{ marginTop: "3rem" }}>

      {/* ── Heading ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.07em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          مقارنة تفصيلية
        </span>
        <div style={{ flex: 1, height: 1, background: "var(--color-border)" }} />
      </div>

      {/* ── Scrollable table ── */}
      <div style={{ overflowX: "auto", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: `${120 + plans.length * 110}px` }}>

          {/* ── Column headers ── */}
          <thead>
            <tr style={{ borderBottom: "2px solid var(--color-border)", background: "var(--color-bg-secondary)" }}>
              {/* Feature label column */}
              <th style={{
                padding:       "1rem 1.2rem",
                textAlign:     "right",
                fontSize:      "0.8rem",
                fontWeight:    700,
                color:         "var(--color-text-muted)",
                letterSpacing: "0.05em",
                width:         "160px",
                minWidth:      "140px",
                position:      "sticky",
                right:         0,
                background:    "var(--color-bg-secondary)",
                zIndex:        1,
              }}>
                الميزة / الحد
              </th>

              {plans.map(plan => (
                <th
                  key={plan.planId}
                  style={{
                    padding:       "1rem 0.75rem",
                    textAlign:     "center",
                    width:         colW,
                    minWidth:      "110px",
                    background:    isBest(plan)
                      ? "linear-gradient(180deg, #f0fdf4 0%, var(--color-bg-secondary) 100%)"
                      : isCurrent(plan)
                        ? "var(--color-primary-subtle)"
                        : "transparent",
                    borderRight:   isBest(plan) ? "2px solid #047857" : isCurrent(plan) ? "2px solid var(--color-primary)" : "none",
                    borderLeft:    isBest(plan) ? "2px solid #047857" : isCurrent(plan) ? "2px solid var(--color-primary)" : "none",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
                    {isBest(plan) && (
                      <span style={{
                        fontSize:     "0.65rem",
                        fontWeight:   800,
                        background:   "#047857",
                        color:        "#fff",
                        padding:      "0.1rem 0.55rem",
                        borderRadius: "999px",
                        letterSpacing: "0.04em",
                      }}>
                        🏆 الأفضل
                      </span>
                    )}
                    {isCurrent(plan) && !isBest(plan) && (
                      <span style={{
                        fontSize:     "0.65rem",
                        fontWeight:   700,
                        background:   "var(--color-primary)",
                        color:        "#fff",
                        padding:      "0.1rem 0.5rem",
                        borderRadius: "999px",
                      }}>
                        ✓ حالية
                      </span>
                    )}
                    <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--color-text-primary)" }}>
                      {plan.displayNameAr ?? plan.planName}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ── Limits group ── */}
            <tr style={{ background: "#f8fafc" }}>
              <td
                colSpan={plans.length + 1}
                style={{
                  padding:       "0.5rem 1.2rem",
                  fontSize:      "0.72rem",
                  fontWeight:    700,
                  color:         "var(--color-text-muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  position:      "sticky",
                  right:         0,
                  background:    "#f8fafc",
                }}
              >
                الحدود
              </td>
            </tr>

            {limitRows.map((row, idx) => (
              <tr
                key={row.key}
                style={{
                  background:  idx % 2 === 0 ? "var(--color-surface)" : "#f8fafc",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                {/* Row label — sticky */}
                <td style={{
                  padding:    "0.75rem 1.2rem",
                  fontSize:   "0.86rem",
                  fontWeight: 600,
                  color:      "var(--color-text-secondary)",
                  position:   "sticky",
                  right:      0,
                  background: idx % 2 === 0 ? "var(--color-surface)" : "#f8fafc",
                  zIndex:     1,
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ marginLeft: "0.4rem" }}>{row.icon}</span>
                  {row.label}
                </td>

                {plans.map(plan => {
                  const limitItem = plan.limits.find(l => l.key === row.key);
                  const { text, color, weight } = formatLimit(
                    limitItem ? Number(limitItem.value) : undefined
                  );
                  return (
                    <td
                      key={plan.planId}
                      style={{
                        padding:      "0.75rem 0.75rem",
                        textAlign:    "center",
                        fontSize:     "0.95rem",
                        fontWeight:   weight,
                        color,
                        background:   isBest(plan)
                          ? "rgba(240,253,244,0.6)"
                          : isCurrent(plan)
                            ? "rgba(240,253,244,0.3)"
                            : "transparent",
                        borderRight:  isBest(plan)  ? "2px solid #047857" : isCurrent(plan) ? "2px solid var(--color-primary)" : "none",
                        borderLeft:   isBest(plan)  ? "2px solid #047857" : isCurrent(plan) ? "2px solid var(--color-primary)" : "none",
                      }}
                    >
                      {text}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* ── Features group ── */}
            <tr style={{ background: "#f8fafc" }}>
              <td
                colSpan={plans.length + 1}
                style={{
                  padding:       "0.5rem 1.2rem",
                  fontSize:      "0.72rem",
                  fontWeight:    700,
                  color:         "var(--color-text-muted)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  borderTop:     "2px solid var(--color-border)",
                  position:      "sticky",
                  right:         0,
                  background:    "#f8fafc",
                }}
              >
                الميزات
              </td>
            </tr>

            {featureRows.map((row, idx) => (
              <tr
                key={row.key}
                style={{
                  background:   idx % 2 === 0 ? "var(--color-surface)" : "#f8fafc",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <td style={{
                  padding:    "0.75rem 1.2rem",
                  fontSize:   "0.86rem",
                  fontWeight: 600,
                  color:      "var(--color-text-secondary)",
                  position:   "sticky",
                  right:      0,
                  background: idx % 2 === 0 ? "var(--color-surface)" : "#f8fafc",
                  zIndex:     1,
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ marginLeft: "0.4rem" }}>{row.icon}</span>
                  {row.label}
                </td>

                {plans.map(plan => {
                  const feat = plan.features.find(f => f.key === row.key);
                  return (
                    <td
                      key={plan.planId}
                      style={{
                        padding:     "0.65rem 0.75rem",
                        textAlign:   "center",
                        background:  isBest(plan)
                          ? "rgba(240,253,244,0.6)"
                          : isCurrent(plan)
                            ? "rgba(240,253,244,0.3)"
                            : "transparent",
                        borderRight: isBest(plan)  ? "2px solid #047857" : isCurrent(plan) ? "2px solid var(--color-primary)" : "none",
                        borderLeft:  isBest(plan)  ? "2px solid #047857" : isCurrent(plan) ? "2px solid var(--color-primary)" : "none",
                      }}
                    >
                      <FeatureBadge enabled={feat?.isEnabled ?? false} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
