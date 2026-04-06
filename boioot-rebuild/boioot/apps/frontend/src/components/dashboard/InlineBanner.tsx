/**
 * Inline error banner for dashboard pages.
 * Returns null when message is empty — safe to render unconditionally.
 */
export function InlineBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div style={{
      background: "#ffebee",
      color: "#c62828",
      padding: "0.75rem 1rem",
      borderRadius: "8px",
      marginBottom: "1rem",
      fontSize: "0.9rem",
    }}>
      {message}
    </div>
  );
}
