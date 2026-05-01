"use client";

/**
 * LocationTypeahead — real combobox/autocomplete for city and neighborhood fields.
 *
 * Internal state is split into two distinct concerns:
 *   • `selected`  — the committed choice (id + name), set only after user picks or creates
 *   • `query`     — the live text the user is typing during an open session
 *
 * The <input> renders:
 *   • When dropdown is closed  → selected?.name  (committed display value)
 *   • When dropdown is open    → query           (live editable search text)
 *
 * This eliminates any ambiguity between "raw typed text" and "committed selection".
 *
 * External API (unchanged — all callers are compatible):
 *   value:    string               — controlled display name
 *   onChange: (name, id?) => void  — called on commit (select or create)
 */

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LocationHit {
  id:     string;
  name:   string;
  parent: string;
}

interface Selected {
  id:   string;
  name: string;
}

interface Props {
  type:         "city" | "neighborhood";
  label:        string;
  value:        string;
  onChange:     (name: string, id?: string) => void;
  province?:    string;
  city?:        string;
  disabled?:    boolean;
  required?:    boolean;
  error?:       string;
  placeholder?: string;
  allowCreate?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

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
  const inputId = useId();
  const listId  = useId();

  // ── Core state ───────────────────────────────────────────────────────────────

  const [selected,     setSelected]     = useState<Selected | null>(value ? { id: "", name: value } : null);
  const [query,        setQuery]        = useState("");
  const [isOpen,       setIsOpen]       = useState(false);
  const [hits,         setHits]         = useState<LocationHit[]>([]);
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState("");
  const [activeIdx,    setActiveIdx]    = useState(-1);
  const [mounted,      setMounted]      = useState(false);
  const [dropPos,      setDropPos]      = useState<React.CSSProperties>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const dropRef      = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const creatingRef  = useRef(false);

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  useEffect(() => { setMounted(true); }, []);

  // Sync controlled `value` → selected (only when closed, to avoid fighting live typing)
  useEffect(() => {
    if (!isOpen) {
      setSelected(value ? { id: selected?.id ?? "", name: value } : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Reset when parent context is cleared
  useEffect(() => {
    if (type === "city" && !province) {
      commitClear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [province, type]);

  useEffect(() => {
    if (type === "neighborhood" && !city) {
      commitClear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, type]);

  // Reset active index when results change
  useEffect(() => { setActiveIdx(-1); }, [hits]);

  // ── Portal positioning ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropPos({
      position: "fixed",
      top:      rect.bottom + 4,
      left:     rect.left,
      width:    rect.width,
      zIndex:   9999,
    });
  }, [isOpen, hits, creating]);

  // ── Click-outside ─────────────────────────────────────────────────────────────

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (containerRef.current?.contains(t) || dropRef.current?.contains(t)) return;
      closeDropdown();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function closeDropdown() {
    setIsOpen(false);
    setQuery("");
    setHits([]);
    setActiveIdx(-1);
    setCreateError("");
  }

  function commitClear() {
    setSelected(null);
    setQuery("");
    setHits([]);
    setIsOpen(false);
    setCreateError("");
    onChange("", undefined);
  }

  // ── Search ────────────────────────────────────────────────────────────────────

  const doSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setHits([]); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, type, limit: "10" });
        if (type === "city"         && province) params.set("province", province);
        if (type === "neighborhood" && city)     params.set("city",     city);
        const data = await api.get<LocationHit[]>(`/locations/search?${params}`);
        setHits(Array.isArray(data) ? data : []);
      } catch {
        setHits([]);
      }
    }, 200);
  }, [type, province, city]);

  // ── Derived ───────────────────────────────────────────────────────────────────

  // What the <input> renders depends on open/closed state
  const inputDisplayValue = isOpen ? query : (selected?.name ?? "");

  const trimmed        = query.trim();
  const canCreate      = allowCreate && trimmed.length >= 2 && (type === "city" ? !!province : !!city);
  const hasExactMatch  = hits.some(h => h.name.toLowerCase() === trimmed.toLowerCase());
  const showCreateRow  = canCreate && !hasExactMatch && !creating;
  const totalItems     = hits.length + (showCreateRow ? 1 : 0);
  const showDropdown   = isOpen && (hits.length > 0 || showCreateRow || creating);

  // ── Event handlers ────────────────────────────────────────────────────────────

  function handleFocus() {
    setIsOpen(true);
    // Pre-fill query with current selection so user can refine or replace
    const pre = selected?.name ?? "";
    setQuery(pre);
    if (pre) doSearch(pre);
    else setHits([]);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    setCreateError("");
    setIsOpen(true);

    if (!v.trim()) {
      // User cleared the field — decommit the selection
      setSelected(null);
      onChange("", undefined);
      setHits([]);
    } else {
      doSearch(v);
    }
  }

  // Called when user picks an existing hit
  function commitSelect(hit: LocationHit) {
    setSelected({ id: hit.id, name: hit.name });
    closeDropdown();
    onChange(hit.name, hit.id);
  }

  // Called when user picks the "➕ إنشاء" row
  async function handleCreate() {
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
      setSelected({ id: res.id, name: res.name });
      closeDropdown();
      onChange(res.name, res.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذّر الإنشاء — حاول مجدداً";
      setCreateError(msg);
    } finally {
      setCreating(false);
      creatingRef.current = false;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        if (selected?.name) { setQuery(selected.name); doSearch(selected.name); }
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx(i => (i < totalItems - 1 ? i + 1 : i));
        break;

      case "ArrowUp":
        e.preventDefault();
        setActiveIdx(i => (i > -1 ? i - 1 : -1));
        break;

      case "Enter":
        e.preventDefault();
        if (creating) break;
        if (activeIdx >= 0 && activeIdx < hits.length) {
          commitSelect(hits[activeIdx]);
        } else if (showCreateRow) {
          void handleCreate();
        }
        break;

      case "Escape":
        e.preventDefault();
        closeDropdown();
        inputRef.current?.blur();
        break;

      case "Tab":
        closeDropdown();
        break;
    }
  }

  // ── Dropdown ──────────────────────────────────────────────────────────────────

  const dropdown = showDropdown ? (
    <div
      ref={dropRef}
      role="listbox"
      id={listId}
      style={{
        ...dropPos,
        background:   "#fff",
        border:       "1.5px solid #d1d5db",
        borderRadius: "10px",
        boxShadow:    "0 8px 24px rgba(0,0,0,0.13)",
        overflow:     "hidden",
        direction:    "rtl",
        maxHeight:    "260px",
        overflowY:    "auto",
      }}
    >
      {/* ── Existing results ─────────────────────────────────────────────────── */}
      {hits.map((hit, idx) => (
        <div
          key={hit.id}
          role="option"
          aria-selected={idx === activeIdx}
          // onMouseDown + preventDefault keeps focus on <input> while also firing the selection
          onMouseDown={(e) => { e.preventDefault(); commitSelect(hit); }}
          style={{
            padding:      "0.6rem 0.9rem",
            cursor:       "pointer",
            background:   idx === activeIdx ? "#f0fdf4" : "#fff",
            borderBottom: "1px solid #f3f4f6",
            display:      "flex",
            justifyContent: "space-between",
            alignItems:   "center",
            gap:          "0.5rem",
          }}
        >
          <span style={{ fontWeight: 600, color: "#111", fontSize: "0.9rem" }}>{hit.name}</span>
          {hit.parent && (
            <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{hit.parent}</span>
          )}
        </div>
      ))}

      {/* ── "➕ إنشاء" row — shown when no exact match, switches to spinner ── */}
      {(showCreateRow || creating) && (
        <div
          role="option"
          aria-selected={activeIdx === hits.length}
          onMouseDown={(e) => { e.preventDefault(); void handleCreate(); }}
          style={{
            padding:    "0.6rem 0.9rem",
            cursor:     creating ? "wait" : "pointer",
            background: activeIdx === hits.length ? "#f0fdf4" : "#fafffe",
            borderTop:  hits.length > 0 ? "1px solid #e5e7eb" : undefined,
            display:    "flex",
            alignItems: "center",
            gap:        "0.5rem",
            color:      "#15803d",
            fontWeight: 700,
            fontSize:   "0.88rem",
          }}
        >
          {creating ? (
            <>
              <span style={{
                display:           "inline-block",
                width:             13,
                height:            13,
                border:            "2px solid #15803d",
                borderTopColor:    "transparent",
                borderRadius:      "50%",
                animation:         "spin 0.7s linear infinite",
                flexShrink:        0,
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

      {/* ── Hint when parent context is missing ─────────────────────────────── */}
      {allowCreate && trimmed.length >= 2 && !canCreate && !creating && (
        <div style={{
          padding:   "0.55rem 0.9rem",
          fontSize:  "0.82rem",
          color:     "#9ca3af",
          background:"#fafafa",
          borderTop: hits.length > 0 ? "1px solid #e5e7eb" : undefined,
        }}>
          {type === "city"
            ? "اختر المحافظة أولاً لإنشاء مدينة"
            : "اختر المدينة أولاً لإنشاء حي"}
        </div>
      )}
    </div>
  ) : null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="form-group" ref={containerRef}>
      <label className="form-label" htmlFor={inputId}>
        {label}{required && <span style={{ color: "#e53935" }}> *</span>}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        className="form-input"
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={activeIdx >= 0 ? `${listId}-opt-${activeIdx}` : undefined}
        value={inputDisplayValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={
          placeholder ??
          (type === "city"
            ? (disabled ? "اختر المحافظة أولاً" : "ابحث أو اكتب اسم مدينة جديدة...")
            : (disabled ? "اختر المدينة أولاً"  : "ابحث أو اكتب اسم حي جديد..."))
        }
        autoComplete="off"
        style={{
          width:       "100%",
          boxSizing:   "border-box",
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
