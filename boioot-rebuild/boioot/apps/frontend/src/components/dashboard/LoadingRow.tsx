/**
 * Centered loading text used on all dashboard pages.
 * Pass a custom message for context-specific loading (e.g. edit pages).
 */
export function LoadingRow({ message = "جارٍ التحميل..." }: { message?: string }) {
  return (
    <p style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "3rem 0" }}>
      {message}
    </p>
  );
}
