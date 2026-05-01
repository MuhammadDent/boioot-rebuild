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

  useEffect(() => { setMounted(true); }, []);

  // Sync external value → input text
  useEffect(() => { setInput(value); }, [value]);

  // Reset when parent context changes
  useEffect(() => {
    if (type === "city" && !province) { setInput(""); setHits([]); }
  }, [province, type]);

  useEffect(() => {
    if (type === "neighborhood" && !city) { setInput(""); setHits([]); }
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
  }, [open, hits]);

  // ── Click-outside: ignore clicks inside the portal dropdown itself ────────

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      const insideInput = containerRef.current?.contains(t);
      const insideDrop  = dropRef.current?.contains(t);
      if (!insideInput && !insideDrop) {
        setOpen(false);
      }
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

  // ── Instant create ────────────────────────────────────────────────────────

  // canCreate: true only when the required parent context is present
  const canCreate =
    allowCreate &&
    (type === "city" ? !!province : !!city);

  async function handleCreate() {
    const name = input.trim();
    if (!name || name.length < 2) return;
    if (!canCreate) return;

    setCreating(true);
    setCreateError("");
    try {
      const body: Record<string, string> = { name, type };
      if (type === "city"         && province) body.province = province;
      if (type === "neighborhood" && city)     body.city = city;

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
    }
  }

  // ── Keyboard nav ─────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const hasCreateRow = canCreate && input.trim().length >= 2;
    const total = hits.length + (hasCreateRow ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < hits.length) {
        handleSelect(hits[activeIdx]);
      } else if (activeIdx === hits.length && hasCreateRow) {
        void handleCreate();
      } else if (activeIdx < 0 && hits.length === 0 && hasCreateRow) {
        // No hits and nothing highlighted → create immediately
        void handleCreate();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // ── Derived display flags ─────────────────────────────────────────────────

  const trimmed = input.trim();
  // Show create row when: canCreate, input long enough, not currently creating
  const showCreate   = canCreate && trimmed.length >= 2 && !creating;
  const showDropdown = open && (hits.length > 0 || showCreate);

  const createLabel =
    type === "city"
      ? `إنشاء مدينة جديدة: ${trimmed}`
      : `إنشاء حي جديد: ${trimmed}`;

  // ── Dropdown JSX (rendered via portal) ────────────────────────────────────

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

      {showCreate && (
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
              {createLabel}
            </>
          )}
        </div>
      )}

      {/* Disabled-create hint: parent context missing */}
      {allowCreate && trimmed.length >= 2 && !canCreate && (
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
        onFocus={() => { if (input.trim()) { setOpen(true); search(input); } }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={
          placeholder ??
          (type === "city"
            ? (disabled ? "اختر المحافظة أولاً" : "ابحث أو اكتب اسم مدينة جديدة...")
            : (disabled ? "اختر المدينة أولاً" : "ابحث أو اكتب اسم حي جديد..."))
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
