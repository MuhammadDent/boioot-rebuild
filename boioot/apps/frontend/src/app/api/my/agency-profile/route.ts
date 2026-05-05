import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

if (process.env.NODE_ENV !== "production" && BACKEND_URL.includes("fly.dev")) {
  throw new Error(`[my/agency-profile route] BACKEND_URL points to production: ${BACKEND_URL}`);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  try {
    const res = await fetch(`${BACKEND_URL}/api/my/agency-profile`, {
      cache: "no-store",
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[my/agency-profile GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/my/agency-profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[my/agency-profile PUT]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
