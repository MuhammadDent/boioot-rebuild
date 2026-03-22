"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationOption {
  id: string;
  name: string;
}

interface LocationCreateResult {
  status: "created" | "exists" | "similar";
  item?: { id: string; name: string; province?: string; city?: string } | null;
  suggestion?: { id: string; name: string; province?: string; city?: string } | null;
}

interface ProvinceSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

interface CitySelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  province?: string;
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
  flexWrap: "wrap",
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

const suggestionBoxStyle: React.CSSProperties = {
  marginTop: "0.5rem",
  padding: "0.6rem 0.85rem",
  borderRadius: "8px",
  background: "#FFF8E1",
  border: "1px solid #FFD54F",
  fontSize: "0.88rem",
  color: "#5D4037",
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  alignItems: "center",
};

const useSuggBtnStyle: React.CSSProperties = {
  padding: "0.3rem 0.65rem",
  borderRadius: "6px",
  border: "none",
  background: "#F57F17",
  color: "#fff",
  fontWeight: 600,
  fontSize: "0.8rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const forceAddBtnStyle: React.CSSProperties = {
  padding: "0.3rem 0.65rem",
  borderRadius: "6px",
  border: "1px solid #bbb",
  background: "transparent",
  fontSize: "0.8rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

// ─── ProvinceSelect ───────────────────────────────────────────────────────────

export function ProvinceSelect({ label, value, onChange, disabled }: ProvinceSelectProps) {
  const [provinces, setProvinces] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchProvinces(); }, []);
  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  async function fetchProvinces() {
    try {
      const data = await api.get<string[]>("/locations/provinces");
      setProvinces(data);
    } catch { /* silent */ }
  }

  function resetAddForm() {
    setAdding(false);
    setNewName("");
    setAddError("");
    setSuggestion(null);
  }

  async function handleAdd(forceCreate = false) {
    const name = newName.trim();
    if (!name) { setAddError("اسم المحافظة مطلوب"); return; }
    setSaving(true); setAddError(""); setSuggestion(null);
    try {
      const result = await api.post<LocationCreateResult>(
        "/locations/cities",
        { name, province: name, forceCreate }
      );
      if (result.status === "created" || result.status === "exists") {
        const finalName = result.item?.name ?? name;
        await fetchProvinces();
        onChange(finalName);
        resetAddForm();
      } else if (result.status === "similar" && result.suggestion) {
        setSuggestion(result.suggestion.name);
        setSaving(false);
        return;
      }
    } catch {
      setAddError("تعذّر إضافة المحافظة — حاول مجدداً");
    } finally { setSaving(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
    if (e.key === "Escape") { resetAddForm(); }
  }

  async function handleUseSuggestion() {
    if (!suggestion) return;
    await fetchProvinces();
    onChange(suggestion);
    resetAddForm();
  }

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
        <select
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{ flex: 1 }}
        >
          <option value="">اختر محافظة...</option>
          {provinces.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button
          type="button"
          title="إضافة محافظة جديدة"
          style={addBtnStyle}
          disabled={disabled}
          onClick={() => { setAdding(true); setAddError(""); setNewName(""); setSuggestion(null); }}
        >
          +
        </button>
      </div>

      {adding && (
        <div style={inlineFormStyle}>
          <input
            ref={inputRef}
            className="form-input"
            style={{ width: "100%", fontSize: "0.9rem" }}
            placeholder="اكتب اسم المحافظة الجديدة..."
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setSuggestion(null); }}
            onKeyDown={handleKeyDown}
            disabled={saving}
            maxLength={100}
          />
          <button
            type="button"
            style={confirmBtnStyle}
            onClick={() => handleAdd(false)}
            disabled={saving}
          >
            {saving ? "..." : "حفظ"}
          </button>
          <button
            type="button"
            style={cancelBtnStyle}
            onClick={resetAddForm}
            disabled={saving}
          >
            إلغاء
          </button>
        </div>
      )}

      {suggestion && (
        <div style={suggestionBoxStyle}>
          <span>هل تقصد: <strong>{suggestion}</strong>؟</span>
          <button
            type="button"
            style={useSuggBtnStyle}
            onClick={handleUseSuggestion}
          >
            نعم، استخدمه
          </button>
          <button
            type="button"
            style={forceAddBtnStyle}
            onClick={() => handleAdd(true)}
            disabled={saving}
          >
            لا، أضف جديداً
          </button>
        </div>
      )}

      {addError && <p className="form-error">{addError}</p>}
    </div>
  );
}

// ─── CitySelect ───────────────────────────────────────────────────────────────

export function CitySelect({
  label,
  value,
  onChange,
  province,
  required,
  error,
  disabled,
}: CitySelectProps) {
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [suggestion, setSuggestion] = useState<{ id: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchCities(province); }, [province]);
  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  async function fetchCities(prov?: string) {
    try {
      const url = prov
        ? `/locations/cities?province=${encodeURIComponent(prov)}`
        : "/locations/cities";
      const data = await api.get<LocationOption[]>(url);
      setCities(data);
    } catch { /* silent */ }
  }

  function resetAddForm() {
    setAdding(false);
    setNewName("");
    setAddError("");
    setSuggestion(null);
  }

  async function handleAdd(forceCreate = false) {
    const name = newName.trim();
    if (!name) { setAddError("اسم المدينة مطلوب"); return; }
    setSaving(true); setAddError(""); setSuggestion(null);
    try {
      const result = await api.post<LocationCreateResult>(
        "/locations/cities",
        { name, province: province ?? "", forceCreate }
      );
      if (result.status === "created" || result.status === "exists") {
        const finalName = result.item?.name ?? name;
        await fetchCities(province);
        onChange(finalName);
        resetAddForm();
      } else if (result.status === "similar" && result.suggestion) {
        setSuggestion({ id: result.suggestion.id, name: result.suggestion.name });
        setSaving(false);
        return;
      }
    } catch {
      setAddError("تعذّر إضافة المدينة — حاول مجدداً");
    } finally { setSaving(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
    if (e.key === "Escape") { resetAddForm(); }
  }

  async function handleUseSuggestion() {
    if (!suggestion) return;
    await fetchCities(province);
    onChange(suggestion.name);
    resetAddForm();
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
          onClick={() => { setAdding(true); setAddError(""); setNewName(""); setSuggestion(null); }}
        >
          +
        </button>
      </div>

      {adding && (
        <div style={inlineFormStyle}>
          <input
            ref={inputRef}
            className="form-input"
            style={{ width: "100%", fontSize: "0.9rem" }}
            placeholder="اكتب اسم المدينة الجديدة..."
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setSuggestion(null); }}
            onKeyDown={handleKeyDown}
            disabled={saving}
            maxLength={100}
          />
          <button
            type="button"
            style={confirmBtnStyle}
            onClick={() => handleAdd(false)}
            disabled={saving}
          >
            {saving ? "..." : "حفظ"}
          </button>
          <button
            type="button"
            style={cancelBtnStyle}
            onClick={resetAddForm}
            disabled={saving}
          >
            إلغاء
          </button>
        </div>
      )}

      {suggestion && (
        <div style={suggestionBoxStyle}>
          <span>هل تقصد: <strong>{suggestion.name}</strong>؟</span>
          <button
            type="button"
            style={useSuggBtnStyle}
            onClick={handleUseSuggestion}
          >
            نعم، استخدمه
          </button>
          <button
            type="button"
            style={forceAddBtnStyle}
            onClick={() => handleAdd(true)}
            disabled={saving}
          >
            لا، أضف جديداً
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
  const [suggestion, setSuggestion] = useState<{ id: string; name: string } | null>(null);
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
    } catch { /* silent */ }
  }

  function resetAddForm() {
    setAdding(false);
    setNewName("");
    setAddError("");
    setSuggestion(null);
  }

  async function handleAdd(forceCreate = false) {
    const name = newName.trim();
    if (!name) { setAddError("اسم الحي مطلوب"); return; }
    if (!city) { setAddError("اختر المدينة أولاً"); return; }
    setSaving(true); setAddError(""); setSuggestion(null);
    try {
      const result = await api.post<LocationCreateResult>(
        "/locations/neighborhoods",
        { name, city, forceCreate }
      );
      if (result.status === "created" || result.status === "exists") {
        const finalName = result.item?.name ?? name;
        await fetchNeighborhoods(city);
        onChange(finalName);
        resetAddForm();
      } else if (result.status === "similar" && result.suggestion) {
        setSuggestion({ id: result.suggestion.id, name: result.suggestion.name });
        setSaving(false);
        return;
      }
    } catch {
      setAddError("تعذّر إضافة الحي — حاول مجدداً");
    } finally { setSaving(false); }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
    if (e.key === "Escape") { resetAddForm(); }
  }

  async function handleUseSuggestion() {
    if (!suggestion) return;
    await fetchNeighborhoods(city);
    onChange(suggestion.name);
    resetAddForm();
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
          onClick={() => { setAdding(true); setAddError(""); setNewName(""); setSuggestion(null); }}
        >
          +
        </button>
      </div>

      {adding && (
        <div style={inlineFormStyle}>
          <input
            ref={inputRef}
            className="form-input"
            style={{ width: "100%", fontSize: "0.9rem" }}
            placeholder="اكتب اسم الحي الجديد..."
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setSuggestion(null); }}
            onKeyDown={handleKeyDown}
            disabled={saving}
            maxLength={100}
          />
          <button
            type="button"
            style={confirmBtnStyle}
            onClick={() => handleAdd(false)}
            disabled={saving}
          >
            {saving ? "..." : "حفظ"}
          </button>
          <button
            type="button"
            style={cancelBtnStyle}
            onClick={resetAddForm}
            disabled={saving}
          >
            إلغاء
          </button>
        </div>
      )}

      {suggestion && (
        <div style={suggestionBoxStyle}>
          <span>هل تقصد: <strong>{suggestion.name}</strong>؟</span>
          <button
            type="button"
            style={useSuggBtnStyle}
            onClick={handleUseSuggestion}
          >
            نعم، استخدمه
          </button>
          <button
            type="button"
            style={forceAddBtnStyle}
            onClick={() => handleAdd(true)}
            disabled={saving}
          >
            لا، أضف جديداً
          </button>
        </div>
      )}

      {addError && <p className="form-error">{addError}</p>}
    </div>
  );
}
