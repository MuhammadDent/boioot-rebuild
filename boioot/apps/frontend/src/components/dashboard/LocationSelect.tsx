"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationOption {
  id: string;
  name: string;
}

interface CitySelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

interface NeighborhoodSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  city: string;
  disabled?: boolean;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const addBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "2.4rem",
  alignSelf: "stretch",
  borderRadius: "8px",
  border: "none",
  background: "#2E7D32",
  color: "#fff",
  fontSize: "1.35rem",
  cursor: "pointer",
  flexShrink: 0,
  transition: "background 0.15s",
  fontWeight: 700,
  lineHeight: 1,
};

const inlineFormStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  marginTop: "0.4rem",
  alignItems: "center",
};

const confirmBtnStyle: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  borderRadius: "6px",
  border: "none",
  background: "#2E7D32",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.85rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  borderRadius: "6px",
  border: "1px solid #ccc",
  background: "transparent",
  fontSize: "0.85rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

// ─── CitySelect ───────────────────────────────────────────────────────────────

export function CitySelect({
  label,
  value,
  onChange,
  required,
  error,
  disabled,
}: CitySelectProps) {
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  async function fetchCities() {
    try {
      const data = await api.get<LocationOption[]>("/locations/cities");
      setCities(data);
    } catch {
      // silent
    }
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) {
      setAddError("اسم المدينة مطلوب");
      return;
    }
    setSaving(true);
    setAddError("");
    try {
      const result = await api.post<LocationOption>("/locations/cities", { name });
      await fetchCities();
      onChange(result.name);
      setAdding(false);
      setNewName("");
    } catch {
      setAddError("تعذّر إضافة المدينة — حاول مجدداً");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
    if (e.key === "Escape") { setAdding(false); setNewName(""); setAddError(""); }
  }

  return (
    <div className="form-group">
      <label className="form-label">
        {label} {required && <span style={{ color: "#e53935" }}>*</span>}
      </label>

      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
        <select
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{ flex: 1 }}
        >
          <option value="">اختر مدينة...</option>
          {cities.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          title="إضافة مدينة جديدة"
          style={addBtnStyle}
          disabled={disabled}
          onClick={() => { setAdding(true); setAddError(""); setNewName(""); }}
        >
          +
        </button>
      </div>

      {adding && (
        <div style={inlineFormStyle}>
          <input
            ref={inputRef}
            className="form-input"
            style={{ flex: 1, fontSize: "0.9rem" }}
            placeholder="اكتب اسم المدينة الجديدة..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            maxLength={100}
          />
          <button type="button" style={confirmBtnStyle} onClick={handleAdd} disabled={saving}>
            {saving ? "..." : "حفظ"}
          </button>
          <button
            type="button"
            style={cancelBtnStyle}
            onClick={() => { setAdding(false); setNewName(""); setAddError(""); }}
            disabled={saving}
          >
            إلغاء
          </button>
        </div>
      )}

      {addError && <p className="form-error">{addError}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

// ─── NeighborhoodSelect ───────────────────────────────────────────────────────

export function NeighborhoodSelect({
  label,
  value,
  onChange,
  city,
  disabled,
}: NeighborhoodSelectProps) {
  const [neighborhoods, setNeighborhoods] = useState<LocationOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (city) {
      fetchNeighborhoods(city);
    } else {
      setNeighborhoods([]);
    }
  }, [city]);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  async function fetchNeighborhoods(cityName: string) {
    try {
      const data = await api.get<LocationOption[]>(
        `/locations/neighborhoods?city=${encodeURIComponent(cityName)}`
      );
      setNeighborhoods(data);
    } catch {
      // silent
    }
  }

  async function handleAdd() {
    const name = newName.trim();
    if (!name) {
      setAddError("اسم الحي مطلوب");
      return;
    }
    if (!city) {
      setAddError("اختر المدينة أولاً");
      return;
    }
    setSaving(true);
    setAddError("");
    try {
      const result = await api.post<LocationOption>("/locations/neighborhoods", { name, city });
      await fetchNeighborhoods(city);
      onChange(result.name);
      setAdding(false);
      setNewName("");
    } catch {
      setAddError("تعذّر إضافة الحي — حاول مجدداً");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
    if (e.key === "Escape") { setAdding(false); setNewName(""); setAddError(""); }
  }

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>

      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
        <select
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || !city}
          style={{ flex: 1 }}
        >
          <option value="">اختر حياً...</option>
          {neighborhoods.map((n) => (
            <option key={n.id} value={n.name}>
              {n.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          title={city ? "إضافة حي جديد" : "اختر المدينة أولاً"}
          style={{
            ...addBtnStyle,
            opacity: !city ? 0.45 : 1,
            cursor: !city ? "not-allowed" : "pointer",
          }}
          disabled={disabled || !city}
          onClick={() => { setAdding(true); setAddError(""); setNewName(""); }}
        >
          +
        </button>
      </div>

      {adding && (
        <div style={inlineFormStyle}>
          <input
            ref={inputRef}
            className="form-input"
            style={{ flex: 1, fontSize: "0.9rem" }}
            placeholder="اكتب اسم الحي الجديد..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            maxLength={100}
          />
          <button type="button" style={confirmBtnStyle} onClick={handleAdd} disabled={saving}>
            {saving ? "..." : "حفظ"}
          </button>
          <button
            type="button"
            style={cancelBtnStyle}
            onClick={() => { setAdding(false); setNewName(""); setAddError(""); }}
            disabled={saving}
          >
            إلغاء
          </button>
        </div>
      )}

      {addError && <p className="form-error">{addError}</p>}
    </div>
  );
}
