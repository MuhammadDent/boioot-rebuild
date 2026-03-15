"use client";

import { useState, useRef, useEffect, useId } from "react";

interface ComboSelectProps {
  id?: string;
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  required?: boolean;
  error?: string;
}

export default function ComboSelect({
  id: propId,
  label,
  options,
  value,
  onChange,
  placeholder = "اختر أو اكتب...",
  allowCustom = true,
  required = false,
  error,
}: ComboSelectProps) {
  const generatedId = useId();
  const id = propId ?? generatedId;

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!allowCustom && !options.includes(inputValue)) {
          setInputValue(value);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [allowCustom, inputValue, options, value]);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(inputValue.toLowerCase())
  );

  const showCustomOption =
    allowCustom &&
    inputValue.trim() !== "" &&
    !options.some((o) => o === inputValue.trim());

  function select(val: string) {
    onChange(val);
    setInputValue(val);
    setOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setInputValue(v);
    if (allowCustom) onChange(v);
    setOpen(true);
  }

  return (
    <div className="form-group" ref={containerRef}>
      <label className="form-label" htmlFor={id}>
        {label}
        {required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type="text"
          className={`form-input${error ? " border-red-400" : ""}`}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          style={{
            position: "absolute",
            insetInlineEnd: "0.5rem",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.25rem",
            color: "var(--text-muted, #6b7280)",
          }}
          aria-label="فتح القائمة"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (filtered.length > 0 || showCustomOption) && (
          <ul
            style={{
              position: "absolute",
              zIndex: 50,
              top: "calc(100% + 4px)",
              insetInlineStart: 0,
              insetInlineEnd: 0,
              background: "var(--card-bg, #fff)",
              border: "1px solid var(--border, #e5e7eb)",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
              maxHeight: "220px",
              overflowY: "auto",
              margin: 0,
              padding: "0.25rem",
              listStyle: "none",
            }}
          >
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => select(opt)}
                  style={{
                    width: "100%",
                    textAlign: "start",
                    padding: "0.45rem 0.75rem",
                    borderRadius: "0.375rem",
                    background: opt === value ? "var(--accent, #3b82f6)" : "transparent",
                    color: opt === value ? "#fff" : "inherit",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                  onMouseEnter={(e) => {
                    if (opt !== value)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "var(--hover-bg, #f3f4f6)";
                  }}
                  onMouseLeave={(e) => {
                    if (opt !== value)
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  {opt}
                </button>
              </li>
            ))}
            {showCustomOption && (
              <li>
                <button
                  type="button"
                  onClick={() => select(inputValue.trim())}
                  style={{
                    width: "100%",
                    textAlign: "start",
                    padding: "0.45rem 0.75rem",
                    borderRadius: "0.375rem",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    color: "var(--accent, #3b82f6)",
                  }}
                >
                  + إضافة &quot;{inputValue.trim()}&quot;
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
