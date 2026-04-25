interface TopListItem {
  label: string;
  count: number;
  sub?:  string;
}

interface TopListProps {
  title:    string;
  items:    TopListItem[];
  icon?:    string;
  unit?:    string;
}

const rankColors = ["#f59e0b", "#94a3b8", "#cd7f32"];

export default function TopList({ title, items, icon, unit = "مشاهدة" }: TopListProps) {
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #f1f5f9",
      borderRadius: 14,
      padding: "1rem 1.1rem",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <p style={{
        margin: "0 0 0.85rem",
        fontSize: "0.85rem",
        fontWeight: 700,
        color: "#0f172a",
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        direction: "rtl",
      }}>
        {icon && <span style={{ fontSize: "1rem" }}>{icon}</span>}
        {title}
      </p>

      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", padding: "1rem 0" }}>
          لا توجد بيانات بعد
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          {items.map((item, i) => (
            <div key={item.label + i} style={{ direction: "rtl" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.2rem",
              }}>
                <span style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: i < 3 ? rankColors[i] : "#e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  color: i < 3 ? "#fff" : "#64748b",
                  flexShrink: 0,
                }}>
                  {i + 1}
                </span>
                <span style={{
                  flex: 1,
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: "#1e293b",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {item.label}
                </span>
                <span style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#475569",
                  whiteSpace: "nowrap",
                  fontVariantNumeric: "tabular-nums",
                  direction: "ltr",
                }}>
                  {item.count.toLocaleString("en")} {unit}
                </span>
              </div>
              <div style={{ height: 3, background: "#f1f5f9", borderRadius: 99, marginRight: 26 }}>
                <div style={{
                  height: "100%",
                  width: `${Math.round((item.count / max) * 100)}%`,
                  borderRadius: 99,
                  background: i < 3 ? rankColors[i] : "#cbd5e1",
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
