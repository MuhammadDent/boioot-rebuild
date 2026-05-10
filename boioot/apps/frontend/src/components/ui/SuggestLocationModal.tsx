"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";

interface Props {
  open: boolean;
  type: "city" | "neighborhood";
  parentId?: string;
  onClose: () => void;
}

export default function SuggestLocationModal({ open, type, parentId, onClose }: Props) {
  const [name, setName]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (open) {
      setName("");
      setError("");
      setSuccess(false);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  const label = type === "city" ? "مدينة" : "حي";
  const title = type === "city" ? "إضافة مدينة جديدة" : "إضافة حي جديد";

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) { setError(`اسم ${label} مطلوب`); return; }
    setSaving(true);
    setError("");
    try {
      await api.post("/locations/suggestions", {
        name: trimmed,
        type,
        parentId: parentId || null,
      });
      setSuccess(true);
    } catch {
      setError("تعذّر الإرسال — حاول مجدداً");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !success) { e.preventDefault(); handleSubmit(); }
    if (e.key === "Escape") { onClose(); }
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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

        {success ? (
          <>
            <div
              style={{
                background: "#f0fdf4",
                border: "1.5px solid #86efac",
                borderRadius: "10px",
                padding: "1rem 1.2rem",
                color: "#166534",
                fontSize: "0.95rem",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              ✅ تمت الإضافة بنجاح — ستظهر في القوائم فوراً!
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                style={{
                  padding: "0.5rem 1.3rem",
                  borderRadius: "7px",
                  border: "none",
                  background: "#2E7D32",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
                onClick={onClose}
              >
                حسناً
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: "0.86rem", color: "#555" }}>
              اكتب اسم {label === "مدينة" ? "المدينة" : "الحي"} الجديد.
              ستُضاف مباشرة وتصبح متاحة لجميع المستخدمين فوراً.
            </p>

            <input
              ref={inputRef}
              className="form-input"
              placeholder={`اكتب اسم ${label === "مدينة" ? "المدينة" : "الحي"}...`}
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              onKeyDown={handleKeyDown}
              disabled={saving}
              maxLength={100}
              style={{ width: "100%", boxSizing: "border-box" }}
            />

            {error && (
              <p style={{ margin: 0, color: "#c62828", fontSize: "0.85rem", background: "#fff3f3", padding: "0.5rem 0.7rem", borderRadius: "7px", border: "1px solid #ffcdd2" }}>
                {error}
              </p>
            )}

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
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    جارٍ الإضافة...
                  </>
                ) : "إضافة"}
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
                onClick={onClose}
                disabled={saving}
              >
                إلغاء
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
