"use client";

import { useEffect, useState, useCallback } from "react";
import { propertiesService } from "@/services/properties.service";
import PropertyCard from "@/components/properties/PropertyCard";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import type { PagedResult, PropertyResponse } from "@/types";

export default function PropertiesPage() {
  const [result, setResult] = useState<PagedResult<PropertyResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [city, setCity] = useState("");
  const [listingType, setListingType] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await propertiesService.getPublicList({ page, pageSize: 12, city: city || undefined, listingType: listingType || undefined });
      setResult(data);
    } catch {
      setError("تعذّر تحميل العقارات. يرجى المحاولة مجدداً.");
    } finally {
      setLoading(false);
    }
  }, [page, city, listingType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div style={{ padding: "2rem 0" }}>
      <div className="container">
        <div className="page-header">
          <h1 className="page-header__title">العقارات</h1>
          <p className="page-header__subtitle">تصفح جميع العقارات المتاحة في سوريا</p>
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          <input
            className="form-input"
            style={{ maxWidth: 200 }}
            placeholder="المدينة"
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
          />
          <select
            className="form-input"
            style={{ maxWidth: 180 }}
            value={listingType}
            onChange={(e) => { setListingType(e.target.value); setPage(1); }}
          >
            <option value="">كل الأنواع</option>
            <option value="Sale">للبيع</option>
            <option value="Rent">للإيجار</option>
            <option value="Investment">للاستثمار</option>
          </select>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <Spinner />
        ) : result && result.items.length === 0 ? (
          <EmptyState icon="🏠" title="لا توجد عقارات" description="لم يتم العثور على عقارات بالفلاتر المختارة" />
        ) : (
          <>
            <div className="grid-cards">
              {result?.items.map((p) => <PropertyCard key={p.id} property={p} />)}
            </div>
            {result && (
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                totalCount={result.totalCount}
                onPage={(p) => setPage(p)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

