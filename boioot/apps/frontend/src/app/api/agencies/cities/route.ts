import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

if (process.env.NODE_ENV !== "production" && BACKEND_URL.includes("fly.dev")) {
  throw new Error(`[agencies/cities route] BACKEND_URL points to production: ${BACKEND_URL}`);
}

export async function GET(_req: NextRequest) {
  try {
    const res  = await fetch(`${BACKEND_URL}/api/agencies/cities`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[agencies/cities GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
