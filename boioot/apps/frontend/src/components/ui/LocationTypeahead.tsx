"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";

export interface LocationHit {
  id: string;
  name: string;
  parent: string;
}

interface Props {
  type: "city" | "neighborhood";
  label: string;
  value: string;
  onChange: (name: string, id?: string) => void;
  province?: string;
  city?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  placeholder?: string;
  allowCreate?: boolean;
}

export default function LocationTypeahead({
  type,
  label,
  value,
  onChange,
  province,
  city,
  disabled,
  required,
  error,
  placeholder,
  allowCreate = true,
}: Props) {
  const [input, setInput]             = useState(value);
  const [hits, setHits]               = useState<LocationHit[]>([]);
  const [open, setOpen]               = useState(false);
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState("");
  const [activeIdx, setActiveIdx]     = useState(-1);
  const [mounted, setMounted]         = useState(false);
  const [dropStyle, setDropStyle]     = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const dropRef      = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prevent double-firing create when mousedown already handled it
  const creatingRef  = useRef(false);

  useEffect(() => { setMounted(true); }, []);

  // Sync external value → input text
  useEffect(() => { setInput(value); }, [value]);

  // Reset when parent context changes (province cleared → city cleared; city cleared → neighborhood cleared)
  useEffect(() => {
    if (type === "city" && !province) { setInput(""); setHits([]); setOpen(false); }
  }, [province, type]);

  useEffect(() => {
    if (type === "neighborhood" && !city) { setInput(""); setHits([]); setOpen(false); }
  }, [city, type]);

  useEffect(() => { setActiveIdx(-1); }, [hits]);

  // ── Position portal dropdown under the input ─────────────────────────────

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [open, hits, creating]);

  // ── Click-outside: also ignore clicks on the portal dropdown itself ───────

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      if (dropRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setHits([]); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, type, limit: "10" });
        if (type === "city"         && province) params.set("province", province);
        if (type === "neighborhood" && city)     params.set("city", city);

        const data = await api.get<LocationHit[]>(`/locations/search?${params}`);
        setHits(Array.isArray(data) ? data : []);
      } catch {
        setHits([]);
      }
    }, 200);
  }, [type, province, city]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setInput(v);
    setCreateError("");
    if (!v.trim()) onChange("", undefined);
    setOpen(true);
    search(v);
  }

  function handleSelect(hit: LocationHit) {
    setInput(hit.name);
    setHits([]);
    setOpen(false);
    onChange(hit.name, hit.id);
  }

  // ── Derived flags ─────────────────────────────────────────────────────────

  const trimmed = input.trim();

  // canCreate: parent context must exist (province for city, city for neighborhood)
  const canCreate =
    allowCreate &&
    trimmed.length >= 2 &&
    (type === "city" ? !!province : !!city);

  // Show the create row whenever we can create, regardless of creating state
  // (the row itself switches between "إنشاء" label and spinner)
  const showCreateRow = canCreate;

  // Dropdown stays open while creating so the spinner is visible
  const showDropdown = open && (hits.length > 0 || showCreateRow || creating);

  // ── Instant create ────────────────────────────────────────────────────────

  async function handleCreate() {
    // Guard: prevent concurrent calls
    if (creatingRef.current) return;
    const name = trimmed;
    if (!name || name.length < 2 || !canCreate) return;

    creatingRef.current = true;
    setCreating(true);
    setCreateError("");

    try {
      const body: Record<string, string> = { name, type };
      if (type === "city"         && province) body.province = province;
      if (type === "neighborhood" && city)     body.city     = city;

      const res = await api.post<{ id: string; name: string; parent: string; status: string }>(
        "/locations/instant-create", body
      );
      setInput(res.name);
      setHits([]);
      setOpen(false);
      onChange(res.name, res.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذّر الإنشاء — حاول مجدداً";
      setCreateError(msg);
    } finally {
      setCreating(false);
      creatingRef.current = false;
    }
  }

  // ── Keyboard nav ─────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const total = hits.length + (showCreateRow ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx(i => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < hits.length) {
        handleSelect(hits[activeIdx]);
      } else if (showCreateRow && (activeIdx === hits.length || hits.length === 0)) {
        // Highlighted on create row, OR no hits at all → create
        void handleCreate();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // ── Dropdown JSX (rendered via portal to escape z-index stacking) ─────────

  const dropdown = showDropdown ? (
    <div
      ref={dropRef}
      style={{
        ...dropStyle,
        background: "#fff",
        border: "1.5px solid #d1d5db",
        borderRadius: "10px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.13)",
        overflow: "hidden",
        direction: "rtl",
        maxHeight: "260px",
        overflowY: "auto",
      }}
    >
      {/* ── Existing results ── */}
      {hits.map((hit, idx) => (
        <div
          key={hit.id}
          onMouseDown={(e) => { e.preventDefault(); handleSelect(hit); }}
          style={{
            padding: "0.6rem 0.9rem",
            cursor: "pointer",
            background: idx === activeIdx ? "#f0fdf4" : "#fff",
            borderBottom: "1px solid #f3f4f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontWeight: 600, color: "#111", fontSize: "0.9rem" }}>{hit.name}</span>
          {hit.parent && (
            <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{hit.parent}</span>
          )}
        </div>
      ))}

      {/* ── Create row — always last, shows spinner while creating ── */}
      {(showCreateRow || creating) && (
        <div
          onMouseDown={(e) => { e.preventDefault(); void handleCreate(); }}
          style={{
            padding: "0.6rem 0.9rem",
            cursor: creating ? "wait" : "pointer",
            background: activeIdx === hits.length ? "#f0fdf4" : "#fafffe",
            borderTop: hits.length > 0 ? "1px solid #e5e7eb" : undefined,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#15803d",
            fontWeight: 700,
            fontSize: "0.88rem",
          }}
        >
          {creating ? (
            <>
              <span style={{
                display: "inline-block", width: 13, height: 13,
                border: "2px solid #15803d", borderTopColor: "transparent",
                borderRadius: "50%", animation: "spin 0.7s linear infinite",
                flexShrink: 0,
              }} />
              جارٍ الإنشاء...
            </>
          ) : (
            <>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>➕</span>
              إنشاء: {trimmed}
            </>
          )}
        </div>
      )}

      {/* ── Hint when parent context is missing ── */}
      {allowCreate && trimmed.length >= 2 && !canCreate && !creating && (
        <div style={{
          padding: "0.55rem 0.9rem",
          fontSize: "0.82rem",
          color: "#9ca3af",
          background: "#fafafa",
          borderTop: hits.length > 0 ? "1px solid #e5e7eb" : undefined,
        }}>
          {type === "city" ? "اختر المحافظة أولاً لإنشاء مدينة" : "اختر المدينة أولاً لإنشاء حي"}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="form-group" ref={containerRef}>
      <label className="form-label">
        {label} {required && <span style={{ color: "#e53935" }}>*</span>}
      </label>

      <input
        ref={inputRef}
        className="form-input"
        type="text"
        value={input}
        onChange={handleInputChange}
        onFocus={() => {
          if (input.trim()) { setOpen(true); search(input); }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={
          placeholder ??
          (type === "city"
            ? (disabled ? "اختر المحافظة أولاً" : "ابحث أو اكتب اسم مدينة جديدة...")
            : (disabled ? "اختر المدينة أولاً"   : "ابحث أو اكتب اسم حي جديد..."))
        }
        autoComplete="off"
        style={{
          width: "100%",
          boxSizing: "border-box",
          borderColor: error ? "#e53935" : undefined,
        }}
      />

      {createError && (
        <p style={{ margin: "0.25rem 0 0", color: "#c62828", fontSize: "0.82rem" }}>
          {createError}
        </p>
      )}

      {error && <p className="form-error">{error}</p>}

      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
