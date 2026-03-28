"use client";

export type BillingCycle = "Monthly" | "Yearly" | "OneTime";

interface BillingToggleProps {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  yearlySavingPct?: number;
}

export default function BillingToggle({ cycle, onChange, yearlySavingPct = 17 }: BillingToggleProps) {
  return (
    <div style={{
      display:        "inline-flex",
      alignItems:     "center",
      gap:            "0.75rem",
      background:     "var(--color-bg-secondary)",
      borderRadius:   "999px",
      padding:        "0.35rem 0.5rem",
      border:         "1px solid var(--color-border)",
    }}>
      <button
        onClick={() => onChange("Monthly")}
        style={{
          padding:      "0.45rem 1.1rem",
          borderRadius: "999px",
          border:       "none",
          cursor:       "pointer",
          fontFamily:   "inherit",
          fontSize:     "0.9rem",
          fontWeight:   600,
          transition:   "all 0.2s",
          background:   cycle === "Monthly" ? "var(--color-primary)" : "transparent",
          color:        cycle === "Monthly" ? "#fff" : "var(--color-text-secondary)",
        }}
      >
        شهري
      </button>

      <button
        onClick={() => onChange("Yearly")}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "0.4rem",
          padding:      "0.45rem 1.1rem",
          borderRadius: "999px",
          border:       "none",
          cursor:       "pointer",
          fontFamily:   "inherit",
          fontSize:     "0.9rem",
          fontWeight:   600,
          transition:   "all 0.2s",
          background:   cycle === "Yearly" ? "var(--color-primary)" : "transparent",
          color:        cycle === "Yearly" ? "#fff" : "var(--color-text-secondary)",
        }}
      >
        سنوي
        {cycle !== "Yearly" && (
          <span style={{
            fontSize:     "0.72rem",
            fontWeight:   700,
            background:   "#ff7043",
            color:        "#fff",
            borderRadius: "999px",
            padding:      "0.1rem 0.45rem",
          }}>
            وفر {yearlySavingPct}%
          </span>
        )}
      </button>
    </div>
  );
}
