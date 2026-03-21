"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";

interface AuthGateContextValue {
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function useAuthGate(): AuthGateContextValue {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate must be used inside AuthGateProvider");
  return ctx;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function AuthRequiredModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Card */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "1rem",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 18,
            padding: "2rem 2rem 1.75rem",
            maxWidth: 440,
            width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
            pointerEvents: "auto",
            position: "relative",
            textAlign: "center",
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              position: "absolute", top: "1rem", left: "1rem",
              background: "#f3f4f6", border: "none",
              width: 32, height: 32, borderRadius: "50%",
              cursor: "pointer", fontSize: "1.1rem", color: "#6b7280",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ✕
          </button>

          {/* Icon */}
          <div style={{ fontSize: "2.8rem", marginBottom: "0.75rem" }}>🔒</div>

          {/* Title */}
          <h2
            id="auth-modal-title"
            style={{
              margin: "0 0 0.75rem",
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "#111827",
            }}
          >
            يلزم تسجيل الدخول
          </h2>

          {/* Message */}
          <p
            style={{
              margin: "0 0 1.75rem",
              fontSize: "0.9rem",
              color: "#4b5563",
              lineHeight: 1.7,
            }}
          >
            يمكنك تصفح الموقع بحرية، ولكن لإضافة إعلان أو إرسال رسالة أو إضافة طلب،
            يجب تسجيل الدخول أو إنشاء حساب جديد.
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <Link
              href="/login"
              style={{
                padding: "0.65rem 1.75rem",
                background: "var(--color-primary)",
                color: "#fff",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: "0.95rem",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/register"
              style={{
                padding: "0.65rem 1.75rem",
                background: "#f0fdf4",
                color: "var(--color-primary)",
                border: "1.5px solid var(--color-primary)",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: "0.95rem",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              إنشاء حساب
            </Link>
          </div>

          {/* Dismiss */}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#9ca3af",
              fontSize: "0.85rem",
              cursor: "pointer",
              padding: "0.25rem",
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openAuthModal  = useCallback(() => setOpen(true), []);
  const closeAuthModal = useCallback(() => setOpen(false), []);

  return (
    <AuthGateContext.Provider value={{ openAuthModal, closeAuthModal }}>
      {children}
      {open && <AuthRequiredModal onClose={closeAuthModal} />}
    </AuthGateContext.Provider>
  );
}
