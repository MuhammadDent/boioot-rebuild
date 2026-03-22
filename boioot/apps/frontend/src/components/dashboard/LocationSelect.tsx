"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationOption {
  id: string;
  name: string;
}

interface LocationSuggestion {
  id: string;
  name: string;
  parentName?: string;
}

interface LocationApiResult {
  status: "created" | "exists" | "similar";
  item?: { id: string; name: string; parentName?: string } | null;
  suggestions: LocationSuggestion[];
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

// ─── Shared inline styles ─────────────────────────────────────────────────────

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

// ─── AddLocationModal ─────────────────────────────────────────────────────────
// Single reusable modal for adding provinces, cities, and neighborhoods.

interface AddLocationModalProps {
  open: boolean;
  title: string;
  placeholder: string;
  saving: boolean;
  addError: string;
  suggestions: LocationSuggestion[];
  newName: string;
  onNameChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onUseSuggestion: (s: LocationSuggestion) => void;
  onForceAdd: () => void;
}

function AddLocationModal({
  open,
  title,
  placeholder,
  saving,
  addError,
  suggestions,
  newName,
  onNameChange,
  onSave,
  onCancel,
  onUseSuggestion,
  onForceAdd,
}: AddLocationModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSuggestions = suggestions.length > 0;

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); onSave(); }
    if (e.key === "Escape") { onCancel(); }
  }

  if (!open) return null;

  const modal = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        direction: "rtl",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          padding: "1.75rem 1.5rem 1.5rem",
          width: "min(96vw, 400px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "#1a1a1a",
          }}
        >
          {title}
        </h3>

        <input
          ref={inputRef}
          className="form-input"
          placeholder={placeholder}
          value={newName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
          maxLength={100}
          style={{ width: "100%", boxSizing: "border-box" }}
        />

        {addError && (
          <p style={{ margin: 0, color: "#c62828", fontSize: "0.85rem" }}>
            {addError}
          </p>
        )}

        {/* ── Action row ── */}
        {!hasSuggestions ? (
          /* Normal state: show Save + Cancel */
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              style={{
                padding: "0.45rem 1.1rem",
                borderRadius: "7px",
                border: "none",
                background: "#2E7D32",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            <button
              type="button"
              style={{
                padding: "0.45rem 1.1rem",
                borderRadius: "7px",
                border: "1px solid #ccc",
                background: "transparent",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
              onClick={onCancel}
              disabled={saving}
            >
              إلغاء
            </button>
          </div>
        ) : (
          /* Similar state: show warning + suggestions + cancel */
          <div
            style={{
              borderRadius: "10px",
              border: "1.5px solid #F4A000",
              background: "#FFFBEE",
              padding: "0.9rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            {/* Warning header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "1.1rem" }}>⚠️</span>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: "#7A4500",
                }}
              >
                يوجد اسم مشابه — الإنشاء موقوف
              </p>
            </div>

            <p style={{ margin: 0, fontSize: "0.82rem", color: "#5D4037" }}>
              هل تقصد أحد هذه الأسماء؟ اختر الصحيح أو ألغِ العملية.
            </p>

            {/* Suggestion list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "6px",
                    background: "#fff",
                    border: "1px solid #E0C060",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: "#4E342E",
                      fontWeight: 600,
                    }}
                  >
                    {s.name}
                  </span>
                  <button
                    type="button"
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: "6px",
                      border: "none",
                      background: "#2E7D32",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                    onClick={() => onUseSuggestion(s)}
                  >
                    استخدم هذا
                  </button>
                </div>
              ))}
            </div>

            {/* Divider + force-add escape hatch */}
            <div
              style={{
                borderTop: "1px solid #E0C060",
                paddingTop: "0.55rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.4rem",
              }}
            >
              <button
                type="button"
                style={{
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: "#999",
                  fontSize: "0.78rem",
                  cursor: saving ? "not-allowed" : "pointer",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                }}
                onClick={onForceAdd}
                disabled={saving}
                title="أضف الاسم الجديد بقوة — فقط إذا كنت متأكداً أنه مختلف"
              >
                {saving ? "جارٍ الإنشاء..." : "أضف هذا الاسم بأي حال (متقدم)"}
              </button>

              <button
                type="button"
                style={{
                  padding: "0.38rem 0.9rem",
                  borderRadius: "7px",
                  border: "1px solid #ccc",
                  background: "transparent",
                  fontSize: "0.88rem",
                  cursor: "pointer",
                }}
                onClick={onCancel}
                disabled={saving}
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}

// ─── ProvinceSelect ───────────────────────────────────────────────────────────

export function ProvinceSelect({ label, value, onChange, disabled }: ProvinceSelectProps) {
  const [provinces, setProvinces] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);

  useEffect(() => { fetchProvinces(); }, []);

  async function fetchProvinces() {
    try {
      const data = await api.get<string[]>("/locations/provinces");
      setProvinces(data);
    } catch { /* silent */ }
  }

  function openModal() {
    setNewName("");
    setAddError("");
    setSuggestions([]);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setNewName("");
    setAddError("");
    setSuggestions([]);
  }

  const handleAdd = useCallback(async (forceCreate = false) => {
    const name = newName.trim();
    if (!name) { setAddError("اسم المحافظة مطلوب"); return; }
    setSaving(true);
    setAddError("");
    setSuggestions([]);
    try {
      const result = await api.post<LocationApiResult>(
        "/locations/cities",
        { name, province: name, forceCreate }
      );
      if (result.status === "created" || result.status === "exists") {
        const finalName = result.item?.name ?? name;
        await fetchProvinces();
        onChange(finalName);
        closeModal();
      } else if (result.status === "similar") {
        setSuggestions(result.suggestions ?? []);
      }
    } catch {
      setAddError("تعذّر إضافة المحافظة — حاول مجدداً");
    } finally { setSaving(false); }
  }, [newName, onChange]);

  async function handleUseSuggestion(s: LocationSuggestion) {
    await fetchProvinces();
    onChange(s.name);
    closeModal();
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
          onClick={openModal}
        >
          +
        </button>
      </div>

      <AddLocationModal
        open={modalOpen}
        title="إضافة محافظة جديدة"
        placeholder="اكتب اسم المحافظة..."
        saving={saving}
        addError={addError}
        suggestions={suggestions}
        newName={newName}
        onNameChange={(v) => { setNewName(v); setSuggestions([]); setAddError(""); }}
        onSave={() => handleAdd(false)}
        onCancel={closeModal}
        onUseSuggestion={handleUseSuggestion}
        onForceAdd={() => handleAdd(true)}
      />
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
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);

  useEffect(() => { fetchCities(province); }, [province]);

  async function fetchCities(prov?: string) {
    try {
      const url = prov
        ? `/locations/cities?province=${encodeURIComponent(prov)}`
        : "/locations/cities";
      const data = await api.get<LocationOption[]>(url);
      setCities(data);
    } catch { /* silent */ }
  }

  function openModal() {
    setNewName("");
    setAddError("");
    setSuggestions([]);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setNewName("");
    setAddError("");
    setSuggestions([]);
  }

  const handleAdd = useCallback(async (forceCreate = false) => {
    const name = newName.trim();
    if (!name) { setAddError("اسم المدينة مطلوب"); return; }
    setSaving(true);
    setAddError("");
    setSuggestions([]);
    try {
      const result = await api.post<LocationApiResult>(
        "/locations/cities",
        { name, province: province ?? "", forceCreate }
      );
      if (result.status === "created" || result.status === "exists") {
        const finalName = result.item?.name ?? name;
        await fetchCities(province);
        onChange(finalName);
        closeModal();
      } else if (result.status === "similar") {
        setSuggestions(result.suggestions ?? []);
      }
    } catch {
      setAddError("تعذّر إضافة المدينة — حاول مجدداً");
    } finally { setSaving(false); }
  }, [newName, province, onChange]);

  async function handleUseSuggestion(s: LocationSuggestion) {
    await fetchCities(province);
    onChange(s.name);
    closeModal();
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
          onClick={openModal}
        >
          +
        </button>
      </div>

      <AddLocationModal
        open={modalOpen}
        title="إضافة مدينة جديدة"
        placeholder="اكتب اسم المدينة..."
        saving={saving}
        addError={addError}
        suggestions={suggestions}
        newName={newName}
        onNameChange={(v) => { setNewName(v); setSuggestions([]); setAddError(""); }}
        onSave={() => handleAdd(false)}
        onCancel={closeModal}
        onUseSuggestion={handleUseSuggestion}
        onForceAdd={() => handleAdd(true)}
      />

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
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);

  useEffect(() => {
    if (city) {
      fetchNeighborhoods(city);
    } else {
      setNeighborhoods([]);
    }
  }, [city]);

  async function fetchNeighborhoods(cityName: string) {
    try {
      const data = await api.get<LocationOption[]>(
        `/locations/neighborhoods?city=${encodeURIComponent(cityName)}`
      );
      setNeighborhoods(data);
    } catch { /* silent */ }
  }

  function openModal() {
    setNewName("");
    setAddError("");
    setSuggestions([]);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setNewName("");
    setAddError("");
    setSuggestions([]);
  }

  const handleAdd = useCallback(async (forceCreate = false) => {
    const name = newName.trim();
    if (!name) { setAddError("اسم الحي مطلوب"); return; }
    if (!city) { setAddError("اختر المدينة أولاً"); return; }
    setSaving(true);
    setAddError("");
    setSuggestions([]);
    try {
      const result = await api.post<LocationApiResult>(
        "/locations/neighborhoods",
        { name, city, forceCreate }
      );
      if (result.status === "created" || result.status === "exists") {
        const finalName = result.item?.name ?? name;
        await fetchNeighborhoods(city);
        onChange(finalName);
        closeModal();
      } else if (result.status === "similar") {
        setSuggestions(result.suggestions ?? []);
      }
    } catch {
      setAddError("تعذّر إضافة الحي — حاول مجدداً");
    } finally { setSaving(false); }
  }, [newName, city, onChange]);

  async function handleUseSuggestion(s: LocationSuggestion) {
    await fetchNeighborhoods(city);
    onChange(s.name);
    closeModal();
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
          onClick={openModal}
        >
          +
        </button>
      </div>

      <AddLocationModal
        open={modalOpen}
        title="إضافة حي جديد"
        placeholder="اكتب اسم الحي..."
        saving={saving}
        addError={addError}
        suggestions={suggestions}
        newName={newName}
        onNameChange={(v) => { setNewName(v); setSuggestions([]); setAddError(""); }}
        onSave={() => handleAdd(false)}
        onCancel={closeModal}
        onUseSuggestion={handleUseSuggestion}
        onForceAdd={() => handleAdd(true)}
      />
    </div>
  );
}
