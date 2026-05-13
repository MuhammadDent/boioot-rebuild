import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Dev safety: block any attempt to reach the production backend ─────────────
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

if (
  process.env.NODE_ENV !== "production" &&
  BACKEND_URL.includes("fly.dev")
) {
  throw new Error(
    `\n\n🚨 DEV SAFETY VIOLATION 🚨\n` +
    `[settings/public route] BACKEND_URL points to production:\n` +
    `  ${BACKEND_URL}\n` +
    `Fix: set BACKEND_URL=http://localhost:8080 in .env.local\n`
  );
}

const BACKEND_ENDPOINT = `${BACKEND_URL}/api/settings/public`;

/**
 * GET /api/settings/public
 * Proxies to the LOCAL backend. No authentication required.
 * Falls back to all-enabled defaults only when the local backend is unreachable.
 */
export async function GET() {
  try {
    const res = await fetch(BACKEND_ENDPOINT, { cache: "no-store" });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[settings/public] proxy error:", err);
    return NextResponse.json({
      sectionProjectsEnabled:   true,
      sectionRequestsEnabled:   true,
      sectionDailyRentEnabled:  true,
      sectionBlogEnabled:       true,
      sectionAgenciesEnabled:   true,
      pricingPageVisible:       true,
      subscriptionsPageVisible: true,
    });
  }
}
