import { NextResponse } from "next/server";
import { getSettings } from "@/lib/db/settings-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/settings/public
 * Returns feature-toggle values for the four public sections.
 * No authentication required.
 */
export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[settings/public] DB error:", err);
    // Fail open — return all-enabled defaults so nothing disappears on DB error
    return NextResponse.json({
      sectionProjectsEnabled:  true,
      sectionRequestsEnabled:  true,
      sectionDailyRentEnabled: true,
      sectionBlogEnabled:      true,
    });
  }
}
