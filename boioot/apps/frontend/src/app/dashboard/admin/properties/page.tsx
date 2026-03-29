"use client";

import { useState, useEffect, useMemo, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { adminApi } from "@/features/admin/api";
import { normalizeError } from "@/lib/api";
import { PROPERTY_STATUS_BADGE } from "@/features/admin/constants";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  formatPrice,
} from "@/features/properties/constants";
import type { PropertyResponse } from "@/types";
import { PropertyDetailModal } from "./_modal";

// ─── Config ────────────────────────────────────────────────────────────────────
const DISPLAY_PAGE_SIZE = 20;
const FETCH_PAGE_SIZE   = 500;

const STATUS_OPTS  = ["Available", "Inactive", "Sold", "Rented"] as const;
const TYPE_OPTS    = ["Apartment", "Villa", "Office", "Shop", "Land", "Building"] as const;
const LISTING_OPTS = ["Sale", "Rent", "DailyRent"] as const;
const SORT_OPTS = [
  { v: "newest",        l: "الأحدث أولاً"   },
  { v: "oldest",        l: "الأقدم أولاً"   },
  { v: "highest-price", l: "الأعلى سعراً"   },
  { v: "lowest-price",  l: "الأقل سعراً"    },
  { v: "most-viewed",   l: "الأكثر مشاهدة" },
] as const;

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, count, color, active, onClick,
}: { label: string; count: number; color: string; active: boolean; onClick: () => void }) {
  const style: CSSProperties = {
    flex: "1 1 130px",
    backgroundColor: active ? color : "#fff",
    border: `2px solid ${active ? color : "#e2e8f0"}`,
    borderRadius: 14, padding: "0.85rem 1rem",
    cursor: "pointer", textAlign: "center", transition: "all 0.15s",
    boxShadow: active ? `0 4px 14px ${color}44` : "none",
  };
  return (
    <div style={style} onClick={onClick}>
      <div style={{ fontSize: "1.55rem", fontWeight: 900, color: active ? "#fff" : color }}>{count}</div>
      <div style={{ fontSize: "0.76rem", fontWeight: 600, color: active ? "#fff" : "#64748b", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────
function FL({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "#64748b", marginBottom: "0.3rem", display: "block" }}>
      {children}
    </span>
  );
}

function Sel({
  value, onChange, children, placeholder,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode; placeholder?: string }) {
  return (
    <select
      style={{
        width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8,
        border: "1px solid #e2e8f0", fontSize: "0.85rem",
        fontFamily: "inherit", color: value ? "#0f172a" : "#94a3b8",
        backgroundColor: "#fff", cursor: "pointer",
      }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {children}
    </select>
  );
}

function Inp({
  value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      style={{
        width: "100%", padding: "0.5rem 0.75rem", borderRadius: 8,
        border: "1px solid #e2e8f0", fontSize: "0.85rem",
        fontFamily: "inherit", color: "#0f172a", backgroundColor: "#fff",
        boxSizing: "border-box",
      }}
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// ─── PropertyCard ─────────────────────────────────────────────────────────────
function PropertyCard({ property, onClick }: { property: PropertyResponse; onClick: () => void }) {
  const thumb = property.images?.find(i => i.isPrimary) ?? property.images?.[0];
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", gap: "0.9rem", padding: "0.85rem",
        backgroundColor: "#fff", borderRadius: 14,
        border: "1px solid #f1f5f9",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        cursor: "pointer", transition: "all 0.15s",
        alignItems: "center",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 18px rgba(0,0,0,0.1)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "#e2e8f0";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 6px rgba(0,0,0,0.06)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "#f1f5f9";
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: 80, height: 70, borderRadius: 10, overflow: "hidden", flexShrink: 0,
        backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {thumb
          ? <img src={thumb.imageUrl} alt={property.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: "2rem" }}>🏠</span>}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "0.9rem", fontWeight: 700, color: "#0f172a",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.25rem",
        }}>
          {property.title}
        </div>
        <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.35rem" }}>
          {property.city}{property.neighborhood ? ` · ${property.neighborhood}` : ""}
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
          <span className={PROPERTY_STATUS_BADGE[property.status] ?? "badge badge-gray"}>
            {PROPERTY_STATUS_LABELS[property.status] ?? property.status}
          </span>
          <span style={{
            backgroundColor: "#f1f5f9", borderRadius: 20,
            padding: "0.1rem 0.5rem", fontSize: "0.72rem", color: "#475569",
          }}>
            {PROPERTY_TYPE_LABELS[property.type] ?? property.type}
          </span>
          <span style={{
            backgroundColor: "#eff6ff", borderRadius: 20,
            padding: "0.1rem 0.5rem", fontSize: "0.72rem", color: "#1d4ed8",
          }}>
            {LISTING_TYPE_LABELS[property.listingType] ?? property.listingType}
          </span>
        </div>
      </div>

      {/* Price */}
      <div style={{
        textAlign: "left", flexShrink: 0, fontSize: "0.88rem",
        fontWeight: 800, color: "var(--color-primary)",
      }}>
        {formatPrice(property.price, property.currency)}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPropertiesPage() {
  const router = useRouter();

  // Data
  const [allProperties, setAllProperties] = useState<PropertyResponse[]>([]);
  const [fetching,      setFetching]      = useState(true);
  const [fetchError,    setFetchError]    = useState("");

  // Filters
  const [filtersOpen,    setFiltersOpen]    = useState(true);
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [cityFilter,     setCityFilter]     = useState("");
  const [neighborFilter, setNeighborFilter] = useState("");
  const [typeFilter,     setTypeFilter]     = useState("");
  const [listingFilter,  setListingFilter]  = useState("");
  const [minPrice,       setMinPrice]       = useState("");
  const [maxPrice,       setMaxPrice]       = useState("");
  const [minBedrooms,    setMinBedrooms]    = useState("");
  const [sortBy,         setSortBy]         = useState("newest");

  // Modal
  const [selected,      setSelected]      = useState<PropertyResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setFetching(true); setFetchError("");
    adminApi.getProperties(1, FETCH_PAGE_SIZE).then(r => {
      if (!cancelled) { setAllProperties(r.items ?? []); setFetching(false); }
    }).catch(e => {
      if (!cancelled) { setFetchError(normalizeError(e)); setFetching(false); }
    });
    return () => { cancelled = true; };
  }, []);

  // ── Location options — built from full raw dataset ─────────────────────────
  const provinceOptions = useMemo(() => {
    const seen = new Set<string>();
    allProperties.forEach(p => { const v = p.province?.trim(); if (v) seen.add(v); });
    return [...seen].sort((a, b) => (a || "").localeCompare(b || "", "ar"));
  }, [allProperties]);

  const cityOptions = useMemo(() => {
    const seen = new Set<string>();
    allProperties.forEach(p => {
      const city = p.city?.trim();
      const province = p.province?.trim();
      if (!city) return;
      if (!provinceFilter || province === provinceFilter) seen.add(city);
    });
    return [...seen].sort((a, b) => (a || "").localeCompare(b || "", "ar"));
  }, [allProperties, provinceFilter]);

  const neighborhoodOptions = useMemo(() => {
    const seen = new Set<string>();
    allProperties.forEach(p => {
      const nbhd = p.neighborhood?.trim();
      const city = p.city?.trim();
      const province = p.province?.trim();
      if (!nbhd) return;
      if (cityFilter && city !== cityFilter) return;
      if (!cityFilter && provinceFilter && province !== provinceFilter) return;
      seen.add(nbhd);
    });
    return [...seen].sort((a, b) => (a || "").localeCompare(b || "", "ar"));
  }, [allProperties, provinceFilter, cityFilter]);

  // ── Filter + Sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = allProperties;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        (p.neighborhood ?? "").toLowerCase().includes(q) ||
        (p.companyName  ?? "").toLowerCase().includes(q) ||
        (p.description  ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter)   list = list.filter(p => p.status === statusFilter);
    if (provinceFilter) list = list.filter(p => p.province === provinceFilter);
    if (cityFilter)     list = list.filter(p => p.city === cityFilter);
    if (neighborFilter) list = list.filter(p => p.neighborhood === neighborFilter);
    if (typeFilter)     list = list.filter(p => p.type === typeFilter);
    if (listingFilter)  list = list.filter(p => p.listingType === listingFilter);
    if (minPrice)       list = list.filter(p => p.price >= Number(minPrice));
    if (maxPrice)       list = list.filter(p => p.price <= Number(maxPrice));
    if (minBedrooms)    list = list.filter(p => (p.bedrooms ?? 0) >= Number(minBedrooms));
    return list;
  }, [allProperties, search, statusFilter, provinceFilter, cityFilter, neighborFilter, typeFilter, listingFilter, minPrice, maxPrice, minBedrooms]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortBy) {
      case "oldest":        return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case "highest-price": return list.sort((a, b) => b.price - a.price);
      case "lowest-price":  return list.sort((a, b) => a.price - b.price);
      case "most-viewed":   return list.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
      default:              return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [filtered, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / DISPLAY_PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * DISPLAY_PAGE_SIZE, page * DISPLAY_PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, provinceFilter, cityFilter, neighborFilter, typeFilter, listingFilter, minPrice, maxPrice, minBedrooms, sortBy]);

  // ── Active filter count ────────────────────────────────────────────────────
  const activeCount = [search, statusFilter, provinceFilter, cityFilter, neighborFilter, typeFilter, listingFilter, minPrice, maxPrice, minBedrooms].filter(Boolean).length;

  function clearAll() {
    setSearch(""); setStatusFilter(""); setProvinceFilter(""); setCityFilter(""); setNeighborFilter("");
    setTypeFilter(""); setListingFilter(""); setMinPrice(""); setMaxPrice(""); setMinBedrooms("");
  }

  // Province change → reset city and neighborhood
  function handleProvinceChange(v: string) {
    setProvinceFilter(v);
    setCityFilter("");
    setNeighborFilter("");
  }

  // City change → reset neighborhood
  function handleCityChange(v: string) {
    setCityFilter(v);
    setNeighborFilter("");
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (id: string, status: string) => {
    setActionLoading(true);
    try {
      await adminApi.updatePropertyStatus(id, status);
      setAllProperties(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleModerationChange = useCallback(async (id: string, moderationStatus: string) => {
    setActionLoading(true);
    try {
      await adminApi.setPropertyModeration(id, moderationStatus);
      setAllProperties(prev => prev.map(p => p.id === id ? { ...p, moderationStatus } : p));
      setSelected(prev => prev?.id === id ? { ...prev, moderationStatus } : prev);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setActionLoading(true);
    try {
      await adminApi.deleteProperty(id);
      setAllProperties(prev => prev.filter(p => p.id !== id));
      setSelected(null);
    } finally {
      setActionLoading(false);
    }
  }, []);

  // ── KPI click toggles status filter ───────────────────────────────────────
  function toggleKpi(s: string) { setStatusFilter(prev => prev === s ? "" : s); }

  // ── Pagination helpers ─────────────────────────────────────────────────────
  function pageNumbers(): number[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 3, totalPages - 6));
    return Array.from({ length: Math.min(7, totalPages) }, (_, i) => start + i);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "1.25rem 1.5rem", maxWidth: 960, margin: "0 auto" }}>

      {/* Title */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 900, color: "#0f172a" }}>إدارة العقارات</h1>
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
          عرض وتصفية وإدارة جميع العقارات المدرجة في المنصة
        </p>
      </div>

      {/* KPI Cards */}
      {!fetching && !fetchError && (
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <KpiCard
            label="إجمالي العقارات"
            count={allProperties.length}
            color="#6366f1"
            active={false}
            onClick={() => setStatusFilter("")}
          />
          <KpiCard label="متاحة"      count={allProperties.filter(p => p.status === "Available").length} color="#16a34a" active={statusFilter === "Available"} onClick={() => toggleKpi("Available")} />
          <KpiCard label="غير متاحة"  count={allProperties.filter(p => p.status === "Inactive").length}  color="#64748b" active={statusFilter === "Inactive"}  onClick={() => toggleKpi("Inactive")}  />
          <KpiCard label="مباعة"       count={allProperties.filter(p => p.status === "Sold").length}      color="#dc2626" active={statusFilter === "Sold"}      onClick={() => toggleKpi("Sold")}      />
          <KpiCard label="مؤجرة"      count={allProperties.filter(p => p.status === "Rented").length}    color="#d97706" active={statusFilter === "Rented"}    onClick={() => toggleKpi("Rented")}    />
        </div>
      )}

      {/* Filter Panel */}
      <div style={{ marginBottom: filtersOpen ? 0 : "1rem" }}>
        {/* Toggle bar */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            backgroundColor: "#fff",
            borderRadius: filtersOpen ? "12px 12px 0 0" : 12,
            border: "1px solid #f1f5f9",
            padding: "0.65rem 1rem",
            cursor: "pointer",
          }}
          onClick={() => setFiltersOpen(o => !o)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#0f172a" }}>
              {filtersOpen ? "▲" : "▼"} خيارات التصفية
            </span>
            {activeCount > 0 && (
              <span style={{
                backgroundColor: "var(--color-primary)", color: "#fff",
                borderRadius: 20, padding: "0.1rem 0.55rem", fontSize: "0.73rem", fontWeight: 700,
              }}>{activeCount} فعّال</span>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            {activeCount > 0 && (
              <button
                onClick={e => { e.stopPropagation(); clearAll(); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.78rem", color: "#dc2626", fontWeight: 700,
                  padding: "0.15rem 0.5rem", borderRadius: 6, fontFamily: "inherit",
                }}
              >مسح الكل</button>
            )}
            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
              {sorted.length.toLocaleString("ar-SA")} نتيجة
            </span>
          </div>
        </div>

        {/* Filter grid */}
        {filtersOpen && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
            gap: "0.75rem",
            padding: "1rem",
            backgroundColor: "#f8fafc",
            borderRadius: "0 0 12px 12px",
            border: "1px solid #f1f5f9",
            borderTop: "none",
          }}>
            {/* Search — full row */}
            <div style={{ gridColumn: "1 / -1" }}>
              <FL>بحث</FL>
              <Inp value={search} onChange={setSearch} placeholder="اسم العقار، المدينة، الشركة..." />
            </div>

            <div><FL>الحالة</FL>
              <Sel value={statusFilter} onChange={setStatusFilter} placeholder="كل الحالات">
                {STATUS_OPTS.map(s => <option key={s} value={s}>{PROPERTY_STATUS_LABELS[s]}</option>)}
              </Sel>
            </div>

            <div><FL>المحافظة</FL>
              <Sel value={provinceFilter} onChange={handleProvinceChange} placeholder="كل المحافظات">
                {provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </Sel>
            </div>

            <div><FL>المدينة</FL>
              <Sel value={cityFilter} onChange={handleCityChange} placeholder="كل المدن">
                {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </Sel>
            </div>

            <div><FL>الحي / المنطقة</FL>
              <Sel
                value={neighborFilter}
                onChange={setNeighborFilter}
                placeholder="كل الأحياء"
              >
                {neighborhoodOptions.map(n => <option key={n} value={n}>{n}</option>)}
              </Sel>
            </div>

            <div><FL>نوع العقار</FL>
              <Sel value={typeFilter} onChange={setTypeFilter} placeholder="كل الأنواع">
                {TYPE_OPTS.map(t => <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>)}
              </Sel>
            </div>

            <div><FL>نوع العرض</FL>
              <Sel value={listingFilter} onChange={setListingFilter} placeholder="كل العروض">
                {LISTING_OPTS.map(t => <option key={t} value={t}>{LISTING_TYPE_LABELS[t]}</option>)}
              </Sel>
            </div>

            <div><FL>أدنى غرف</FL>
              <Sel value={minBedrooms} onChange={setMinBedrooms} placeholder="أي عدد">
                {["1","2","3","4","5","6"].map(n => <option key={n} value={n}>{n}+</option>)}
              </Sel>
            </div>

            <div><FL>السعر الأدنى</FL>
              <Inp value={minPrice} onChange={setMinPrice} placeholder="0" type="number" />
            </div>

            <div><FL>السعر الأقصى</FL>
              <Inp value={maxPrice} onChange={setMaxPrice} placeholder="∞" type="number" />
            </div>

            <div><FL>الترتيب</FL>
              <Sel value={sortBy} onChange={setSortBy}>
                {SORT_OPTS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </Sel>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ marginTop: "1rem" }}>
        {fetching ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8", fontSize: "0.9rem" }}>
            جارٍ تحميل العقارات...
          </div>
        ) : fetchError ? (
          <div style={{
            backgroundColor: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 12, padding: "1.25rem", textAlign: "center",
            color: "#dc2626", fontSize: "0.88rem",
          }}>
            {fetchError}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8", fontSize: "0.9rem" }}>
            {activeCount > 0 ? "لا توجد نتائج تطابق معايير التصفية" : "لا توجد عقارات بعد"}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {paginated.map(p => (
                <PropertyCard key={p.id} property={p} onClick={() => setSelected(p)} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                display: "flex", justifyContent: "center", alignItems: "center",
                gap: "0.5rem", marginTop: "1.5rem", flexWrap: "wrap",
              }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "0.4rem 1rem", borderRadius: 8,
                    border: "1px solid #e2e8f0", backgroundColor: "#fff",
                    color: page === 1 ? "#cbd5e1" : "#0f172a",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    fontFamily: "inherit", fontSize: "0.85rem",
                  }}
                >السابق</button>

                {pageNumbers().map(pg => (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      border: `1px solid ${pg === page ? "var(--color-primary)" : "#e2e8f0"}`,
                      backgroundColor: pg === page ? "var(--color-primary)" : "#fff",
                      color: pg === page ? "#fff" : "#0f172a",
                      cursor: "pointer", fontFamily: "inherit",
                      fontSize: "0.82rem", fontWeight: pg === page ? 700 : 400,
                    }}
                  >{pg}</button>
                ))}

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: "0.4rem 1rem", borderRadius: 8,
                    border: "1px solid #e2e8f0", backgroundColor: "#fff",
                    color: page === totalPages ? "#cbd5e1" : "#0f172a",
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    fontFamily: "inherit", fontSize: "0.85rem",
                  }}
                >التالي</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <PropertyDetailModal
        property={selected}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatusChange}
        onModerationChange={handleModerationChange}
        onDelete={handleDelete}
        onEdit={(id) => router.push(`/dashboard/admin/properties/${id}/edit`)}
        actionLoading={actionLoading}
      />
    </div>
  );
}
