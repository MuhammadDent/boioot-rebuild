import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLY_BACKEND = "https://backend-bold-snowflake-8206.fly.dev/api/settings/public";

/**
 * GET /api/settings/public
 * Proxies to the Fly.io backend. No authentication required.
 * Falls back to all-enabled defaults only when the backend is unreachable.
 */
export async function GET() {
  try {
    const res = await fetch(FLY_BACKEND, { cache: "no-store" });
    if (!res.ok) throw new Error(`backend ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[settings/public] proxy error:", err);
    return NextResponse.json({
      sectionProjectsEnabled:  true,
      sectionRequestsEnabled:  true,
      sectionDailyRentEnabled: true,
      sectionBlogEnabled:      true,
    });
  }
}
