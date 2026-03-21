"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "@/context/AuthContext";
import { onboardingApi } from "@/features/onboarding/api";
import { normalizeError } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import type { E164Number } from "libphonenumber-js/core";

// ── Roles that require business profile onboarding ────────────────────────────
const BUSINESS_ROLES = ["Broker", "CompanyOwner"];

// ── Progress steps ─────────────────────────────────────────────────────────────
const STEPS = [
  { label: "تم إنشاء الحساب" },
  { label: "الملف التجاري" },
  { label: "مكتمل" },
];

interface FormState {
  displayName: string;
  city: string;
  neighborhood: string;
  address: string;
  description: string;
  latStr: string;
  lonStr: string;
}

const EMPTY: FormState = {
  displayName: "",
  city: "",
  neighborhood: "",
  address: "",
  description: "",
  latStr: "",
  lonStr: "",
};

export default function OnboardingPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [form, setForm]         = useState<FormState>(EMPTY);
  const [phone, setPhone]       = useState<E164Number | undefined>(undefined);
  const [whatsApp, setWhatsApp] = useState<E164Number | undefined>(undefined);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [error, setError]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (user && !BUSINESS_ROLES.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, router]);

  // ── Pre-fill from existing company profile ────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user || !BUSINESS_ROLES.includes(user.role)) return;

    onboardingApi.getBusinessProfile()
      .then((p) => {
        setForm({
          displayName:  p.displayName  ?? "",
          city:         p.city         ?? "",
          neighborhood: p.neighborhood ?? "",
          address:      p.address      ?? "",
          description:  p.description  ?? "",
          latStr:       p.latitude  != null ? String(p.latitude)  : "",
          lonStr:       p.longitude != null ? String(p.longitude) : "",
        });
        if (p.phone)    setPhone(p.phone as E164Number);
        if (p.whatsApp) setWhatsApp(p.whatsApp as E164Number);
      })
      .catch(() => {
        // profile not found yet — start fresh
      })
      .finally(() => setProfileLoading(false));
  }, [isAuthenticated, user]);

  // ── Field change ──────────────────────────────────────────────────────────
  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.displayName.trim()) errors.displayName = "الاسم التجاري مطلوب";
    if (!form.city.trim()) errors.city = "المدينة مطلوبة";
    if (form.latStr && isNaN(Number(form.latStr))) errors.latStr = "خط العرض يجب أن يكون رقماً";
    if (form.lonStr && isNaN(Number(form.lonStr))) errors.lonStr = "خط الطول يجب أن يكون رقماً";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onboardingApi.updateBusinessProfile({
        displayName:  form.displayName.trim(),
        city:         form.city.trim(),
        neighborhood: form.neighborhood.trim() || undefined,
        address:      form.address.trim()      || undefined,
        phone:        phone                    || undefined,
        whatsApp:     whatsApp                 || undefined,
        description:  form.description.trim()  || undefined,
        latitude:     form.latStr ? Number(form.latStr) : undefined,
        longitude:    form.lonStr ? Number(form.lonStr) : undefined,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading states ────────────────────────────────────────────────────────
  if (isLoading || profileLoading) return <Spinner />;
  if (!isAuthenticated || !user || !BUSINESS_ROLES.includes(user.role)) return null;

  const roleLabel = user.role === "CompanyOwner" ? "شركة تطوير" : "مكتب عقاري";

  return (
    <div className="login-page">
      <div className="form-card" style={{ maxWidth: 560 }}>

        {/* Logo */}
        <div className="login-page__logo">
          <Image
            src="/logo-boioot.png"
            alt="بيوت"
            width={110}
            height={44}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        {/* ── Progress indicator ─────────────────────────────────────────── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0",
          marginBottom: "1.75rem",
        }}>
          {STEPS.map((step, i) => {
            const isCompleted = i === 0;
            const isActive    = i === 1;
            return (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center" }}
              >
                {/* Circle + label */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    backgroundColor: isCompleted
                      ? "var(--color-primary)"
                      : isActive
                      ? "var(--color-primary)"
                      : "var(--color-border)",
                    color: (isCompleted || isActive) ? "#fff" : "var(--color-text-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.85rem", fontWeight: 700,
                  }}>
                    {isCompleted ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span style={{
                    fontSize: "0.7rem",
                    fontWeight: isActive ? 700 : 400,
                    color: (isCompleted || isActive) ? "var(--color-primary)" : "var(--color-text-muted)",
                    whiteSpace: "nowrap",
                  }}>
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div style={{
                    width: 48, height: 2, margin: "0 0.25rem", marginBottom: "1.1rem",
                    backgroundColor: i === 0 ? "var(--color-primary)" : "var(--color-border)",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 className="login-page__title" style={{ marginBottom: "0.35rem" }}>
            أكمل ملفك التجاري
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem" }}>
            حساب <strong>{roleLabel}</strong> — يُساعدنا ذلك في عرض معلوماتك للعملاء بشكل احترافي
          </p>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}

        {/* ── Form ─────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} noValidate>

          {/* Display name */}
          <div className="form-group">
            <label className="form-label" htmlFor="displayName">
              {user.role === "CompanyOwner" ? "اسم الشركة" : "اسم المكتب العقاري"}{" "}
              <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="displayName" name="displayName" type="text" className="form-input"
              value={form.displayName} onChange={handleChange} required
              placeholder={user.role === "CompanyOwner" ? "مثال: شركة الأمل للتطوير العقاري" : "مثال: مكتب النجاح العقاري"}
            />
            {fieldErrors.displayName && <span className="form-error">{fieldErrors.displayName}</span>}
          </div>

          {/* City + Neighborhood — two columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="city">
                المدينة <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <input
                id="city" name="city" type="text" className="form-input"
                value={form.city} onChange={handleChange} required
                placeholder="مثال: دمشق"
              />
              {fieldErrors.city && <span className="form-error">{fieldErrors.city}</span>}
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="neighborhood">
                الحي / المنطقة
              </label>
              <input
                id="neighborhood" name="neighborhood" type="text" className="form-input"
                value={form.neighborhood} onChange={handleChange}
                placeholder="مثال: المزة"
              />
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="address">العنوان التفصيلي</label>
            <input
              id="address" name="address" type="text" className="form-input"
              value={form.address} onChange={handleChange}
              placeholder="مثال: شارع الثورة، بناء رقم 7، الطابق الثالث"
            />
          </div>

          {/* Phone + WhatsApp — two columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="phone">رقم الهاتف الرئيسي</label>
              <PhoneInput
                id="phone" international defaultCountry="SY"
                value={phone} onChange={setPhone}
                className="phone-input-wrapper"
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="whatsApp">
                واتساب{" "}
                <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(اختياري)</span>
              </label>
              <PhoneInput
                id="whatsApp" international defaultCountry="SY"
                value={whatsApp} onChange={setWhatsApp}
                className="phone-input-wrapper"
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">
              نبذة تعريفية{" "}
              <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(اختياري)</span>
            </label>
            <textarea
              id="description" name="description" className="form-input"
              value={form.description} onChange={handleChange}
              rows={3}
              placeholder="اكتب نبذة مختصرة عن نشاطك العقاري..."
              style={{ resize: "vertical", minHeight: 80 }}
            />
          </div>

          {/* Coordinates — collapsible section */}
          <details style={{ marginBottom: "1.25rem" }}>
            <summary style={{
              cursor: "pointer",
              fontSize: "0.85rem",
              color: "var(--color-text-secondary)",
              fontWeight: 600,
              userSelect: "none",
              marginBottom: "0.75rem",
            }}>
              الموقع الجغرافي (اختياري)
            </summary>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.5rem" }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="latStr">خط العرض (Latitude)</label>
                <input
                  id="latStr" name="latStr" type="text" className="form-input"
                  value={form.latStr} onChange={handleChange}
                  placeholder="مثال: 33.5102"
                  inputMode="decimal"
                />
                {fieldErrors.latStr && <span className="form-error">{fieldErrors.latStr}</span>}
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="lonStr">خط الطول (Longitude)</label>
                <input
                  id="lonStr" name="lonStr" type="text" className="form-input"
                  value={form.lonStr} onChange={handleChange}
                  placeholder="مثال: 36.2913"
                  inputMode="decimal"
                />
                {fieldErrors.lonStr && <span className="form-error">{fieldErrors.lonStr}</span>}
              </div>
            </div>
          </details>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: "100%", marginTop: "0.25rem" }}
          >
            {submitting ? "جاري الحفظ..." : "حفظ الملف التجاري والمتابعة"}
          </button>
        </form>

        {/* Skip link */}
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
          يمكنك{" "}
          <Link href="/dashboard" style={{ color: "var(--color-text-secondary)", textDecoration: "underline" }}>
            تخطي هذه الخطوة الآن
          </Link>{" "}
          وإكمالها لاحقاً من الإعدادات
        </p>
      </div>
    </div>
  );
}
