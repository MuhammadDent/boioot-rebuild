interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = "حدث خطأ أثناء تحميل البيانات.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1rem",
        gap: "0.75rem",
        color: "var(--color-text-secondary)",
        textAlign: "center",
      }}
    >
      <svg
        width="44"
        height="44"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--color-error, #dc2626)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.7 }}
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>

      <p style={{ margin: 0, fontSize: "0.95rem" }}>{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: "0.25rem",
            background: "none",
            border: "1.5px solid var(--color-border)",
            borderRadius: 8,
            padding: "0.4rem 1.1rem",
            cursor: "pointer",
            fontSize: "0.88rem",
            color: "var(--color-text-secondary)",
            fontFamily: "inherit",
          }}
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
