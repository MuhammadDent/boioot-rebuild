import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

if (process.env.NODE_ENV !== "production" && BACKEND_URL.includes("fly.dev")) {
  throw new Error(`[admin/agencies route] BACKEND_URL points to production: ${BACKEND_URL}`);
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const qs  = req.nextUrl.searchParams.toString();
  const url = `${BACKEND_URL}/api/admin/agencies${qs ? `?${qs}` : ""}`;
  try {
    const res  = await fetch(url, { headers: { Authorization: auth }, cache: "no-store" });
    const data = await parseBody(res);
    return data === null
      ? new NextResponse(null, { status: res.status })
      : NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[admin/agencies GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
