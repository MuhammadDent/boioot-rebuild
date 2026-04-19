import { Suspense } from "react";
import { PropertyCardSkeletonGrid } from "@/components/properties/PropertyCardSkeleton";
import { PROPERTIES_PAGE_SIZE } from "@/features/properties/api";
import PropertiesPageClient from "./PropertiesPageClient";
import type { PropertyResponse } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface ApiResult {
  items:       PropertyResponse[];
  totalCount:  number;
  hasNext:     boolean;
  hasPrevious: boolean;
}

// ─── Server-side initial fetch ─────────────────────────────────────────────────

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

const EMPTY: ApiResult = { items: [], totalCount: 0, hasNext: false, hasPrevious: false };

function str(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const province      = str(sp.province);
  const city          = str(sp.city);
  const neighborhood  = str(sp.neighborhood);
  const type          = str(sp.type);
  const listingType   = str(sp.listingType);
  const minPrice      = str(sp.minPrice);
  const maxPrice      = str(sp.maxPrice);
  const page          = Number(str(sp.page) || "1");

  let data: ApiResult = EMPTY;

  try {
    const qp = new URLSearchParams();
    if (province)     qp.set("province",     province);
    if (city)         qp.set("city",         city);
    if (neighborhood) qp.set("neighborhood", neighborhood);
    if (type)         qp.set("type",         type);
    if (listingType)  qp.set("listingType",  listingType);
    if (minPrice)     qp.set("minPrice",     minPrice);
    if (maxPrice)     qp.set("maxPrice",     maxPrice);
    qp.set("page",     String(page));
    qp.set("pageSize", String(PROPERTIES_PAGE_SIZE));

    const res = await fetch(`${BACKEND_URL}/api/properties?${qp}`, {
      cache: "no-store",
    });
    if (res.ok) data = await res.json();
  } catch {
    // Backend unavailable — client will load data on mount via the normal path.
  }

  return (
    <Suspense fallback={<PropertyCardSkeletonGrid />}>
      <PropertiesPageClient
        initialProperties={data.items}
        initialTotalCount={data.totalCount}
        initialHasNext={data.hasNext}
        initialHasPrev={data.hasPrevious}
      />
    </Suspense>
  );
}
