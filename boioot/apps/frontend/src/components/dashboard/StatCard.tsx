import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  accent?: "green" | "blue" | "purple" | "orange" | "rose";
}

const accentMap = {
  green:  { bg: "#f0fdf4", icon: "#16a34a", border: "#bbf7d0" },
  blue:   { bg: "#eff6ff", icon: "#2563eb", border: "#bfdbfe" },
  purple: { bg: "#faf5ff", icon: "#7c3aed", border: "#ddd6fe" },
  orange: { bg: "#fff7ed", icon: "#ea580c", border: "#fed7aa" },
  rose:   { bg: "#fff1f2", icon: "#e11d48", border: "#fecdd3" },
};

export default function StatCard({ title, value, icon: Icon, subtitle, accent = "green" }: StatCardProps) {
  const colors = accentMap[accent];

  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: 16,
      border: "1px solid #f1f5f9",
      padding: "1.1rem 1.2rem",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      display: "flex",
      flexDirection: "column",
      gap: "0.6rem",
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={20} color={colors.icon} strokeWidth={2} />
      </div>

      <div>
        <p style={{
          margin: 0,
          fontSize: "1.7rem",
          fontWeight: 800,
          color: "#0f172a",
          lineHeight: 1.1,
          direction: "ltr",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}>
          {typeof value === "number" ? value.toLocaleString("en") : value}
        </p>
        <p style={{
          margin: "0.25rem 0 0",
          fontSize: "0.82rem",
          fontWeight: 600,
          color: "#475569",
        }}>
          {title}
        </p>
        {subtitle && (
          <p style={{
            margin: "0.2rem 0 0",
            fontSize: "0.74rem",
            color: "#94a3b8",
            fontWeight: 400,
          }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
