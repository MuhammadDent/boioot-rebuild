import Link from "next/link";

/**
 * Standard back-navigation link used across all dashboard pages.
 * marginBottom defaults to "0.35rem" (list pages); pass a larger value
 * for detail pages where the link precedes content directly.
 */
export function DashboardBackLink({
  href,
  label,
  marginBottom = "0.35rem",
}: {
  href: string;
  label: string;
  marginBottom?: string;
}) {
  return (
    <Link href={href} style={{
      fontSize: "0.82rem",
      color: "var(--color-text-secondary)",
      marginBottom,
      display: "block",
    }}>
      {label}
    </Link>
  );
}
