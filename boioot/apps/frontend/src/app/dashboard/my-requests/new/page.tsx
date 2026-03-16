"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { api, normalizeError } from "@/lib/api";
import { InlineBanner } from "@/components/dashboard/InlineBanner";

const PROPERTY_TYPES = [
  { value: "Apartment", label: "شقة سكنية" },
  { value: "Villa",     label: "فيلا" },
  { value: "Office",    label: "مكتب" },
  { value: "Shop",      label: "محل تجاري" },
  { value: "Land",      label: "أرض" },
  { value: "Building",  label: "بناء كامل" },
];

const ADD_NEW = "__add_new__";

interface LocationCity { id: string; name: string; province: string; }
interface LocationNeighborhood { id: string; name: string; city: string; }

// ─── Inline "Add new" field ───────────────────────────────────────────────────
function AddNewField({
  placeholder,
  saving,
  onSave,
  onCancel,
}: {
  placeholder: string;
  saving: boolean;
  onSave: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  return (
    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
      <input
        className="form-input"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        maxLength={150}
        style={{ flex: 1 }}
        autoFocus
      />
      <button
        type="button"
        disabled={saving || !value.trim()}
        onClick={() => onSave(value.trim())}
        style={{
          background: "var(--color-primary)", color: "#fff",
          border: "none", borderRadius: 8, padding: "0 1rem",
          fontWeight: 700, fontSize: "0.85rem", cursor: saving || !value.trim() ? "not-allowed" : "pointer",
          opacity: saving || !value.trim() ? 0.6 : 1,
          fontFamily: "inherit", whiteSpace: "nowrap",
        }}
      >
        {saving ? "..." : "إضافة"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          background: "#f1f5f9", color: "#475569",
          border: "none", borderRadius: 8, padding: "0 0.75rem",
          fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        إلغاء
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NewBuyerRequestPage() {
  const router = useRouter();
  const { user, isLoading } = useProtectedRoute();

  // Form fields
  const [title, setTitle]               = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [description, setDescription]   = useState("");

  // Location state
  const [provinces, setProvinces]               = useState<string[]>([]);
  const [province, setProvince]                 = useState("");
  const [cities, setCities]                     = useState<LocationCity[]>([]);
  const [cityValue, setCityValue]               = useState("");
  const [addingCity, setAddingCity]             = useState(false);
  const [savingCity, setSavingCity]             = useState(false);
  const [neighborhoods, setNeighborhoods]       = useState<LocationNeighborhood[]>([]);
  const [neighborhoodValue, setNeighborhoodValue] = useState("");
  const [addingNeighborhood, setAddingNeighborhood] = useState(false);
  const [savingNeighborhood, setSavingNeighborhood] = useState(false);

  // UI state
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [citiesLoading, setCitiesLoading]       = useState(false);
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [error, setError]                       = useState("");
  const [locationError, setLocationError]       = useState("");

  // Derived: which city name is "actually" selected
  const selectedCityName = cityValue === ADD_NEW ? "" : cityValue;

  // ── Load provinces once ───────────────────────────────────────────────────
  useEffect(() => {
    api.get<string[]>("/locations/provinces")
      .then(data => setProvinces(Array.isArray(data) ? data.filter(Boolean) : []))
      .catch(() => setProvinces([]))
      .finally(() => setProvincesLoading(false));
  }, []);

  // ── Load cities when province changes ────────────────────────────────────
  useEffect(() => {
    setCityValue("");
    setNeighborhoodValue("");
    setNeighborhoods([]);
    setAddingCity(false);
    setAddingNeighborhood(false);
    if (!province) { setCities([]); return; }
    setCitiesLoading(true);
    api.get<LocationCity[]>(`/locations/cities?province=${encodeURIComponent(province)}`)
      .then(data => setCities(Array.isArray(data) ? data : []))
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, [province]);

  // ── Load neighborhoods when city changes ─────────────────────────────────
  useEffect(() => {
    setNeighborhoodValue("");
    setAddingNeighborhood(false);
    if (!selectedCityName) { setNeighborhoods([]); return; }
    setNeighborhoodsLoading(true);
    api.get<LocationNeighborhood[]>(`/locations/neighborhoods?city=${encodeURIComponent(selectedCityName)}`)
      .then(data => setNeighborhoods(Array.isArray(data) ? data : []))
      .catch(() => setNeighborhoods([]))
      .finally(() => setNeighborhoodsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCityName]);

  // ── Handle city dropdown change ───────────────────────────────────────────
  function handleCityChange(val: string) {
    setCityValue(val);
    setAddingCity(val === ADD_NEW);
    if (val !== ADD_NEW) {
      setNeighborhoodValue("");
      setAddingNeighborhood(false);
    }
  }

  // ── Save new city ─────────────────────────────────────────────────────────
  async function handleSaveCity(name: string) {
    setLocationError("");
    setSavingCity(true);
    try {
      const result = await api.post<{ id: string; name: string; province: string }>(
        "/locations/cities",
        { name, province },
      );
      const newCity: LocationCity = { id: result.id, name: result.name, province: result.province ?? province };
      setCities(prev => [...prev.filter(c => c.name !== newCity.name), newCity].sort((a, b) => a.name.localeCompare(b.name, "ar")));
      setCityValue(newCity.name);
      setAddingCity(false);
    } catch (e) {
      setLocationError(normalizeError(e));
    } finally {
      setSavingCity(false);
    }
  }

  // ── Handle neighborhood dropdown change ───────────────────────────────────
  function handleNeighborhoodChange(val: string) {
    setNeighborhoodValue(val);
    setAddingNeighborhood(val === ADD_NEW);
  }

  // ── Save new neighborhood ─────────────────────────────────────────────────
  async function handleSaveNeighborhood(name: string) {
    if (!selectedCityName) return;
    setLocationError("");
    setSavingNeighborhood(true);
    try {
      const result = await api.post<{ id: string; name: string; city: string }>(
        "/locations/neighborhoods",
        { name, city: selectedCityName },
      );
      const newN: LocationNeighborhood = { id: result.id, name: result.name, city: result.city };
      setNeighborhoods(prev => [...prev.filter(n => n.name !== newN.name), newN].sort((a, b) => a.name.localeCompare(b.name, "ar")));
      setNeighborhoodValue(newN.name);
      setAddingNeighborhood(false);
    } catch (e) {
      setLocationError(normalizeError(e));
    } finally {
      setSavingNeighborhood(false);
    }
  }

  // ── Submit form ───────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim() || title.trim().length < 3) {
      setError("عنوان الطلب يجب أن لا يقل عن 3 أحرف");
      return;
    }
    if (!propertyType) {
      setError("يرجى اختيار فئة العقار");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError("الوصف يجب أن لا يقل عن 10 أحرف");
      return;
    }

    const finalCity         = cityValue === ADD_NEW ? "" : cityValue;
    const finalNeighborhood = neighborhoodValue === ADD_NEW ? "" : neighborhoodValue;

    setSaving(true);
    try {
      await api.post("/buyer-requests", {
        title:        title.trim(),
        propertyType,
        description:  description.trim(),
        city:         finalCity || undefined,
        neighborhood: finalNeighborhood || undefined,
      });
      router.push("/dashboard/my-requests?success=1");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !user) return null;

  return (
    <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: "#fff", borderBottom: "1px solid #e2e8f0",
        position: "sticky", top: 0, zIndex: 10,
        padding: "0.85rem 1.25rem",
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "#f1f5f9", border: "none", borderRadius: 8,
            width: 36, height: 36, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
          إضافة طلب جديد
        </h1>
      </div>

      {/* ── Form ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: "1.25rem" }}>
        <div style={{
          backgroundColor: "#fff", borderRadius: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem",
        }}>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>
            انشر طلبك وسيتواصل معك الوسطاء والملاك المناسبون
          </p>

          <InlineBanner message={error} />

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Title */}
            <div className="form-group">
              <label className="form-label">عنوان الطلب *</label>
              <input
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: أبحث عن شقة في المزة"
                maxLength={300}
                required
              />
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label">الفئة *</label>
              <select
                className="form-input"
                value={propertyType}
                onChange={e => setPropertyType(e.target.value)}
                required
              >
                <option value="">اختر فئة العقار</option>
                {PROPERTY_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">وصف الطلب *</label>
              <textarea
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="اكتب تفاصيل طلبك: المساحة، السعر المتوقع، عدد الغرف..."
                rows={5}
                maxLength={3000}
                required
                style={{ resize: "none" }}
              />
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.73rem", color: "#94a3b8", textAlign: "left" }}>
                {description.length} / 3000
              </p>
            </div>

            {/* ── Location ── */}
            <div style={{
              border: "1px solid #e2e8f0", borderRadius: 12, padding: "1rem",
              display: "flex", flexDirection: "column", gap: "0.85rem",
              backgroundColor: "#fafafa",
            }}>
              <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
                📍 الموقع (اختياري)
              </p>

              <InlineBanner message={locationError} />

              {/* Province */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">المحافظة</label>
                {provincesLoading ? (
                  <Skeleton />
                ) : (
                  <select
                    className="form-input"
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                  >
                    <option value="">اختر المحافظة</option>
                    {provinces.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* City */}
              {province && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">المدينة</label>
                  {citiesLoading ? (
                    <Skeleton />
                  ) : (
                    <>
                      <select
                        className="form-input"
                        value={cityValue}
                        onChange={e => handleCityChange(e.target.value)}
                      >
                        <option value="">اختر المدينة</option>
                        {cities.map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                        <option value={ADD_NEW}>➕ أضف مدينة جديدة...</option>
                      </select>

                      {addingCity && (
                        <AddNewField
                          placeholder="اكتب اسم المدينة الجديدة"
                          saving={savingCity}
                          onSave={handleSaveCity}
                          onCancel={() => { setAddingCity(false); setCityValue(""); }}
                        />
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Neighborhood */}
              {selectedCityName && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">الحي</label>
                  {neighborhoodsLoading ? (
                    <Skeleton />
                  ) : (
                    <>
                      <select
                        className="form-input"
                        value={neighborhoodValue}
                        onChange={e => handleNeighborhoodChange(e.target.value)}
                      >
                        <option value="">اختر الحي</option>
                        {neighborhoods.map(n => (
                          <option key={n.id} value={n.name}>{n.name}</option>
                        ))}
                        <option value={ADD_NEW}>➕ أضف حياً جديداً...</option>
                      </select>

                      {addingNeighborhood && (
                        <AddNewField
                          placeholder="اكتب اسم الحي الجديد"
                          saving={savingNeighborhood}
                          onSave={handleSaveNeighborhood}
                          onCancel={() => { setAddingNeighborhood(false); setNeighborhoodValue(""); }}
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%", marginTop: "0.25rem",
                padding: "0.9rem",
                backgroundColor: saving ? "#86efac" : "var(--color-primary)",
                color: "#fff", border: "none", borderRadius: 12,
                fontWeight: 700, fontSize: "0.95rem",
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                boxShadow: saving ? "none" : "0 2px 8px rgba(34,197,94,0.3)",
                transition: "background 0.2s",
              }}
            >
              {saving ? "جارٍ النشر..." : "حفظ ونشر"}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{
      height: 42, borderRadius: 8,
      background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
    }} />
  );
}
