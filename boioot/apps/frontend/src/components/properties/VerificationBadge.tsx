/**
 * VerificationBadge — display-only component for owner/advertiser verification status.
 * Uses real data only: ownerVerificationLevel (0–3) or ownerIsVerified (bool).
 * Never shows a badge for unverified (level 0 / isVerified=false).
 */

const LEVEL_LABELS: Record<number, string> = {
  1: "موثق هوية",
  2: "موثق ملكية",
  3: "موثق نشاط تجاري",
};

interface VerificationBadgeProps {
  /** 0 = غير موثق, 1–3 = مستوى التوثيق */
  level?: number;
  /** Fallback: simple boolean from company.IsVerified */
  isVerified?: boolean;
  /** "sm" = for cards (smaller), "md" = for detail pages */
  size?: "sm" | "md";
}

export default function VerificationBadge({ level = 0, isVerified = false, size = "md" }: VerificationBadgeProps) {
  const effectiveLevel = level > 0 ? level : (isVerified ? 1 : 0);

  if (effectiveLevel === 0) return null;

  const label = LEVEL_LABELS[effectiveLevel] ?? "موثق";

  const smStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.2rem",
    fontSize: "0.67rem",
    fontWeight: 600,
    color: "#15803d",
    background: "#dcfce7",
    border: "1px solid #bbf7d0",
    borderRadius: "999px",
    padding: "0.1rem 0.45rem",
    whiteSpace: "nowrap",
    lineHeight: 1.4,
  };

  const mdStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.25rem",
    fontSize: "0.76rem",
    fontWeight: 600,
    color: "#166534",
    background: "#dcfce7",
    border: "1px solid #bbf7d0",
    borderRadius: "999px",
    padding: "0.2rem 0.65rem",
    whiteSpace: "nowrap",
    lineHeight: 1.4,
  };

  return (
    <span style={size === "sm" ? smStyle : mdStyle} title={label}>
      <svg width={size === "sm" ? 10 : 13} height={size === "sm" ? 10 : 13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
      {label}
    </span>
  );
}
