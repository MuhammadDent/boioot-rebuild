// ── DEV SAFETY GUARD ──────────────────────────────────────────────────────────
// Throws at module load time in development if any production URL is detected.
// This prevents Replit from accidentally talking to the production backend.

function assertNotProduction(value: string, varName: string): void {
  if (
    process.env.NODE_ENV !== "production" &&
    value.includes("fly.dev")
  ) {
    throw new Error(
      `\n\n🚨 DEV SAFETY VIOLATION 🚨\n` +
      `${varName} points to the PRODUCTION backend:\n` +
      `  ${value}\n\n` +
      `Fix: set BACKEND_URL=http://localhost:8080 in .env.local\n` +
      `Replit must NEVER connect to fly.dev.\n`
    );
  }
}

// ── API base URL resolution ────────────────────────────────────────────────────
// NEXT_PUBLIC_API_URL must be set in .env.local.
// Dev:  /api  →  Next.js rewrite  →  BACKEND_URL (http://localhost:8080)
// Prod: /api  →  Next.js rewrite  →  BACKEND_URL (set in Vercel env vars)

const configuredUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api";
assertNotProduction(configuredUrl, "NEXT_PUBLIC_API_URL");

export const apiConfig = {
  baseUrl: configuredUrl,
} as const;

// ── File/document URL resolver ────────────────────────────────────────────────
// The backend stores upload paths that may be absolute or relative.
// Rule: any /uploads/* URL is normalised to a root-relative path so that
// Next.js rewrites (/uploads/:path* → BACKEND_URL/uploads/:path*) handle
// routing in both dev (localhost:8080) and production (Vercel + backend).
// Third-party absolute URLs (Unsplash, R2, etc.) are returned unchanged.

export function resolveFileUrl(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/uploads/")) {
        // Strip the host — Next.js rewrite will add the correct backend origin
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // malformed absolute URL — return as-is
    }
    return trimmed;
  }

  // Already a relative path — return as-is
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
