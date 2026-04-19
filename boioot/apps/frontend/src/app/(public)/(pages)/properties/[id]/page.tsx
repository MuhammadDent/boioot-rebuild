import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PropertyDetailClient from "./PropertyDetailClient";
import type { PropertyResponse } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Server-side data fetch ────────────────────────────────────────────────────
// Uses BACKEND_URL directly (server-to-server, no client proxy needed).
// cache: "no-store" → fresh data on every request (matches previous CSR behaviour).

async function fetchProperty(id: string): Promise<PropertyResponse | null> {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  try {
    const res = await fetch(`${backendUrl}/api/properties/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PropertyResponse;
  } catch {
    return null;
  }
}

// ─── SEO metadata (generated server-side from real property data) ──────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const property = await fetchProperty(id);
  if (!property) return { title: "عقار غير موجود | بيوت" };
  const desc = property.description?.slice(0, 160) ?? `${property.title} في ${property.city}`;
  return {
    title: `${property.title} | بيوت`,
    description: desc,
    openGraph: {
      title: property.title,
      description: desc,
      images: property.images?.[0]?.imageUrl ? [property.images[0].imageUrl] : [],
    },
  };
}

// ─── Page (Server Component) ───────────────────────────────────────────────────
// Fetches property data on the server → passes it to the Client Component.
// The Client Component handles all interactive state (favorites, messaging, etc.).

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;
  const property = await fetchProperty(id);

  if (!property) return notFound();

  return <PropertyDetailClient property={property} />;
}
