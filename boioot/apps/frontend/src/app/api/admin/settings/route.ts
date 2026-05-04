import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db/settings-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings
 * Returns current site-settings. Requires Authorization header.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[admin/settings GET] DB error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings
 * Updates site-settings. Requires Authorization header.
 */
export async function PUT(req: NextRequest) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    const dto = {
      sectionProjectsEnabled:  Boolean(body.sectionProjectsEnabled),
      sectionRequestsEnabled:  Boolean(body.sectionRequestsEnabled),
      sectionDailyRentEnabled: Boolean(body.sectionDailyRentEnabled),
      sectionBlogEnabled:      Boolean(body.sectionBlogEnabled),
    };

    const updated = await updateSettings(dto);
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/settings PUT] DB error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
