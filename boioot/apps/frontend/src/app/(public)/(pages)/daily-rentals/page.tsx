"use client";

import { useState, useEffect, Suspense, type FormEvent } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Spinner from "@/components/ui/Spinner";
import PropertyCard from "@/components/properties/PropertyCard";
import { propertiesApi, PROPERTIES_PAGE_SIZE } from "@/features/properties/api";
import { PROPERTY_TYPE_LABELS } from "@/features/properties/constants";
import { useCities } from "@/hooks/useCities";
import type { PropertyResponse } from "@/types";

// ─── Type chips ───────────────────────────────────────────────────────────────

const TYPE_CHIPS = [
  { value: "",           label: "الكل"  },
  { value: "Apartment",  label: "شقق"   },
  { value: "Villa",      label: "فلل"   },
  { value: "Office",     label: "مكاتب" },
  { value: "Shop",       label: "محلات" },
  { value: "Building",   label: "مبانٍ" },
];

// ─── Filter form shape ────────────────────────────────────────────────────────

interface FilterForm {
  city:     string;
  type:     string;
  minPrice: string;
  maxPrice: string;
}

const EMPTY_FILTERS: FilterForm = { city: "", type: "", minPrice: "", maxPrice: "" };

// ─── Inner component (needs Suspense for useSearchParams) ─────────────────────

function DailyRentalsContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();
  const { cities }   = useCities();

  const cityParam     = searchParams.get("city")     || "";
  const typeParam     = searchParams.get("type")     || "";
  const minPriceParam = searchParams.get("minPrice") || "";
  const maxPriceParam = searchParams.get("maxPrice") || "";
  const pageParam     = Number(searchParams.get("page") || "1");

  const [form, setForm] = useState<FilterForm>({
    city:     cityParam,
    type:     typeParam,
    minPrice: minPriceParam,
    maxPrice: maxPriceParam,
  });
  const [filterError, setFilterError] = useState("");

  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext]       = useState(false);
  const [hasPrev, setHasPrev]       = useState(false);

  // Sync draft form when URL changes
  useEffect(() => {
    setForm({ city: cityParam, type: typeParam, minPrice: minPriceParam, maxPrice: maxPriceParam });
  }, [cityParam, typeParam, minPriceParam, maxPriceParam]);

  // Fetch — always pre-filtered by DailyRent
  useEffect(() => {
    setLoading(true);
    setError("");

    propertiesApi
      .getList({
        page:        pageParam,
        pageSize:    PROPERTIES_PAGE_SIZE,
        listingType: "DailyRent",
        city:        cityParam     || undefined,
        type:        typeParam     || undefined,
        minPrice:    minPriceParam ? Number(minPriceParam) : undefined,
        maxPrice:    maxPriceParam ? Number(maxPriceParam) : undefined,
      })
      .then((res) => {
        setProperties(res.items);
        setTotalCount(res.totalCount);
        setHasNext(res.hasNext);
        setHasPrev(res.hasPrevious);
      })
      .catch(() => setError("تعذّر تحميل عروض الإيجار اليومي. يرجى المحاولة مجدداً."))
      .finally(() => setLoading(false));
  }, [cityParam, typeParam, minPriceParam, maxPriceParam, pageParam]);

  // ── URL helpers ─────────────────────────────────────────────────────────────

  function buildParams(f: FilterForm, page: number): URLSearchParams {
    const p = new URLSearchParams();
    if (f.city)     p.set("city",     f.city);
    if (f.type)     p.set("type",     f.type);
    if (f.minPrice) p.set("minPrice", f.minPrice);
    if (f.maxPrice) p.set("maxPrice", f.maxPrice);
    if (page > 1)   p.set("page",     String(page));
    return p;
  }

  function selectType(type: string) {
    const next = { ...form, type };
    setForm(next);
    const qs = buildParams({ ...next }, 1).toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleApply(e: FormEvent) {
    e.preventDefault();
    setFilterError("");

    if (form.minPrice && form.maxPrice && Number(form.minPrice) > Number(form.maxPrice)) {
      setFilterError("السعر الأدنى لا يمكن أن يكون أكبر من السعر الأقصى");
      return;
    }

    const qs = buildParams(form, 1).toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function handleClear() {
    setForm(EMPTY_FILTERS);
    setFilterError("");
    router.push(pathname);
  }

  function goToPage(p: number) {
    const qs = buildParams({ city: cityParam, type: typeParam, minPrice: minPriceParam, maxPrice: maxPriceParam }, p).toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasActiveFilters = !!(cityParam || typeParam || minPriceParam || maxPriceParam);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: "var(--color-background)" }}>
      <div className="container" style={{ padding: "2.5rem 1.5rem" }}>

        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-header__title">الإيجار اليومي</h1>
          {!loading && !error && (
            <p className="page-header__subtitle">
              {totalCount > 0
                ? `${totalCount.toLocaleString("en")} عرض إيجار يومي`
                : hasActiveFilters ? "لا توجد نتائج" : "لا توجد عروض حالياً"}
            </p>
          )}
        </div>

        {/* Type chips */}
        <div className="type-chips">
          {TYPE_CHIPS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`type-chip${typeParam === value ? " type-chip--active" : ""}`}
              onClick={() => selectType(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <form className="filter-bar" onSubmit={handleApply}>
          <div className="filter-bar__grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>

            {/* Type select (also updated by chips above) */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="f-type">نوع العقار</label>
              <select
                id="f-type"
                className="form-input"
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="">الكل</option>
                {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="f-city">المدينة</label>
              <select
                id="f-city"
                className="form-input"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              >
                <option value="">الكل</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Price range */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">نطاق السعر</label>
              <div className="filter-bar__price">
                <input
                  type="number"
                  className="form-input"
                  placeholder="من"
                  min={0}
                  value={form.minPrice}
                  onChange={(e) => setForm((p) => ({ ...p, minPrice: e.target.value }))}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="إلى"
                  min={0}
                  value={form.maxPrice}
                  onChange={(e) => setForm((p) => ({ ...p, maxPrice: e.target.value }))}
                />
              </div>
            </div>

          </div>

          {filterError && (
            <p style={{ color: "var(--color-error, #c0392b)", fontSize: "0.85rem", margin: 0 }}>
              {filterError}
            </p>
          )}

          <div className="filter-bar__actions">
            {hasActiveFilters && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear}>
                مسح الفلاتر
              </button>
            )}
            <button type="submit" className="btn btn-primary btn-sm">تطبيق</button>
          </div>
        </form>

        {/* Loading */}
        {loading && <Spinner />}

        {/* Error */}
        {!loading && error && <div className="error-banner">{error}</div>}

        {/* Empty state */}
        {!loading && !error && properties.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">🏨</div>
            <h2 className="empty-state__title">
              {hasActiveFilters ? "لا توجد نتائج مطابقة" : "لا توجد عروض إيجار يومي حالياً"}
            </h2>
            <p className="empty-state__desc">
              {hasActiveFilters
                ? "جرّب تغيير معايير البحث أو مسح الفلاتر."
                : "لم يتم إضافة أي عروض إيجار يومي بعد."}
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
                <button
                  className="btn btn-outline btn-sm"
                  disabled={!hasPrev}
                  onClick={() => goToPage(pageParam - 1)}
                >
                  ← السابق
                </button>
                <span className="pagination__info">صفحة {pageParam}</span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={!hasNext}
                  onClick={() => goToPage(pageParam + 1)}
                >
                  التالي →
                </button>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function DailyRentalsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <DailyRentalsContent />
    </Suspense>
  );
}
