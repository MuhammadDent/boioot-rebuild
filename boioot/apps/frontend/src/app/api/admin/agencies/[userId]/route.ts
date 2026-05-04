import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

if (process.env.NODE_ENV !== "production" && BACKEND_URL.includes("fly.dev")) {
  throw new Error(`[admin/agencies/[userId] route] BACKEND_URL points to production: ${BACKEND_URL}`);
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return null;
  try { return JSON.parse(text); } catch { return text; }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId } = await params;
  try {
    const body = await req.json();
    const res  = await fetch(`${BACKEND_URL}/api/admin/agencies/${userId}`, {
      method:  "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = await parseBody(res);
    return data === null
      ? new NextResponse(null, { status: res.status })
      : NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[admin/agencies/[userId] PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
