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

interface LocationCity {
  id: string;
  name: string;
}

export default function NewBuyerRequestPage() {
  const router = useRouter();
  const { user, isLoading } = useProtectedRoute();

  const [title, setTitle]               = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [description, setDescription]   = useState("");
  const [city, setCity]                 = useState("");
  const [neighborhood, setNeighborhood] = useState("");

  const [cities, setCities]         = useState<LocationCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    api.get<LocationCity[]>("/locations/cities")
      .then(data => setCities(Array.isArray(data) ? data : []))
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, []);

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

    setSaving(true);
    try {
      await api.post("/buyer-requests", {
        title:        title.trim(),
        propertyType,
        description:  description.trim(),
        city:         city.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
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

      {/* ── Header ── */}
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

      {/* ── Form ── */}
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

            {/* City */}
            <div className="form-group">
              <label className="form-label">المدينة</label>
              {citiesLoading ? (
                <div style={{
                  height: 42, borderRadius: 8,
                  background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                  backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
                }} />
              ) : (
                <select
                  className="form-input"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                >
                  <option value="">اختر المدينة (اختياري)</option>
                  {cities.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Neighborhood */}
            <div className="form-group">
              <label className="form-label">الحي</label>
              <input
                className="form-input"
                value={neighborhood}
                onChange={e => setNeighborhood(e.target.value)}
                placeholder="اكتب اسم الحي (اختياري)"
                maxLength={200}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%", marginTop: "0.5rem",
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
