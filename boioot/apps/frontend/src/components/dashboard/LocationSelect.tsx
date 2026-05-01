"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { api, ApiError } from "@/lib/api";
import LocationTypeahead from "@/components/ui/LocationTypeahead";


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

const addBtnDisabledStyle: React.CSSProperties = {
  ...addBtnStyle,
  opacity: 0.45,
  cursor: "not-allowed",
};

// ─── AddLocationModal ─────────────────────────────────────────────────────────

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
    if (e.key === "Enter" && !hasSuggestions) { e.preventDefault(); onSave(); }
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
          width: "min(96vw, 420px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1a1a1a" }}>
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
          <p style={{ margin: 0, color: "#c62828", fontSize: "0.85rem", background: "#fff3f3", padding: "0.5rem 0.7rem", borderRadius: "7px", border: "1px solid #ffcdd2" }}>
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
                padding: "0.5rem 1.3rem",
                borderRadius: "7px",
                border: "none",
                background: saving ? "#aaa" : "#2E7D32",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
              onClick={onSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                  جارٍ الحفظ...
                </>
              ) : "حفظ"}
            </button>
            <button
              type="button"
              style={{
                padding: "0.5rem 1.1rem",
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
          /* Similar state: warning + suggestions + options */
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
              <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "#7A4500" }}>
                يوجد اسم مشابه — هل تقصد أحد هذه الخيارات؟
              </p>
            </div>

            <p style={{ margin: 0, fontSize: "0.82rem", color: "#5D4037" }}>
              اختر الاسم الصحيح من القائمة، أو أضف اسماً جديداً إذا كان مختلفاً فعلاً.
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
                  <span style={{ fontSize: "0.9rem", color: "#4E342E", fontWeight: 600 }}>
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

            {/* Divider + actions */}
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
                  padding: "0.38rem 0.9rem",
                  borderRadius: "7px",
                  border: "1.5px solid #2E7D32",
                  background: "#f0fdf4",
                  color: "#2E7D32",
                  fontWeight: 600,
                  fontSize: "0.84rem",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
                onClick={onForceAdd}
                disabled={saving}
                title="أضف الاسم الجديد حتى لو كان مشابهاً"
              >
                {saving ? "جارٍ الإنشاء..." : `✚ أضف "${newName}" كاسم جديد`}
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

  async function fetchProvinces(nocache = false) {
    try {
      const url = nocache ? `/locations/provinces?_t=${Date.now()}` : "/locations/provinces";
      const data = await api.get<string[]>(url);
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
        await fetchProvinces(true);
        onChange(finalName);
        closeModal();
      } else if (result.status === "similar") {
        setSuggestions(result.suggestions ?? []);
      }
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : "تعذّر إضافة المحافظة — حاول مجدداً");
    } finally { setSaving(false); }
  }, [newName, onChange]);

  async function handleUseSuggestion(s: LocationSuggestion) {
    await fetchProvinces(true);
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
          style={disabled ? addBtnDisabledStyle : addBtnStyle}
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
  return (
    <LocationTypeahead
      type="city"
      label={label}
      value={value}
      onChange={(name) => onChange(name)}
      province={province}
      disabled={disabled}
      required={required}
      error={error}
      allowCreate={true}
    />
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
  return (
    <LocationTypeahead
      type="neighborhood"
      label={label}
      value={value}
      onChange={(name) => onChange(name)}
      city={city}
      disabled={disabled || !city}
      allowCreate={true}
    />
  );
}
