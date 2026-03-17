"use client";

import { useState, useEffect, Suspense, type FormEvent } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Spinner from "@/components/ui/Spinner";
import PropertyCard from "@/components/properties/PropertyCard";
import { propertiesApi, PROPERTIES_PAGE_SIZE } from "@/features/properties/api";
import {
  SYRIAN_CITIES,
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
} from "@/features/properties/constants";
import type { PropertyResponse } from "@/types";

// ─── Filter form shape ────────────────────────────────────────────────────────

interface FilterForm {
  city: string;
  type: string;
  listingType: string;
  minPrice: string;
  maxPrice: string;
}

const EMPTY_FILTERS: FilterForm = {
  city: "", type: "", listingType: "", minPrice: "", maxPrice: "",
};

// ─── Inner component (needs Suspense because it uses useSearchParams) ─────────

function PropertiesContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  // Applied filter values — derived from URL, used for fetching
  const cityParam        = searchParams.get("city")        || "";
  const typeParam        = searchParams.get("type")        || "";
  const listingTypeParam = searchParams.get("listingType") || "";
  const minPriceParam    = searchParams.get("minPrice")    || "";
  const maxPriceParam    = searchParams.get("maxPrice")    || "";
  const pageParam        = Number(searchParams.get("page") || "1");

  // Draft filter state — local form values before the user submits
  const [form, setForm] = useState<FilterForm>({
    city:        cityParam,
    type:        typeParam,
    listingType: listingTypeParam,
    minPrice:    minPriceParam,
    maxPrice:    maxPriceParam,
  });

  const [properties, setProperties]   = useState<PropertyResponse[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [filterError, setFilterError] = useState("");
  const [totalCount, setTotalCount]   = useState(0);
  const [hasNext, setHasNext]         = useState(false);
  const [hasPrev, setHasPrev]         = useState(false);

  // Sync draft form when URL changes externally (browser back/forward)
  useEffect(() => {
    setForm({
      city:        cityParam,
      type:        typeParam,
      listingType: listingTypeParam,
      minPrice:    minPriceParam,
      maxPrice:    maxPriceParam,
    });
  }, [cityParam, typeParam, listingTypeParam, minPriceParam, maxPriceParam]);

  // Fetch data whenever the applied URL params change
  useEffect(() => {
    setLoading(true);
    setError("");

    propertiesApi
      .getList({
        page:        pageParam,
        pageSize:    PROPERTIES_PAGE_SIZE,
        city:        cityParam        || undefined,
        type:        typeParam        || undefined,
        listingType: listingTypeParam || undefined,
        minPrice:    minPriceParam    ? Number(minPriceParam) : undefined,
        maxPrice:    maxPriceParam    ? Number(maxPriceParam) : undefined,
      })
      .then((res) => {
        setProperties(res.items);
        setTotalCount(res.totalCount);
        setHasNext(res.hasNext);
        setHasPrev(res.hasPrevious);
      })
      .catch(() => setError("تعذّر تحميل العقارات. يرجى المحاولة مجدداً."))
      .finally(() => setLoading(false));
  }, [cityParam, typeParam, listingTypeParam, minPriceParam, maxPriceParam, pageParam]);

  // ── URL helpers ─────────────────────────────────────────────────────────────

  function buildParams(f: FilterForm, page: number): URLSearchParams {
    const p = new URLSearchParams();
    if (f.city)        p.set("city",        f.city);
    if (f.type)        p.set("type",        f.type);
    if (f.listingType) p.set("listingType", f.listingType);
    if (f.minPrice)    p.set("minPrice",    f.minPrice);
    if (f.maxPrice)    p.set("maxPrice",    f.maxPrice);
    if (page > 1)      p.set("page",        String(page));
    return p;
  }

  function handleApply(e: FormEvent) {
    e.preventDefault();
    setFilterError("");

    // Client-side validation: min must not exceed max
    if (
      form.minPrice &&
      form.maxPrice &&
      Number(form.minPrice) > Number(form.maxPrice)
    ) {
      setFilterError("السعر الأدنى لا يمكن أن يكون أكبر من السعر الأقصى");
      return;
    }

    // Reset to page 1 whenever filters are reapplied
    const qs = buildParams(form, 1).toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleClear() {
    setForm(EMPTY_FILTERS);
    setFilterError("");
    router.push(pathname);
  }

  function goToPage(p: number) {
    const currentFilters: FilterForm = {
      city: cityParam, type: typeParam, listingType: listingTypeParam,
      minPrice: minPriceParam, maxPrice: maxPriceParam,
    };
    const qs = buildParams(currentFilters, p).toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasActiveFilters = !!(cityParam || typeParam || listingTypeParam || minPriceParam || maxPriceParam);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)" }}>
      <div className="container" style={{ padding: "2.5rem 1.5rem" }}>

        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-header__title">العقارات المتاحة</h1>
          {!loading && !error && (
            <p className="page-header__subtitle">
              {totalCount > 0
                ? `${totalCount.toLocaleString("en")} عقار`
                : hasActiveFilters ? "لا توجد نتائج" : "لا توجد عقارات حالياً"}
            </p>
          )}
        </div>

        {/* ── Two-column layout: filter sidebar (right) + content (left) ── */}
        <div className="properties-layout">

          {/* Filter Sidebar — first in DOM = RIGHT side in RTL */}
          <form className="filter-sidebar" onSubmit={handleApply}>
            <p className="filter-sidebar__title">فلتر بحث</p>

            {/* City */}
            <div className="form-group">
              <label className="form-label" htmlFor="f-city">المدينة</label>
              <select id="f-city" className="form-input" value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}>
                <option value="">الكل</option>
                {SYRIAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Property Type */}
            <div className="form-group">
              <label className="form-label" htmlFor="f-type">قسم العقار</label>
              <select id="f-type" className="form-input" value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                <option value="">الكل</option>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Listing Type */}
            <div className="form-group">
              <label className="form-label" htmlFor="f-listing">نوع الإدراج</label>
              <select id="f-listing" className="form-input" value={form.listingType}
                onChange={(e) => setForm((p) => ({ ...p, listingType: e.target.value }))}>
                <option value="">الكل</option>
                {Object.entries(LISTING_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="form-group">
              <label className="form-label">نطاق السعر</label>
              <div className="filter-sidebar__price">
                <input type="number" className="form-input" placeholder="من" min={0}
                  value={form.minPrice}
                  onChange={(e) => setForm((p) => ({ ...p, minPrice: e.target.value }))} />
                <input type="number" className="form-input" placeholder="إلى" min={0}
                  value={form.maxPrice}
                  onChange={(e) => setForm((p) => ({ ...p, maxPrice: e.target.value }))} />
              </div>
              {filterError && (
                <p style={{ color: "var(--color-error, #c0392b)", fontSize: "0.78rem", margin: "0.3rem 0 0" }}>
                  {filterError}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="filter-sidebar__actions">
              <button type="submit" className="btn btn-primary btn-sm">تطبيق الفلتر</button>
              {hasActiveFilters && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear}>
                  مسح الفلاتر
                </button>
              )}
            </div>
          </form>

          {/* Content — second in DOM = LEFT side in RTL */}
          <div className="properties-content">

            {/* Loading */}
            {loading && <Spinner />}

            {/* Error */}
            {!loading && error && <div className="error-banner">{error}</div>}

            {/* Empty state */}
            {!loading && !error && properties.length === 0 && (
              <div className="empty-state">
                <div className="empty-state__icon">🏘️</div>
                <h2 className="empty-state__title">
                  {hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا توجد عقارات متاحة"}
                </h2>
                <p className="empty-state__desc">
                  {hasActiveFilters
                    ? "جرّب تغيير معايير البحث أو مسح الفلاتر."
                    : "لم يتم إضافة أي عقارات حتى الآن."}
                </p>
                {hasActiveFilters && (
                  <button className="btn btn-outline" style={{ marginTop: "1rem" }} onClick={handleClear}>
                    مسح الفلاتر
                  </button>
                )}
              </div>
            )}

            {/* Results grid */}
            {!loading && !error && properties.length > 0 && (
              <>
                <div className="grid-cards">
                  {properties.map((p) => (
                    <PropertyCard key={p.id} property={p} />
                  ))}
                </div>

                {(hasPrev || hasNext) && (
                  <div className="pagination">
                    <button className="btn btn-outline btn-sm" disabled={!hasPrev}
                      onClick={() => goToPage(pageParam - 1)}>← السابق</button>
                    <span className="pagination__info">صفحة {pageParam}</span>
                    <button className="btn btn-outline btn-sm" disabled={!hasNext}
                      onClick={() => goToPage(pageParam + 1)}>التالي →</button>
                  </div>
                )}
              </>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Page wrapper — required for useSearchParams ──────────────────────────────

export default function PropertiesPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <PropertiesContent />
    </Suspense>
  );
}
