interface FunnelStep {
  label:     string;
  eventKey:  string;
  count:     number;
  icon?:     string;
}

interface FunnelProps {
  steps: FunnelStep[];
}

function pct(a: number, b: number): string {
  if (b === 0) return "—";
  return (Math.round((a / b) * 100)).toString() + "%";
}

export default function Funnel({ steps }: FunnelProps) {
  if (!steps.length) {
    return (
      <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", textAlign: "center", padding: "1.5rem 0" }}>
        لا توجد بيانات بعد
      </p>
    );
  }

  const maxCount = Math.max(...steps.map((s) => s.count), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      {steps.map((step, i) => {
        const prev      = i > 0 ? steps[i - 1].count : null;
        const dropPct   = prev !== null ? pct(step.count, prev) : null;
        const barWidth  = `${Math.round((step.count / maxCount) * 100)}%`;

        return (
          <div key={step.eventKey}>
            {/* Drop indicator between steps */}
            {dropPct !== null && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.15rem 0.5rem 0.15rem 0",
                marginRight: "0.25rem",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600 }}>
                  {dropPct} نسبة التحويل
                </span>
              </div>
            )}

            {/* Step row */}
            <div style={{
              background: "#f8fafc",
              border: "1px solid #f1f5f9",
              borderRadius: 10,
              padding: "0.7rem 1rem",
              direction: "rtl",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.45rem",
                gap: "0.5rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {step.icon && <span style={{ fontSize: "0.95rem" }}>{step.icon}</span>}
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                    {step.label}
                  </span>
                </div>
                <span style={{
                  fontSize: "1rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  fontVariantNumeric: "tabular-nums",
                  direction: "ltr",
                }}>
                  {step.count.toLocaleString("en")}
                </span>
              </div>

              {/* Bar */}
              <div style={{
                height: 6,
                background: "#e2e8f0",
                borderRadius: 99,
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: barWidth,
                  borderRadius: 99,
                  background: i === 0
                    ? "#2563eb"
                    : i === steps.length - 1
                      ? "#16a34a"
                      : "#7c3aed",
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
