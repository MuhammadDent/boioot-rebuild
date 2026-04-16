// ── API base URL resolution ────────────────────────────────────────────────
//
// Priority (highest → lowest):
//   1. NEXT_PUBLIC_API_URL env var — only used if it is NOT the old dns-broken domain
//   2. /api  — local dev proxy (Next.js rewrites /api/* → BACKEND_URL/api/*)
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
    // In a browser context (NEXT_PUBLIC vars are baked in at build time),
    // use the live backend directly so CORS can apply.
    // In a server context (SSR / Next.js rewrites), /api is fine but since
    // this module also runs client-side we use the full URL to be safe.
    if (typeof window !== "undefined") {
      // Client-side: use full URL (browser cannot use /api proxy directly
      // when the Next.js server is on a different host).
      return LIVE_BACKEND;
    }
    // Server-side: prefer /api so Next.js rewrites handle it transparently.
    return "/api";
  }

  return configured;
}

const API_URL = resolveApiUrl();

if (process.env.NODE_ENV !== "production") {
  console.log(`[api-config] baseUrl resolved to: ${API_URL}`);
}

export const apiConfig = {
  baseUrl: API_URL,
  liveBackend: LIVE_BACKEND,
} as const;
