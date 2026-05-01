"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [input, setInput]         = useState(value);
  const [hits, setHits]           = useState<LocationHit[]>([]);
  const [open, setOpen]           = useState(false);
  const [creating, setCreating]   = useState(false);
  const [createError, setCreateError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value → input text
  useEffect(() => {
    setInput(value);
  }, [value]);

  // Reset when parent context changes
  useEffect(() => {
    if (type === "city" && !province) {
      setInput("");
      setHits([]);
    }
  }, [province, type]);

  useEffect(() => {
    if (type === "neighborhood" && !city) {
      setInput("");
      setHits([]);
    }
  }, [city, type]);

  // ── Search ────────────────────────────────────────────────────────────────

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setHits([]); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, type, limit: "10" });
        if (type === "city" && province) params.set("province", province);
        if (type === "neighborhood" && city) params.set("city", city);

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
    if (!v.trim()) {
      onChange("", undefined);
    }
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

  async function handleCreate() {
    const name = input.trim();
    if (!name || name.length < 2) return;
    setCreating(true);
    setCreateError("");
    try {
      const body: Record<string, string> = { name, type };
      if (type === "city" && province) body.province = province;
      if (type === "neighborhood" && city) body.city = city;

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

  // ── Click-outside ─────────────────────────────────────────────────────────

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ── Keyboard nav ─────────────────────────────────────────────────────────

  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => { setActiveIdx(-1); }, [hits]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const totalItems = hits.length + (allowCreate && input.trim().length >= 2 ? 1 : 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < hits.length) {
        handleSelect(hits[activeIdx]);
      } else if (activeIdx === hits.length && allowCreate) {
        handleCreate();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // ── Dropdown position via portal ─────────────────────────────────────────

  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({});

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

  const showCreate = allowCreate && input.trim().length >= 2 && !creating;
  const showDropdown = open && (hits.length > 0 || showCreate);

  const dropdown = showDropdown ? (
    <div
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
          onMouseDown={() => handleSelect(hit)}
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
          onMouseDown={handleCreate}
          style={{
            padding: "0.6rem 0.9rem",
            cursor: creating ? "not-allowed" : "pointer",
            background: activeIdx === hits.length ? "#f0fdf4" : "#fafafa",
            borderTop: hits.length > 0 ? "1px solid #e5e7eb" : undefined,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#15803d",
            fontWeight: 600,
            fontSize: "0.88rem",
          }}
        >
          {creating ? (
            <>
              <span style={{ display: "inline-block", width: "13px", height: "13px", border: "2px solid #15803d", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
              جارٍ الإنشاء...
            </>
          ) : (
            <>
              <span style={{ fontSize: "1rem", flexShrink: 0 }}>➕</span>
              إنشاء: «{input.trim()}»
            </>
          )}
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
            ? (disabled ? "اختر المحافظة أولاً" : "ابحث عن مدينة أو أنشئ مدينة جديدة...")
            : (disabled ? "اختر المدينة أولاً" : "ابحث عن حي أو أنشئ حياً جديداً..."))
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

      {typeof window !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}
