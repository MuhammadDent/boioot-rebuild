"use client";

import { useState } from "react";
import {
  LIMIT_LABELS,
  LIMIT_ICONS,
  FEATURE_LABELS,
  FEATURE_ICONS,
  formatLimitValue,
  formatPrice,
} from "@/features/pricing/labels";
import { AUDIENCE_TYPE_LABEL } from "@/features/pricing/planCompatibility";
import type { PublicPricingItem, PublicPricingEntry } from "@/features/pricing/types";

const CYCLE_LABEL: Record<string, string> = {
  Monthly: "شهري",
  Yearly:  "سنوي",
  OneTime: "دفعة واحدة",
};


function yearlySaving(monthlyAmount: number, yearlyAmount: number): number {
  if (!monthlyAmount || !yearlyAmount) return 0;
  const effectiveMonthly = yearlyAmount / 12;
  return Math.round((1 - effectiveMonthly / monthlyAmount) * 100);
}

interface PlanDetailsModalProps {
  plan:       PublicPricingItem;
  isCurrent?: boolean;
  defaultCycle?: "Monthly" | "Yearly";
  onClose:    () => void;
  onChoose?:  (plan: PublicPricingItem, pricing: PublicPricingEntry) => void;
}

export default function PlanDetailsModal({
  plan,
  isCurrent = false,
  defaultCycle,
  onClose,
  onChoose,
}: PlanDetailsModalProps) {
  const hasMonthly = plan.pricing.some(p => p.billingCycle === "Monthly");
  const hasYearly  = plan.pricing.some(p => p.billingCycle === "Yearly");
  const isOneTime  = plan.planBillingType === "one_time_fixed_term"
    || plan.pricing.every(p => p.billingCycle === "OneTime");

  const initialCycle: "Monthly" | "Yearly" =
    defaultCycle ?? (hasMonthly ? "Monthly" : "Yearly");

  const [cycle, setCycle] = useState<"Monthly" | "Yearly">(initialCycle);

  const activePricing: PublicPricingEntry | undefined = isOneTime
    ? plan.pricing[0]
    : (plan.pricing.find(p => p.billingCycle === cycle) ?? plan.pricing[0]);

  const monthlyEntry = plan.pricing.find(p => p.billingCycle === "Monthly");
  const yearlyEntry  = plan.pricing.find(p => p.billingCycle === "Yearly");
  const saving       = monthlyEntry && yearlyEntry
    ? yearlySaving(monthlyEntry.priceAmount, yearlyEntry.priceAmount)
    : 0;

  const isFree     = activePricing ? activePricing.priceAmount === 0 : true;
  const audienceAr = plan.audienceType
    ? (AUDIENCE_TYPE_LABEL[plan.audienceType.toLowerCase()] ?? plan.audienceType)
    : null;

  const enabledFeatures  = plan.features.filter(f => f.isEnabled);
  const disabledFeatures = plan.features.filter(f => !f.isEnabled);

  function handleChoose() {
    if (!activePricing || !onChoose) return;
    onChoose(plan, activePricing);
    onClose();
  }

  return (
    <div
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          1100,
        backgroundColor: "rgba(0,0,0,0.52)",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "1rem",
        direction:       "rtl",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: "#fff",
        borderRadius:    20,
        width:           "100%",
        maxWidth:        540,
        maxHeight:       "92vh",
        overflowY:       "auto",
        boxShadow:       "0 24px 64px rgba(0,0,0,0.22)",
        display:         "flex",
        flexDirection:   "column",
      }}>

        {/* ── Header ── */}
        <div style={{
          padding:      "1.4rem 1.6rem 1rem",
          borderBottom: "1px solid #f1f5f9",
          position:     "sticky",
          top:          0,
          background:   "#fff",
          zIndex:       1,
          borderRadius: "20px 20px 0 0",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              {/* Badges */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.4rem" }}>
                {isCurrent && (
                  <span style={{
                    display:         "inline-flex",
                    alignItems:      "center",
                    gap:             "0.25rem",
                    padding:         "0.2rem 0.7rem",
                    borderRadius:    999,
                    fontSize:        "0.72rem",
                    fontWeight:      700,
                    backgroundColor: "#dbeafe",
                    color:           "#1d4ed8",
                    border:          "1.5px solid #93c5fd",
                  }}>
                    ✓ باقتك الحالية
                  </span>
                )}
                {plan.isRecommended && !isCurrent && (
                  <span style={{
                    display:         "inline-flex",
                    alignItems:      "center",
                    gap:             "0.25rem",
                    padding:         "0.2rem 0.7rem",
                    borderRadius:    999,
                    fontSize:        "0.72rem",
                    fontWeight:      700,
                    backgroundColor: "#d1fae5",
                    color:           "#065f46",
                    border:          "1.5px solid #6ee7b7",
                  }}>
                    🏆 الأكثر شعبية
                  </span>
                )}
                {audienceAr && (
                  <span style={{
                    display:         "inline-flex",
                    padding:         "0.2rem 0.7rem",
                    borderRadius:    999,
                    fontSize:        "0.72rem",
                    fontWeight:      600,
                    backgroundColor: "#f8fafc",
                    color:           "#475569",
                    border:          "1px solid #e2e8f0",
                  }}>
                    {audienceAr}
                  </span>
                )}
              </div>

              {/* Plan name */}
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 900, color: "#1a2e1a", lineHeight: 1.2 }}>
                {plan.displayNameAr ?? plan.planName}
              </h2>

              {plan.description && (
                <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>
                  {plan.description}
                </p>
              )}
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              type="button"
              style={{
                background:    "none",
                border:        "1px solid #e2e8f0",
                cursor:        "pointer",
                color:         "#94a3b8",
                fontSize:      "1rem",
                lineHeight:    1,
                padding:       "0.35rem 0.6rem",
                borderRadius:  8,
                flexShrink:    0,
              }}
              aria-label="إغلاق"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "1.25rem 1.6rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* ── Pricing ── */}
          <div>
            <p style={{ margin: "0 0 0.65rem", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              السعر
            </p>

            {/* Cycle toggle */}
            {!isOneTime && hasMonthly && hasYearly && (
              <div style={{
                display:         "flex",
                gap:             "0.5rem",
                marginBottom:    "1rem",
              }}>
                {(["Monthly", "Yearly"] as const).map(c => {
                  const isActive = cycle === c;
                  const entry = plan.pricing.find(p => p.billingCycle === c);
                  if (!entry) return null;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCycle(c)}
                      style={{
                        flex:            1,
                        padding:         "0.65rem 0.75rem",
                        borderRadius:    10,
                        border:          isActive ? "2px solid #059669" : "1.5px solid #e2e8f0",
                        backgroundColor: isActive ? "#f0fdf4" : "#f8fafc",
                        cursor:          "pointer",
                        textAlign:       "center",
                        transition:      "all 0.15s",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: isActive ? "#065f46" : "#374151" }}>
                        {CYCLE_LABEL[c]}
                        {c === "Yearly" && saving > 0 && (
                          <span style={{
                            marginRight: "0.4rem",
                            display:     "inline-block",
                            padding:     "0.05rem 0.4rem",
                            borderRadius: 999,
                            backgroundColor: "#dcfce7",
                            color:       "#15803d",
                            fontSize:    "0.68rem",
                            fontWeight:  700,
                          }}>
                            وفّر {saving}%
                          </span>
                        )}
                      </p>
                      <p style={{ margin: "0.15rem 0 0", fontSize: "0.88rem", fontWeight: 800, color: isActive ? "#059669" : "#64748b" }}>
                        {entry.priceAmount === 0 ? "مجاني" : `${entry.priceAmount.toLocaleString("ar-SY")} ${entry.currencyCode}`}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Price display */}
            {activePricing && (
              <div style={{
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "space-between",
                padding:         "1rem 1.25rem",
                backgroundColor: isFree ? "#f0fdf4" : "#f8fafc",
                borderRadius:    12,
                border:          isFree ? "1.5px solid #bbf7d0" : "1.5px solid #e2e8f0",
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: "1.9rem", fontWeight: 900, color: isFree ? "#059669" : "#1a2e1a", lineHeight: 1 }}>
                    {isFree ? "مجاني" : `${activePricing.priceAmount.toLocaleString("ar-SY")}`}
                  </p>
                  {!isFree && (
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                      {activePricing.currencyCode}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>
                    {isOneTime ? "دفعة واحدة" : `/ ${CYCLE_LABEL[activePricing.billingCycle] ?? activePricing.billingCycle}`}
                  </p>
                  {!isOneTime && cycle === "Yearly" && activePricing.priceAmount > 0 && (
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                      ≈ {Math.round(activePricing.priceAmount / 12).toLocaleString("ar-SY")} {activePricing.currencyCode} / شهر
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Limits ── */}
          {plan.limits.length > 0 && (
            <div>
              <p style={{ margin: "0 0 0.65rem", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                الحدود والإمكانيات
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                {plan.limits.map(l => {
                  const label      = LIMIT_LABELS[l.key] ?? l.name;
                  const icon       = LIMIT_ICONS[l.key] ?? "•";
                  const formatted  = formatLimitValue(l.value, l.unit);
                  const unlimited  = l.value === -1;
                  const unavail    = l.value === 0;

                  return (
                    <div
                      key={l.key}
                      style={{
                        display:         "flex",
                        alignItems:      "center",
                        justifyContent:  "space-between",
                        padding:         "0.6rem 0.9rem",
                        borderRadius:    9,
                        backgroundColor: unavail
                          ? "#f8fafc"
                          : unlimited
                            ? "#f0fdf4"
                            : "#f8fafc",
                        border:          unavail
                          ? "1px solid #f1f5f9"
                          : unlimited
                            ? "1px solid #bbf7d0"
                            : "1px solid #f1f5f9",
                        opacity: unavail ? 0.6 : 1,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
                        <span style={{ fontSize: "0.86rem", color: "#374151" }}>{label}</span>
                      </div>
                      <span style={{
                        fontSize:   "0.88rem",
                        fontWeight: 700,
                        color:      unlimited ? "#059669" : unavail ? "#94a3b8" : "#1e293b",
                      }}>
                        {formatted}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Features ── */}
          {plan.features.length > 0 && (
            <div>
              <p style={{ margin: "0 0 0.65rem", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                الميزات
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {/* Enabled first */}
                {enabledFeatures.map(f => {
                  const label = FEATURE_LABELS[f.key] ?? f.name;
                  const icon  = FEATURE_ICONS[f.key] ?? "✓";
                  return (
                    <div
                      key={f.key}
                      style={{
                        display:         "flex",
                        alignItems:      "center",
                        gap:             "0.65rem",
                        padding:         "0.5rem 0.25rem",
                        borderBottom:    "1px solid #f1f5f9",
                      }}
                    >
                      <span style={{
                        width:           "1.6rem",
                        height:          "1.6rem",
                        borderRadius:    "50%",
                        display:         "flex",
                        alignItems:      "center",
                        justifyContent:  "center",
                        flexShrink:      0,
                        fontSize:        "0.85rem",
                        backgroundColor: "#f0fdf4",
                        border:          "1px solid #bbf7d0",
                      }}>
                        {icon}
                      </span>
                      <span style={{ fontSize: "0.88rem", color: "#1e293b", fontWeight: 500 }}>
                        {label}
                      </span>
                      <span style={{ marginRight: "auto", fontSize: "0.8rem", fontWeight: 700, color: "#059669" }}>
                        ✓ متاح
                      </span>
                    </div>
                  );
                })}
                {/* Disabled */}
                {disabledFeatures.map(f => {
                  const label = FEATURE_LABELS[f.key] ?? f.name;
                  return (
                    <div
                      key={f.key}
                      style={{
                        display:      "flex",
                        alignItems:   "center",
                        gap:          "0.65rem",
                        padding:      "0.5rem 0.25rem",
                        borderBottom: "1px solid #f1f5f9",
                        opacity:      0.45,
                      }}
                    >
                      <span style={{
                        width:           "1.6rem",
                        height:          "1.6rem",
                        borderRadius:    "50%",
                        display:         "flex",
                        alignItems:      "center",
                        justifyContent:  "center",
                        flexShrink:      0,
                        fontSize:        "0.85rem",
                        backgroundColor: "#f8fafc",
                        border:          "1px solid #e2e8f0",
                      }}>
                        ✕
                      </span>
                      <span style={{ fontSize: "0.88rem", color: "#64748b" }}>
                        {label}
                      </span>
                      <span style={{ marginRight: "auto", fontSize: "0.8rem", color: "#94a3b8" }}>
                        غير متاح
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Trust note ── */}
          <div style={{
            backgroundColor: "#fffbeb",
            border:          "1px solid #fcd34d",
            borderRadius:    10,
            padding:         "0.75rem 1rem",
            fontSize:        "0.8rem",
            color:           "#92400e",
            lineHeight:      1.6,
          }}>
            🔒 بعد اختيار الباقة وإتمام الدفع، سيقوم فريقنا بمراجعة الطلب وتفعيل الاشتراك خلال 24 ساعة.
          </div>

        </div>

        {/* ── Footer / CTA ── */}
        <div style={{
          padding:      "1rem 1.6rem 1.5rem",
          borderTop:    "1px solid #f1f5f9",
          position:     "sticky",
          bottom:       0,
          background:   "#fff",
          borderRadius: "0 0 20px 20px",
          display:      "flex",
          gap:          "0.65rem",
        }}>
          <button
            onClick={onClose}
            type="button"
            style={{
              flex:            "0 0 auto",
              padding:         "0.75rem 1.25rem",
              borderRadius:    10,
              border:          "1.5px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              color:           "#475569",
              fontSize:        "0.9rem",
              fontWeight:      600,
              cursor:          "pointer",
            }}
          >
            إغلاق
          </button>

          {onChoose && !isCurrent && activePricing && (
            <button
              onClick={handleChoose}
              type="button"
              style={{
                flex:            1,
                padding:         "0.75rem",
                borderRadius:    10,
                border:          "none",
                backgroundColor: plan.isRecommended ? "#059669" : "#1a2e1a",
                color:           "#fff",
                fontSize:        "0.97rem",
                fontWeight:      700,
                cursor:          "pointer",
                boxShadow:       plan.isRecommended ? "0 4px 14px rgba(5,150,105,0.3)" : undefined,
              }}
            >
              {isFree ? "تفعيل مجاني" : "اختر هذه الباقة →"}
            </button>
          )}

          {isCurrent && (
            <div style={{
              flex:            1,
              padding:         "0.75rem",
              borderRadius:    10,
              border:          "1.5px solid #93c5fd",
              backgroundColor: "#eff6ff",
              color:           "#1d4ed8",
              fontSize:        "0.9rem",
              fontWeight:      700,
              textAlign:       "center",
            }}>
              ✓ أنت مشترك في هذه الباقة حالياً
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
