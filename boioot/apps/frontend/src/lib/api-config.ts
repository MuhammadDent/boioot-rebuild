// ── API base URL resolution ────────────────────────────────────────────────
//
// Priority (highest → lowest):
//   1. NEXT_PUBLIC_API_URL env var — only used if it is NOT the old dns-broken domain
//   2. LIVE_BACKEND — direct Fly.io URL, used for both SSR and CSR
//
// We always use the full backend URL (never a relative /api path) to avoid
// Next.js SSR vs CSR hydration mismatches caused by `typeof window` branches.
// Server-to-server requests are not subject to CORS, so using the full URL
// during SSR is safe.  Client (browser) requests go cross-origin to Fly.io;
// CORS is configured on the backend to allow the production domains.
//
// The domain api.boioot.net is not yet live (DNS not set up).
// Any URL containing it is silently replaced with the live backend.
//
const LIVE_BACKEND = "https://backend-bold-snowflake-8206.fly.dev/api";
const BROKEN_DOMAIN = "api.boioot.net";

function resolveApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? "";

  // Reject empty or broken DNS domain — fall through to live backend
  if (!configured || configured.includes(BROKEN_DOMAIN)) {
    return LIVE_BACKEND;
  }

  return configured;
}

const API_URL = resolveApiUrl();

export const apiConfig = {
  baseUrl: API_URL,
  liveBackend: LIVE_BACKEND,
} as const;

/**
 * Resolve a file/document URL returned by the backend.
 *
 * The backend MUST serve all /uploads/* files. The stored URL might be:
 *   - A relative path:           /uploads/docs/file.png
 *   - Absolute with correct host: https://backend-bold-snowflake-8206.fly.dev/uploads/…
 *   - Absolute with WRONG host:  https://www.boioot.net/uploads/…  ← 404 in production
 *
 * Rule: any URL whose path starts with /uploads/ is ALWAYS rewritten to point
 * at the backend origin, regardless of what host is currently in the URL.
 * Only non-upload absolute URLs (e.g. third-party images) are returned as-is.
 */
const BACKEND_ORIGIN = LIVE_BACKEND.replace(/\/api\/?$/, "");

export function resolveFileUrl(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/uploads/")) {
        // Rewrite host to backend, keep path + query as-is
        return `${BACKEND_ORIGIN}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // malformed absolute URL — return as-is
    }
    return trimmed;
  }

  // Relative path — prepend backend origin
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${BACKEND_ORIGIN}${path}`;
}
