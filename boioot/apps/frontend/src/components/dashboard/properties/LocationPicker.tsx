"use client";

import dynamic from "next/dynamic";

const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 320,
        borderRadius: 10,
        background: "#f1f5f9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        fontSize: "0.9rem",
      }}
    >
      جاري تحميل الخريطة...
    </div>
  ),
});

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
  disabled?: boolean;
}

export default function LocationPicker({ lat, lng, onChange, disabled }: Props) {
  const hasLocation = lat != null && lng != null;

  return (
    <div className="form-group">
      <label className="form-label">الموقع على الخريطة (اختياري)</label>

      <p style={{ margin: "0 0 0.65rem", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
        انقر على الخريطة لتحديد موقع العقار، أو اسحب العلامة لضبطه بدقة.
      </p>

      {/* Map */}
      <div style={{ pointerEvents: disabled ? "none" : "auto", opacity: disabled ? 0.6 : 1 }}>
        <LocationPickerMap
          lat={lat}
          lng={lng}
          onChange={(newLat, newLng) => onChange(newLat, newLng)}
        />
      </div>

      {/* Coordinates display + clear button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "0.5rem",
          minHeight: 28,
        }}
      >
        {hasLocation ? (
          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--color-text-secondary)",
              fontFamily: "monospace",
              direction: "ltr",
              display: "inline-block",
            }}
          >
            {lat!.toFixed(6)}, {lng!.toFixed(6)}
          </span>
        ) : (
          <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            لم يُحدَّد موقع بعد
          </span>
        )}

        {hasLocation && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null, null)}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-error, #dc2626)",
              fontSize: "0.82rem",
              cursor: disabled ? "default" : "pointer",
              padding: "0.15rem 0.25rem",
              textDecoration: "underline",
            }}
          >
            حذف الموقع
          </button>
        )}
      </div>
    </div>
  );
}
