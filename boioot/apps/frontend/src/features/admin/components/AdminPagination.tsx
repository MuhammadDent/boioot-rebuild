"use client";

/**
 * Shared pagination control used by all admin list pages.
 * Extracted from the five pages that had identical inline copies.
 */
export function AdminPagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "center", alignItems: "center",
      gap: "0.75rem", marginTop: "2rem",
    }}>
      <button
        className="btn"
        style={{ padding: "0.4rem 1rem" }}
        disabled={page <= 1}
        onClick={onPrev}
      >
        السابق
      </button>
      <span style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
        صفحة {page} من {totalPages}
      </span>
      <button
        className="btn"
        style={{ padding: "0.4rem 1rem" }}
        disabled={page >= totalPages}
        onClick={onNext}
      >
        التالي
      </button>
    </div>
  );
}
