"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { api, normalizeError } from "@/lib/api";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { coverageApi, type CoverageItem } from "@/features/coverage/api";
import SuggestLocationModal from "@/components/ui/SuggestLocationModal";

const SUGGEST_CITY = "__suggest_city__";
const SUGGEST_NBR  = "__suggest_nbr__";
const ALL_CITIES   = "__all_cities__";

interface LocationCity         { id: string; name: string; province: string; }
interface LocationNeighborhood { id: string; name: string; city: string; }

const COVERAGE_TYPES = [
  { value: "city_wide", label: "تغطية المدينة كاملة" },
  { value: "custom",    label: "حي محدد فقط" },
];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

function CoverageTypeBadge({ type }: { type: string }) {
  if (type === "province_wide") {
    return (
      <span style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 20,
        fontSize: "0.72rem",
        fontWeight: 600,
        background: "#fdf4ff",
        color: "#7e22ce",
        border: "1px solid #e9d5ff",
      }}>
        كل المحافظة
      </span>
    );
  }
  const isCity = type === "city_wide";
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: "0.72rem",
      fontWeight: 600,
      background: isCity ? "#dcfce7" : "#eff6ff",
      color:      isCity ? "#15803d" : "#1d4ed8",
      border:     `1px solid ${isCity ? "#bbf7d0" : "#bfdbfe"}`,
    }}>
      {isCity ? "مدينة كاملة" : "حي محدد"}
    </span>
  );
}

function coverageLabel(item: CoverageItem): string {
  if (item.coverageType === "province_wide") {
    return `محافظة ${item.province ?? ""} — كل المدن`;
  }
  if (item.neighborhoodName) {
    return `${item.cityName} — ${item.neighborhoodName}`;
  }
  return item.cityName;
}

export default function CoveragePage() {
  const { user, isLoading } = useProtectedRoute();

  const [items,       setItems]       = useState<CoverageItem[]>([]);
  const [fetchError,  setFetchError]  = useState("");
  const [fetching,    setFetching]    = useState(true);

  const [provinces,   setProvinces]   = useState<string[]>([]);
  const [province,    setProvince]    = useState("");
  const [cities,      setCities]      = useState<LocationCity[]>([]);
  const [cityId,      setCityId]      = useState("");
  const [suggestType, setSuggestType] = useState<"city" | "neighborhood" | null>(null);
  const [neighborhoods, setNeighborhoods] = useState<LocationNeighborhood[]>([]);
  const [neighborhoodId, setNeighborhoodId] = useState("");
  const [coverageType, setCoverageType] = useState<"city_wide" | "custom">("city_wide");

  const [citiesLoading,        setCitiesLoading]        = useState(false);
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(false);
  const [adding,     setAdding]     = useState(false);
  const [addError,   setAddError]   = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const isProvinceWide = cityId === ALL_CITIES;

  const load = useCallback(async () => {
    setFetching(true);
    setFetchError("");
    try {
      const data = await coverageApi.getMyCoverage();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load();
  }, [isLoading, user, load]);

  useEffect(() => {
    api.get<string[]>("/locations/provinces")
      .then(data => setProvinces(Array.isArray(data) ? data.filter(Boolean) : []))
      .catch(() => setProvinces([]));
  }, []);

  useEffect(() => {
    setCityId("");
    setNeighborhoodId("");
    setCities([]);
    setNeighborhoods([]);
    if (!province) return;
    setCitiesLoading(true);
    api.get<LocationCity[]>(`/locations/cities?province=${encodeURIComponent(province)}`)
      .then(data => setCities(Array.isArray(data) ? data.filter(c => c.id && c.name) : []))
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, [province]);

  useEffect(() => {
    setNeighborhoodId("");
    setNeighborhoods([]);
    if (!cityId || cityId === ALL_CITIES) return;
    const selected = cities.find(c => c.id === cityId);
    if (!selected) return;
    setNeighborhoodsLoading(true);
    api.get<LocationNeighborhood[]>(`/locations/neighborhoods?city=${encodeURIComponent(selected.name)}`)
      .then(data => setNeighborhoods(Array.isArray(data) ? data.filter(n => n.id && n.name) : []))
      .catch(() => setNeighborhoods([]))
      .finally(() => setNeighborhoodsLoading(false));
  }, [cityId, cities]);

  useEffect(() => {
    if (coverageType === "city_wide") setNeighborhoodId("");
  }, [coverageType]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    setAddSuccess("");

    if (isProvinceWide) {
      if (!province) { setAddError("يرجى اختيار المحافظة"); return; }
      setAdding(true);
      try {
        const newItem = await coverageApi.add({
          coverageType: "province_wide",
          province,
        });
        setItems(prev => [newItem, ...prev]);
        setAddSuccess("تمت إضافة تغطية كاملة للمحافظة بنجاح");
        setProvince(""); setCityId(""); setNeighborhoodId("");
        setCoverageType("city_wide");
      } catch (e) {
        setAddError(normalizeError(e));
      } finally {
        setAdding(false);
      }
      return;
    }

    if (!cityId) { setAddError("يرجى اختيار المدينة"); return; }
    if (coverageType === "custom" && !neighborhoodId) {
      setAddError("يرجى اختيار الحي عند اختيار تغطية حي محدد"); return;
    }
    setAdding(true);
    try {
      const newItem = await coverageApi.add({
        cityId,
        neighborhoodId: coverageType === "custom" ? neighborhoodId : undefined,
        coverageType,
      });
      setItems(prev => [newItem, ...prev]);
      setAddSuccess("تمت إضافة منطقة التغطية بنجاح");
      setProvince(""); setCityId(""); setNeighborhoodId("");
      setCoverageType("city_wide");
    } catch (e) {
      setAddError(normalizeError(e));
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteError("");
    setDeletingId(id);
    try {
      await coverageApi.remove(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      setDeleteError(normalizeError(e));
    } finally {
      setDeletingId(null);
    }
  }

  if (isLoading || !user) return null;

  const submitDisabled = adding || (!cityId && !isProvinceWide) || (isProvinceWide && !province);

  return (
    <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>

      {/* Header */}
      <div style={{
        backgroundColor: "#fff",
        borderBottom: "1px solid #e2e8f0",
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>مناطق التغطية</h1>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280" }}>حدد المناطق التي تعمل فيها لاستقبال الطلبات المطابقة</p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.5rem 1rem" }}>

        {/* Add Coverage Form */}
        <div style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: "1.25rem",
          marginBottom: "1.5rem",
        }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>
            إضافة منطقة تغطية جديدة
          </h2>

          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>

            {/* Province */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                المحافظة
              </label>
              <select
                className="form-input"
                value={province}
                onChange={e => setProvince(e.target.value)}
                style={{ width: "100%" }}
              >
                <option value="">— اختر المحافظة —</option>
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* City — includes "كل المدن" as first option after province is chosen */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                المدينة {citiesLoading && <span style={{ fontWeight: 400, color: "#9ca3af" }}>جاري التحميل...</span>}
              </label>
              <select
                className="form-input"
                value={cityId}
                onChange={e => {
                  if (e.target.value === SUGGEST_CITY) { setSuggestType("city"); return; }
                  setCityId(e.target.value);
                }}
                disabled={!province || citiesLoading}
                style={{ width: "100%" }}
              >
                <option value="">— اختر المدينة —</option>
                {/* "كل المدن" is always first when a province is selected */}
                {province && (
                  <option value={ALL_CITIES}>🏙 كل المدن</option>
                )}
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                {province && <option value={SUGGEST_CITY}>💡 اقترح مدينة جديدة...</option>}
              </select>
            </div>

            {/* Province-wide notice */}
            {isProvinceWide && (
              <div style={{
                background: "#fdf4ff",
                border: "1px solid #e9d5ff",
                borderRadius: 8,
                padding: "0.65rem 0.85rem",
                fontSize: "0.83rem",
                color: "#6b21a8",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}>
                <span style={{ flexShrink: 0 }}>🏙</span>
                <span>
                  سيتم تسجيل تغطية <strong>كاملة لمحافظة {province}</strong>. ستستقبل جميع الطلبات المطابقة من أي مدينة داخل هذه المحافظة.
                </span>
              </div>
            )}

            {/* Coverage type — hidden for province_wide */}
            {!isProvinceWide && (
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  نوع التغطية
                </label>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {COVERAGE_TYPES.map(ct => (
                    <label key={ct.value} style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.6rem 0.85rem",
                      borderRadius: 8,
                      border: `2px solid ${coverageType === ct.value ? "#16a34a" : "#e2e8f0"}`,
                      background: coverageType === ct.value ? "#f0fdf4" : "#fff",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: coverageType === ct.value ? 600 : 400,
                      color: coverageType === ct.value ? "#166534" : "#374151",
                      transition: "all 0.15s",
                    }}>
                      <input
                        type="radio"
                        name="coverageType"
                        value={ct.value}
                        checked={coverageType === ct.value}
                        onChange={() => setCoverageType(ct.value as "city_wide" | "custom")}
                        style={{ margin: 0 }}
                      />
                      {ct.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Neighborhood (only when custom and not province_wide) */}
            {!isProvinceWide && coverageType === "custom" && (
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 4 }}>
                  الحي {neighborhoodsLoading && <span style={{ fontWeight: 400, color: "#9ca3af" }}>جاري التحميل...</span>}
                </label>
                <select
                  className="form-input"
                  value={neighborhoodId}
                  onChange={e => {
                    if (e.target.value === SUGGEST_NBR) { setSuggestType("neighborhood"); return; }
                    setNeighborhoodId(e.target.value);
                  }}
                  disabled={!cityId || neighborhoodsLoading}
                  style={{ width: "100%" }}
                >
                  <option value="">— اختر الحي —</option>
                  {neighborhoods.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                  {cityId && <option value={SUGGEST_NBR}>💡 اقترح حياً جديداً...</option>}
                </select>
              </div>
            )}

            {addError  && <InlineBanner type="error"   message={addError}   />}
            {addSuccess && <InlineBanner type="success" message={addSuccess} />}

            <button
              type="submit"
              disabled={submitDisabled}
              style={{
                alignSelf: "flex-start",
                padding: "0.55rem 1.25rem",
                borderRadius: 8,
                background: submitDisabled ? "#86efac" : "#16a34a",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: "0.88rem",
                cursor: submitDisabled ? "not-allowed" : "pointer",
              }}
            >
              {adding ? "جارٍ الإضافة..." : "+ إضافة منطقة"}
            </button>
          </form>
        </div>

        {/* Coverage list */}
        <div style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          overflow: "hidden",
        }}>
          <div style={{
            padding: "0.85rem 1.25rem",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#111827" }}>
              مناطقي الحالية
            </h2>
            <span style={{
              fontSize: "0.75rem",
              background: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
              borderRadius: 12,
              padding: "2px 10px",
              fontWeight: 600,
            }}>
              {items.length} منطقة
            </span>
          </div>

          {fetchError && (
            <div style={{ padding: "1rem 1.25rem" }}>
              <InlineBanner type="error" message={fetchError} />
            </div>
          )}

          {deleteError && (
            <div style={{ padding: "0 1.25rem 0.5rem" }}>
              <InlineBanner type="error" message={deleteError} />
            </div>
          )}

          {fetching ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.88rem" }}>
              جاري التحميل...
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📍</div>
              <p style={{ color: "#6b7280", fontSize: "0.88rem", margin: 0 }}>
                لم تضف أي منطقة تغطية بعد. أضف مناطقك أعلاه لاستقبال الطلبات المطابقة.
              </p>
            </div>
          ) : (
            <div>
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.85rem 1.25rem",
                    borderBottom: idx < items.length - 1 ? "1px solid #f1f5f9" : "none",
                    background: item.coverageType === "province_wide" ? "#fdf4ff" : "#fff",
                  }}
                >
                  {/* Location icon */}
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: "50%",
                    background: item.coverageType === "province_wide" ? "#f5d0fe" : "#f0fdf4",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                      stroke={item.coverageType === "province_wide" ? "#7e22ce" : "#16a34a"}
                      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                      <circle cx="12" cy="9" r="2.5"/>
                    </svg>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#111827" }}>
                        {coverageLabel(item)}
                      </span>
                      <CoverageTypeBadge type={item.coverageType} />
                    </div>
                    <p style={{ margin: "2px 0 0", fontSize: "0.74rem", color: "#9ca3af" }}>
                      أُضيفت {formatDate(item.addedAt)}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    aria-label="حذف منطقة التغطية"
                    style={{
                      padding: "0.35rem 0.75rem",
                      borderRadius: 7,
                      background: "transparent",
                      border: "1px solid #fca5a5",
                      color: "#ef4444",
                      cursor: deletingId === item.id ? "not-allowed" : "pointer",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      opacity: deletingId === item.id ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >
                    {deletingId === item.id ? "..." : "حذف"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <SuggestLocationModal
        open={suggestType !== null}
        type={suggestType ?? "city"}
        parentId={suggestType === "neighborhood" ? cityId : undefined}
        onClose={() => setSuggestType(null)}
      />
    </div>
  );
}
