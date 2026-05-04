import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLY_BACKEND = "https://backend-bold-snowflake-8206.fly.dev/api/admin/settings";

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text || !text.trim()) return null;
  try { return JSON.parse(text); } catch { return text; }
}

/**
 * GET /api/admin/settings
 * Proxies to the Fly.io backend. Requires Authorization header.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(FLY_BACKEND, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    const data = await parseBody(res);
    if (data === null) {
      return new NextResponse(null, { status: res.status });
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[admin/settings GET] proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings
 * Proxies to the Fly.io backend. Requires Authorization header.
 */
export async function PUT(req: NextRequest) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await fetch(FLY_BACKEND, {
      method: "PUT",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await parseBody(res);
    if (data === null) {
      return new NextResponse(null, { status: res.status });
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[admin/settings PUT] proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
