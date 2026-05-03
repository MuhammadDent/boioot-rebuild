/**
 * Inline notification banner for dashboard pages.
 * Returns null when message is empty — safe to render unconditionally.
 *
 * type defaults to "error". Pass type="success" for green banners.
 */

type BannerType = "error" | "success" | "warning" | "info";

const STYLES: Record<BannerType, { background: string; color: string; border: string }> = {
  error: {
    background: "#ffebee",
    color:      "#c62828",
    border:     "1px solid #ffcdd2",
  },
  success: {
    background: "#e8f5e9",
    color:      "#1b5e20",
    border:     "1px solid #c8e6c9",
  },
  warning: {
    background: "#fff8e1",
    color:      "#e65100",
    border:     "1px solid #ffecb3",
  },
  info: {
    background: "#e3f2fd",
    color:      "#0d47a1",
    border:     "1px solid #bbdefb",
  },
};

export function InlineBanner({
  message,
  type = "error",
}: {
  message: string;
  type?: BannerType;
}) {
  if (!message) return null;
  const s = STYLES[type];
  return (
    <div style={{
      background:   s.background,
      color:        s.color,
      border:       s.border,
      padding:      "0.75rem 1rem",
      borderRadius: "8px",
      marginBottom: "1rem",
      fontSize:     "0.9rem",
    }}>
      {message}
    </div>
  );
}
