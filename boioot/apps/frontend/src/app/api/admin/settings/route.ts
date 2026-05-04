import { NextRequest, NextResponse } from "next/server";

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
    `[admin/settings route] BACKEND_URL points to production:\n` +
    `  ${BACKEND_URL}\n` +
    `Fix: set BACKEND_URL=http://localhost:8080 in .env.local\n`
  );
}

const BACKEND_ENDPOINT = `${BACKEND_URL}/api/admin/settings`;

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text || !text.trim()) return null;
  try { return JSON.parse(text); } catch { return text; }
}

/**
 * GET /api/admin/settings
 * Proxies to the LOCAL backend. Requires Authorization header.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(BACKEND_ENDPOINT, {
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
 * Proxies to the LOCAL backend. Requires Authorization header.
 */
export async function PUT(req: NextRequest) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const res = await fetch(BACKEND_ENDPOINT, {
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
