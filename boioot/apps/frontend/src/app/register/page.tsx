"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/features/auth/api";
import { normalizeError } from "@/lib/api";
import { EyeIcon } from "@/components/ui/EyeIcon";
import Spinner from "@/components/ui/Spinner";
import type { E164Number } from "libphonenumber-js/core";

type RoleValue = "User" | "Agent" | "CompanyOwner";

interface RoleOption {
  value: RoleValue;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

const ROLES: RoleOption[] = [
  {
    value: "User",
    label: "باحث عن عقار",
    desc: "أبحث عن شراء أو استئجار عقار",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    value: "User",
    label: "مالك عقار",
    desc: "أريد عرض عقاري للبيع أو الإيجار",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    value: "Agent",
    label: "وسيط عقاري",
    desc: "أعمل وسيطاً بين البائعين والمشترين",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    value: "CompanyOwner",
    label: "شركة عقارية",
    desc: "أمثّل شركة أو مكتب عقاري",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
];

interface FormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const INITIAL_FORM: FormState = { fullName: "", email: "", password: "", confirmPassword: "" };

export default function RegisterPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRoleIndex, setSelectedRoleIndex] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [phone, setPhone] = useState<E164Number | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/dashboard");
  }, [isLoading, isAuthenticated, router]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleRoleSelect(index: number) {
    setSelectedRoleIndex(index);
    setError("");
  }

  function handleNextStep() {
    if (selectedRoleIndex === null) {
      setError("يرجى تحديد نوع حسابك أولاً");
      return;
    }
    setError("");
    setStep(2);
  }

  function validate(): boolean {
    const errors: Partial<FormState> = {};
    if (form.fullName.trim().length < 3) {
      errors.fullName = "الاسم الكامل يجب أن لا يقل عن 3 أحرف";
    }
    if (!form.email.includes("@")) errors.email = "البريد الإلكتروني غير صالح";
    if (form.password.length < 8) errors.password = "كلمة المرور يجب أن لا تقل عن 8 أحرف";
    if (form.password !== form.confirmPassword) errors.confirmPassword = "كلمتا المرور غير متطابقتين";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await authApi.register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: phone || undefined,
        role: ROLES[selectedRoleIndex!].value,
      });
      login(res.token, res.user, res.expiresAt);
      router.push("/dashboard");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="login-page">
      <div className="form-card">
        <div className="login-page__logo">
          <Image src="/logo-boioot.png" alt="بيوت" width={120} height={48} style={{ objectFit: "contain" }} priority />
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                backgroundColor: step >= s ? "var(--color-primary)" : "var(--color-border)",
                color: step >= s ? "#fff" : "var(--color-text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.8rem", fontWeight: 700, transition: "all 0.2s",
              }}>
                {s}
              </div>
              {s < 2 && (
                <div style={{
                  width: 32, height: 2,
                  backgroundColor: step > s ? "var(--color-primary)" : "var(--color-border)",
                  transition: "all 0.3s",
                }} />
              )}
            </div>
          ))}
        </div>

        {/* ───── STEP 1: Role selection ───── */}
        {step === 1 && (
          <>
            <h1 className="login-page__title" style={{ marginBottom: "0.5rem" }}>ما الذي تبحث عنه؟</h1>
            <p style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.88rem", marginBottom: "1.5rem" }}>
              حدّد نوع حسابك حتى نُخصّص تجربتك
            </p>

            {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {ROLES.map((role, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleRoleSelect(i)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: "0.5rem", padding: "1rem 0.75rem",
                    border: `2px solid ${selectedRoleIndex === i ? "var(--color-primary)" : "var(--color-border)"}`,
                    borderRadius: 12, cursor: "pointer",
                    backgroundColor: selectedRoleIndex === i ? "var(--color-primary-light, #f0faf0)" : "var(--color-bg)",
                    color: selectedRoleIndex === i ? "var(--color-primary)" : "var(--color-text-primary)",
                    transition: "all 0.18s", textAlign: "center", fontFamily: "inherit",
                  }}
                >
                  <span style={{ color: selectedRoleIndex === i ? "var(--color-primary)" : "var(--color-text-secondary)" }}>
                    {role.icon}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{role.label}</span>
                  <span style={{ fontSize: "0.75rem", color: selectedRoleIndex === i ? "var(--color-primary)" : "var(--color-text-muted)", lineHeight: 1.4 }}>
                    {role.desc}
                  </span>
                </button>
              ))}
            </div>

            <button type="button" className="btn btn-primary" onClick={handleNextStep} style={{ width: "100%" }}>
              التالي ←
            </button>

            <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
              لديك حساب بالفعل؟{" "}
              <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>تسجيل الدخول</Link>
            </p>
          </>
        )}

        {/* ───── STEP 2: Form ───── */}
        {step === 2 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
              <button
                type="button"
                onClick={() => { setStep(1); setError(""); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "0.25rem", display: "flex", alignItems: "center" }}
                aria-label="رجوع"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <h1 className="login-page__title" style={{ margin: 0, fontSize: "1.1rem" }}>
                إنشاء حساب —{" "}
                <span style={{ color: "var(--color-primary)" }}>{ROLES[selectedRoleIndex!].label}</span>
              </h1>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">
                  الاسم الكامل <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <input
                  id="fullName" name="fullName" type="text" className="form-input"
                  value={form.fullName} onChange={handleChange} required
                  autoComplete="name" placeholder="مثال: أحمد محمد"
                />
                {fieldErrors.fullName && <span className="form-error">{fieldErrors.fullName}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  البريد الإلكتروني <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <input
                  id="email" name="email" type="email" className="form-input"
                  value={form.email} onChange={handleChange} required
                  autoComplete="email" placeholder="example@email.com"
                />
                {fieldErrors.email && <span className="form-error">{fieldErrors.email}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  رقم الهاتف{" "}
                  <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(اختياري)</span>
                </label>
                <PhoneInput
                  id="phone" international defaultCountry="SY"
                  value={phone} onChange={setPhone} className="phone-input-wrapper"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  كلمة المرور <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <div className="password-wrapper">
                  <input
                    id="password" name="password"
                    type={showPassword ? "text" : "password"} className="form-input"
                    value={form.password} onChange={handleChange} required
                    autoComplete="new-password" placeholder="8 أحرف على الأقل"
                  />
                  <button type="button" className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "إخفاء" : "إظهار"}>
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {fieldErrors.password && <span className="form-error">{fieldErrors.password}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">
                  تأكيد كلمة المرور <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <div className="password-wrapper">
                  <input
                    id="confirmPassword" name="confirmPassword"
                    type={showConfirm ? "text" : "password"} className="form-input"
                    value={form.confirmPassword} onChange={handleChange} required
                    autoComplete="new-password" placeholder="أعد كتابة كلمة المرور"
                  />
                  <button type="button" className="password-toggle"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "إخفاء" : "إظهار"}>
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {fieldErrors.confirmPassword && <span className="form-error">{fieldErrors.confirmPassword}</span>}
              </div>

              <button
                type="submit" className="btn btn-primary" disabled={submitting}
                style={{ width: "100%", marginTop: "0.5rem" }}
              >
                {submitting ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
              لديك حساب بالفعل؟{" "}
              <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>تسجيل الدخول</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
