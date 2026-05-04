import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

if (process.env.NODE_ENV !== "production" && BACKEND_URL.includes("fly.dev")) {
  throw new Error(`[agencies/[id]/ratings route] BACKEND_URL points to production: ${BACKEND_URL}`);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const qs     = req.nextUrl.searchParams.toString();
  try {
    const res  = await fetch(
      `${BACKEND_URL}/api/agencies/${id}/ratings${qs ? `?${qs}` : ""}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[agencies/[id]/ratings GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }     = await params;
  const authHeader = req.headers.get("Authorization");
  try {
    const body = await req.json();
    const res  = await fetch(`${BACKEND_URL}/api/agencies/${id}/ratings`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[agencies/[id]/ratings POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
