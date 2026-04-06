"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/features/auth/api";
import { normalizeError } from "@/lib/api";
import { EyeIcon } from "@/components/ui/EyeIcon";
import {
  saveRedirectTarget as _save,
  clearRedirectTarget as _clear,
} from "@/lib/authRedirect";

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthGateContextValue {
  openAuthModal: (onSuccess?: () => void) => void;
  closeAuthModal: () => void;
}

const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function useAuthGate(): AuthGateContextValue {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error("useAuthGate must be used inside AuthGateProvider");
  return ctx;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = "register" | "login";
type RoleValue = "User" | "Owner" | "Broker" | "CompanyOwner";

const ROLES: { value: RoleValue; label: string }[] = [
  { value: "User",         label: "باحث عن عقار" },
  { value: "Owner",        label: "مالك عقار" },
  { value: "Broker",       label: "مكتب عقاري" },
  { value: "CompanyOwner", label: "شركة تطوير" },
];

// ─── Shared styles ────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.85rem",
  border: "1.5px solid #d1d5db", borderRadius: 10,
  fontSize: "0.88rem", fontFamily: "inherit", outline: "none",
  background: "#fafafa", color: "#111",
  boxSizing: "border-box", transition: "border-color 0.15s",
};
const INPUT_ERR: React.CSSProperties = { ...INPUT, borderColor: "#dc2626", background: "#fff8f8" };
const LABEL: React.CSSProperties = {
  display: "block", fontSize: "0.83rem", fontWeight: 600,
  color: "#374151", marginBottom: "0.3rem",
};
const ERR_MSG: React.CSSProperties = {
  fontSize: "0.76rem", color: "#dc2626", marginTop: "0.2rem", display: "block",
};
const PRIMARY_BTN: React.CSSProperties = {
  width: "100%", padding: "0.72rem",
  background: "var(--color-primary, #15803d)", color: "#fff",
  border: "none", borderRadius: 12,
  fontWeight: 700, fontSize: "0.93rem",
  cursor: "pointer", fontFamily: "inherit",
  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
  transition: "opacity 0.15s",
};
const EYE_BTN: React.CSSProperties = {
  position: "absolute", left: "0.6rem", top: "50%",
  transform: "translateY(-50%)",
  background: "none", border: "none", cursor: "pointer",
  color: "#9ca3af", padding: "0.15rem",
};

// ─── Spinner ─────────────────────────────────────────────────────────────────

function ModalSpinner() {
  return (
    <span style={{
      width: 16, height: 16,
      border: "2.5px solid rgba(255,255,255,0.35)",
      borderTopColor: "#fff", borderRadius: "50%",
      display: "inline-block",
      animation: "authModalSpin 0.7s linear infinite",
    }} />
  );
}

// ─── Alert banner ─────────────────────────────────────────────────────────────

function AlertBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      background: "#fef2f2", border: "1px solid #fecaca",
      borderRadius: 10, padding: "0.6rem 0.85rem",
      color: "#dc2626", fontSize: "0.83rem", marginBottom: "0.9rem",
    }}>
      {msg}
    </div>
  );
}

// ─── Register form ────────────────────────────────────────────────────────────

function RegisterForm({
  onSuccess,
  onClose,
  onSwitchToLogin,
}: {
  onSuccess?: () => void;
  onClose: () => void;
  onSwitchToLogin: () => void;
}) {
  const { login } = useAuth();

  const [fullName,  setFullName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [phone,     setPhone]     = useState("");
  const [role,      setRole]      = useState<RoleValue>("User");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPwd,   setShowPwd]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [loading,   setLoading]   = useState(false);
  const [serverErr, setServerErr] = useState("");

  function clearErr(field: string) {
    setErrors(prev => ({ ...prev, [field]: "" }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 3)   errs.fullName = "الاسم يجب أن لا يقل عن 3 أحرف";
    if (!email.includes("@"))          errs.email    = "البريد الإلكتروني غير صالح";
    if (password.length < 8)           errs.password = "8 أحرف على الأقل";
    if (password !== confirm)          errs.confirm  = "كلمتا المرور غير متطابقتين";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setServerErr("");
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await authApi.register({
        fullName: fullName.trim(),
        email:    email.trim(),
        password,
        phone:    phone.trim() || undefined,
        role,
      });
      login(res.token, res.user, res.expiresAt);
      onClose();
      onSuccess?.();
    } catch (err) {
      setServerErr(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverErr && <AlertBanner msg={serverErr} />}

      {/* Full name */}
      <div style={{ marginBottom: "0.75rem" }}>
        <label style={LABEL}>الاسم <span style={{ color: "#dc2626" }}>*</span></label>
        <input
          type="text" autoComplete="name" placeholder="مثال: أحمد محمد"
          value={fullName}
          onChange={e => { setFullName(e.target.value); clearErr("fullName"); }}
          style={errors.fullName ? INPUT_ERR : INPUT}
        />
        {errors.fullName && <span style={ERR_MSG}>{errors.fullName}</span>}
      </div>

      {/* Email */}
      <div style={{ marginBottom: "0.75rem" }}>
        <label style={LABEL}>البريد الإلكتروني <span style={{ color: "#dc2626" }}>*</span></label>
        <input
          type="email" autoComplete="email" placeholder="example@email.com"
          value={email}
          onChange={e => { setEmail(e.target.value); clearErr("email"); }}
          style={errors.email ? INPUT_ERR : INPUT}
        />
        {errors.email && <span style={ERR_MSG}>{errors.email}</span>}
      </div>

      {/* Phone + Role — side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.75rem" }}>
        <div>
          <label style={LABEL}>
            رقم الجوال{" "}
            <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: "0.74rem" }}>(اختياري)</span>
          </label>
          <input
            type="tel" autoComplete="tel" placeholder="+963 9XX XXX"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={INPUT}
          />
        </div>
        <div>
          <label style={LABEL}>نوع الحساب</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as RoleValue)}
            style={{ ...INPUT, cursor: "pointer" }}
          >
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Password */}
      <div style={{ marginBottom: "0.75rem" }}>
        <label style={LABEL}>كلمة المرور <span style={{ color: "#dc2626" }}>*</span></label>
        <div style={{ position: "relative" }}>
          <input
            type={showPwd ? "text" : "password"}
            autoComplete="new-password" placeholder="8 أحرف على الأقل"
            value={password}
            onChange={e => { setPassword(e.target.value); clearErr("password"); }}
            style={{ ...(errors.password ? INPUT_ERR : INPUT), paddingLeft: "2.4rem" }}
          />
          <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)} style={EYE_BTN} aria-label={showPwd ? "إخفاء" : "إظهار"}>
            <EyeIcon open={showPwd} />
          </button>
        </div>
        {errors.password && <span style={ERR_MSG}>{errors.password}</span>}
      </div>

      {/* Confirm password */}
      <div style={{ marginBottom: "1.1rem" }}>
        <label style={LABEL}>تأكيد كلمة المرور <span style={{ color: "#dc2626" }}>*</span></label>
        <div style={{ position: "relative" }}>
          <input
            type={showConf ? "text" : "password"}
            autoComplete="new-password" placeholder="أعد كتابة كلمة المرور"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); clearErr("confirm"); }}
            style={{ ...(errors.confirm ? INPUT_ERR : INPUT), paddingLeft: "2.4rem" }}
          />
          <button type="button" tabIndex={-1} onClick={() => setShowConf(v => !v)} style={EYE_BTN} aria-label={showConf ? "إخفاء" : "إظهار"}>
            <EyeIcon open={showConf} />
          </button>
        </div>
        {errors.confirm && <span style={ERR_MSG}>{errors.confirm}</span>}
      </div>

      <button type="submit" disabled={loading} style={{ ...PRIMARY_BTN, opacity: loading ? 0.72 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><ModalSpinner /> جاري إنشاء الحساب...</> : "إنشاء حساب ومتابعة"}
      </button>

      <p style={{ textAlign: "center", marginTop: "0.9rem", fontSize: "0.82rem", color: "#6b7280" }}>
        لديك حساب بالفعل؟{" "}
        <button type="button" onClick={onSwitchToLogin}
          style={{ background: "none", border: "none", color: "var(--color-primary, #15803d)", fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: "inherit" }}>
          تسجيل الدخول
        </button>
      </p>
    </form>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({
  onSuccess,
  onClose,
  onSwitchToRegister,
}: {
  onSuccess?: () => void;
  onClose: () => void;
  onSwitchToRegister: () => void;
}) {
  const { login } = useAuth();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errMsg,   setErrMsg]   = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrMsg("");
    setLoading(true);
    try {
      const res = await authApi.login({ email: email.trim(), password });
      login(res.token, res.user, res.expiresAt);
      onClose();
      onSuccess?.();
    } catch (err) {
      setErrMsg(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {errMsg && <AlertBanner msg={errMsg} />}

      <div style={{ marginBottom: "0.75rem" }}>
        <label style={LABEL}>البريد الإلكتروني</label>
        <input
          type="email" autoComplete="email" placeholder="example@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={INPUT}
        />
      </div>

      <div style={{ marginBottom: "1.1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
          <label style={{ ...LABEL, marginBottom: 0 }}>كلمة المرور</label>
          <a href="/forgot-password" style={{ fontSize: "0.77rem", color: "var(--color-primary, #15803d)", textDecoration: "none" }}>
            نسيت كلمة المرور؟
          </a>
        </div>
        <div style={{ position: "relative" }}>
          <input
            type={showPwd ? "text" : "password"}
            autoComplete="current-password" placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ ...INPUT, paddingLeft: "2.4rem" }}
          />
          <button type="button" tabIndex={-1} onClick={() => setShowPwd(v => !v)} style={EYE_BTN} aria-label={showPwd ? "إخفاء" : "إظهار"}>
            <EyeIcon open={showPwd} />
          </button>
        </div>
      </div>

      <button type="submit" disabled={loading} style={{ ...PRIMARY_BTN, opacity: loading ? 0.72 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <><ModalSpinner /> جاري تسجيل الدخول...</> : "تسجيل الدخول والمتابعة"}
      </button>

      <p style={{ textAlign: "center", marginTop: "0.9rem", fontSize: "0.82rem", color: "#6b7280" }}>
        ليس لديك حساب؟{" "}
        <button type="button" onClick={onSwitchToRegister}
          style={{ background: "none", border: "none", color: "var(--color-primary, #15803d)", fontWeight: 700, cursor: "pointer", padding: 0, fontFamily: "inherit", fontSize: "inherit" }}>
          إنشاء حساب
        </button>
      </p>
    </form>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess?: () => void }) {
  const [mode, setMode] = useState<Mode>("login");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
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
      <style>{`@keyframes authModalSpin { to { transform: rotate(360deg); } }`}</style>

      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" }}
      />

      {/* Centering container */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem", pointerEvents: "none", overflowY: "auto",
      }}>
        {/* Card */}
        <div
          role="dialog" aria-modal="true" aria-labelledby="auth-modal-title"
          style={{
            background: "#fff", borderRadius: 20,
            padding: "1.6rem 1.75rem 1.4rem",
            maxWidth: 490, width: "100%",
            boxShadow: "0 24px 72px rgba(0,0,0,0.22)",
            pointerEvents: "auto", position: "relative",
            overflowY: "auto", maxHeight: "92vh",
          }}
        >
          {/* Close ✕ */}
          <button
            type="button" onClick={onClose} aria-label="إغلاق"
            style={{
              position: "absolute", top: "1rem", left: "1rem",
              background: "#f3f4f6", border: "none",
              width: 30, height: 30, borderRadius: "50%",
              cursor: "pointer", color: "#6b7280",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.95rem",
            }}
          >✕</button>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "1.2rem" }}>
            <div style={{ fontSize: "1.9rem", marginBottom: "0.4rem" }}>🔐</div>
            <h2 id="auth-modal-title" style={{ margin: "0 0 0.45rem", fontSize: "1.1rem", fontWeight: 800, color: "#111827" }}>
              يلزم تسجيل الدخول أو إنشاء حساب
            </h2>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.65 }}>
              يمكنك تصفح الموقع بحرية، ولكن لإضافة إعلان أو إرسال رسالة أو إضافة طلب،
              يمكنك إنشاء حساب سريع الآن والمتابعة مباشرة.
            </p>
          </div>

          {/* Mode tabs */}
          <div style={{
            display: "flex", background: "#f3f4f6",
            borderRadius: 12, padding: "3px", marginBottom: "1.2rem", gap: "3px",
          }}>
            {([["register", "إنشاء حساب سريع"], ["login", "تسجيل الدخول"]] as [Mode, string][]).map(([m, label]) => (
              <button
                key={m} type="button" onClick={() => setMode(m)}
                style={{
                  flex: 1, padding: "0.52rem 0.4rem",
                  borderRadius: 10, border: "none",
                  fontWeight: 700, fontSize: "0.86rem",
                  cursor: "pointer", fontFamily: "inherit",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "var(--color-primary, #15803d)" : "#6b7280",
                  boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.18s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          {mode === "register" ? (
            <RegisterForm
              onClose={onClose}
              onSuccess={onSuccess}
              onSwitchToLogin={() => setMode("login")}
            />
          ) : (
            <LoginForm
              onClose={onClose}
              onSuccess={onSuccess}
              onSwitchToRegister={() => setMode("register")}
            />
          )}

          {/* Dismiss */}
          <div style={{ textAlign: "center", marginTop: "0.6rem" }}>
            <button
              type="button" onClick={onClose}
              style={{ background: "none", border: "none", color: "#9ca3af", fontSize: "0.78rem", cursor: "pointer", padding: "0.2rem" }}
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Intent storage key (re-exported for legacy imports) ─────────────────────
// The actual key is owned by @/lib/authRedirect — do NOT write to sessionStorage
// directly; use saveRedirectTarget / consumeRedirectTarget instead.
export { saveRedirectTarget, consumeRedirectTarget, clearRedirectTarget } from "@/lib/authRedirect";
/** @deprecated Import saveRedirectTarget / consumeRedirectTarget from @/lib/authRedirect instead. */
export const AUTH_INTENT_KEY = "auth.redirectAfterLogin";

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const callbackRef = useRef<(() => void) | undefined>(undefined);

  const openAuthModal = useCallback((onSuccess?: () => void) => {
    callbackRef.current = onSuccess;
    // Persist the current page so /login and /register can redirect back.
    _save();
    setOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setOpen(false);
    callbackRef.current = undefined;
  }, []);

  // Capture the callback at render time (before closeAuthModal clears it).
  // This ensures the form's onSuccess prop holds the real function
  // even though the form calls onClose() first.
  const pendingCb = callbackRef.current;
  const wrappedSuccess = pendingCb
    ? () => { _clear(); pendingCb(); }
    : () => { _clear(); };

  return (
    <AuthGateContext.Provider value={{ openAuthModal, closeAuthModal }}>
      {children}
      {open && (
        <AuthModal
          onClose={closeAuthModal}
          onSuccess={wrappedSuccess}
        />
      )}
    </AuthGateContext.Provider>
  );
}
