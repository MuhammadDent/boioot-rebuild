"use client";

import type { UpgradeIntentResponse } from "@/features/subscription/types";

interface UpgradeModalProps {
  intent: UpgradeIntentResponse;
  onClose: () => void;
}

const REASON_ICONS: Record<string, string> = {
  upgrade:              "⬆️",
  downgrade:            "⬇️",
  cycle_change:         "🔄",
  new_subscription:     "🎉",
  already_subscribed:   "✓",
  no_account:           "⚠️",
};

const REASON_COLORS: Record<string, string> = {
  upgrade:           "var(--color-primary)",
  downgrade:         "#e65100",
  cycle_change:      "#1565c0",
  new_subscription:  "var(--color-primary)",
  already_subscribed:"var(--color-text-muted)",
  no_account:        "#c62828",
};

export default function UpgradeModal({ intent, onClose }: UpgradeModalProps) {
  const icon  = REASON_ICONS[intent.reason]  ?? "📋";
  const color = REASON_COLORS[intent.reason] ?? "var(--color-primary)";

  const isFree = intent.priceAmount === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position:        "fixed",
        inset:           0,
        zIndex:          1000,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        background:      "rgba(0,0,0,0.45)",
        backdropFilter:  "blur(3px)",
        padding:         "1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background:   "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        padding:      "2rem",
        maxWidth:     "440px",
        width:        "100%",
        boxShadow:    "0 24px 64px rgba(0,0,0,0.22)",
        direction:    "rtl",
        animation:    "fadeInUp 0.2s ease",
      }}>

        {/* Icon */}
        <div style={{
          fontSize:       "2.5rem",
          textAlign:      "center",
          marginBottom:   "1rem",
        }}>
          {icon}
        </div>

        {/* Plan change summary */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            gap:            "0.75rem",
            fontSize:       "1rem",
            fontWeight:     700,
            color:          "var(--color-text-primary)",
            marginBottom:   "0.5rem",
          }}>
            <span style={{
              background:   `${color}18`,
              color,
              padding:      "0.2rem 0.6rem",
              borderRadius: "6px",
            }}>
              {intent.currentPlanName}
            </span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "1.1rem" }}>→</span>
            <span style={{
              background:   `${color}18`,
              color,
              padding:      "0.2rem 0.6rem",
              borderRadius: "6px",
            }}>
              {intent.targetPlanName}
            </span>
          </div>

          <p style={{
            fontSize:   "0.92rem",
            color:      "var(--color-text-secondary)",
            margin:     "0.75rem 0",
            lineHeight: 1.6,
          }}>
            {intent.message}
          </p>

          {/* Price display */}
          {intent.allowed && !isFree && (
            <div style={{
              background:   "var(--color-bg-secondary)",
              borderRadius: "var(--radius-md)",
              padding:      "0.75rem 1rem",
              marginTop:    "1rem",
              display:      "flex",
              alignItems:   "center",
              justifyContent: "space-between",
              fontSize:     "0.9rem",
            }}>
              <span style={{ color: "var(--color-text-secondary)" }}>
                السعر المستحق
              </span>
              <span style={{ fontWeight: 800, color, fontSize: "1.05rem" }}>
                {intent.priceAmount.toLocaleString("ar-SY")} {intent.currencyCode}
                <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "var(--color-text-muted)", marginRight: "0.3rem" }}>
                  / {intent.billingCycle === "Yearly" ? "سنوياً" : "شهرياً"}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={onClose}
            style={{
              flex:         1,
              padding:      "0.7rem",
              borderRadius: "var(--radius-md)",
              border:       "1px solid var(--color-border)",
              background:   "transparent",
              cursor:       "pointer",
              fontFamily:   "inherit",
              fontSize:     "0.92rem",
              color:        "var(--color-text-secondary)",
            }}
          >
            إلغاء
          </button>

          {intent.allowed ? (
            <button
              onClick={onClose}
              title="سيتوفر الدفع قريباً"
              style={{
                flex:         2,
                padding:      "0.7rem",
                borderRadius: "var(--radius-md)",
                border:       "none",
                background:   color,
                color:        "#fff",
                cursor:       "not-allowed",
                fontFamily:   "inherit",
                fontSize:     "0.92rem",
                fontWeight:   700,
                opacity:      0.75,
              }}
            >
              تأكيد — الدفع قريباً 🔒
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                flex:         2,
                padding:      "0.7rem",
                borderRadius: "var(--radius-md)",
                border:       "none",
                background:   "var(--color-bg-secondary)",
                color:        "var(--color-text-muted)",
                cursor:       "pointer",
                fontFamily:   "inherit",
                fontSize:     "0.92rem",
                fontWeight:   600,
              }}
            >
              حسناً
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
