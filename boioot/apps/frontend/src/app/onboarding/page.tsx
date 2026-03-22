"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "@/context/AuthContext";
import { onboardingApi } from "@/features/onboarding/api";
import { normalizeError } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import LocationPickerDynamic, { type LatLng } from "@/components/onboarding/LocationPickerDynamic";
import type { E164Number } from "libphonenumber-js/core";

// ── Roles that require business profile onboarding ────────────────────────────
const BUSINESS_ROLES = ["Broker", "CompanyOwner"];

// ── Progress steps ─────────────────────────────────────────────────────────────
const STEPS = [
  { label: "تم إنشاء الحساب" },
  { label: "الملف التجاري" },
  { label: "مكتمل" },
];

// ── Form state — mirrors the payload structure exactly ────────────────────────
interface FormState {
  displayName:  string;
  city:         string;
  district:     string;
  address:      string;
  phoneNumber:  string;
  whatsapp:     string;
  description:  string;
  latitude:     number | null;
  longitude:    number | null;
}

type FieldKey = keyof FormState;

const EMPTY: FormState = {
  displayName:  "",
  city:         "",
  district:     "",
  address:      "",
  phoneNumber:  "",
  whatsapp:     "",
  description:  "",
  latitude:     null,
  longitude:    null,
};

export default function OnboardingPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [form, setForm]           = useState<FormState>(EMPTY);
  const [geoLoading, setGeoLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [error, setError]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (user && !BUSINESS_ROLES.includes(user.role)) router.replace("/dashboard");
  }, [isLoading, isAuthenticated, user, router]);

  // ── Pre-fill from existing profile ────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user || !BUSINESS_ROLES.includes(user.role)) return;

    onboardingApi.getBusinessProfile()
      .then((p) => {
        setForm({
          displayName:  p.displayName  ?? "",
          city:         p.city         ?? "",
          district:     p.neighborhood ?? "",
          address:      p.address      ?? "",
          phoneNumber:  p.phone        ?? "",
          whatsapp:     p.whatsApp     ?? "",
          description:  p.description  ?? "",
          latitude:     p.latitude  ?? null,
          longitude:    p.longitude ?? null,
        });
      })
      .catch(() => { /* start fresh */ })
      .finally(() => setProfileLoading(false));
  }, [isAuthenticated, user]);

  // ── Generic field change ──────────────────────────────────────────────────
  function setField<K extends FieldKey>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setField(e.target.name as FieldKey, e.target.value);
  }

  // ── Map selection → updates form.latitude / form.longitude ────────────────
  const handleMapChange = useCallback((pos: LatLng) => {
    setForm((prev) => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
  }, []);

  // ── Browser geolocation ───────────────────────────────────────────────────
  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleMapChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 8000 },
    );
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errors: Partial<Record<FieldKey, string>> = {};
    if (!form.displayName.trim()) errors.displayName = "الاسم التجاري مطلوب";
    if (!form.city.trim())        errors.city        = "المدينة مطلوبة";
    if (!form.district.trim())    errors.district    = "الحي / المنطقة مطلوب";
    if (!form.address.trim())     errors.address     = "العنوان التفصيلي مطلوب";
    if (!form.phoneNumber.trim()) errors.phoneNumber = "رقم الهاتف مطلوب";
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return false;

    // Location check — exact behaviour requested
    if (!form.latitude || !form.longitude) {
      alert("يجب تحديد الموقع على الخريطة");
      return false;
    }

    return true;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    const payload = {
      city:        form.city,
      district:    form.district,
      address:     form.address,
      phoneNumber: form.phoneNumber,
      whatsapp:    form.whatsapp,
      latitude:    form.latitude!,
      longitude:   form.longitude!,
    };

    setSubmitting(true);
    try {
      await onboardingApi.updateBusinessProfile({
        displayName:  form.displayName.trim(),
        city:         payload.city.trim(),
        neighborhood: payload.district.trim(),
        address:      payload.address.trim()     || undefined,
        phone:        payload.phoneNumber.trim()  || undefined,
        whatsApp:     payload.whatsapp.trim()     || undefined,
        description:  form.description.trim()    || undefined,
        latitude:     payload.latitude,
        longitude:    payload.longitude,
      });
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("API ERROR:", error);
      console.log("Payload sent:", payload);
      setError(normalizeError(error));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading states ────────────────────────────────────────────────────────
  if (isLoading || profileLoading) return <Spinner />;
  if (!isAuthenticated || !user || !BUSINESS_ROLES.includes(user.role)) return null;

  const roleLabel = user.role === "CompanyOwner" ? "شركة تطوير" : "مكتب عقاري";

  // MapPicker value derived from form state
  const mapValue: LatLng | null =
    form.latitude != null && form.longitude != null
      ? { lat: form.latitude, lng: form.longitude }
      : null;

  return (
    <div className="login-page">
      <div className="form-card" style={{ maxWidth: 580 }}>

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
          gap: 0,
          marginBottom: "1.75rem",
        }}>
          {STEPS.map((step, i) => {
            const isCompleted = i === 0;
            const isActive    = i === 1;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%",
                    backgroundColor: (isCompleted || isActive) ? "var(--color-primary)" : "var(--color-border)",
                    color: (isCompleted || isActive) ? "#fff" : "var(--color-text-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.85rem", fontWeight: 700,
                  }}>
                    {isCompleted
                      ? (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>)
                      : i + 1}
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

          {/* ── المعلومات الأساسية ────────────────────────────────────────── */}
          <div style={{
            fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.04em",
            color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)",
            paddingBottom: "0.4rem", marginBottom: "1rem",
          }}>
            المعلومات الأساسية
          </div>

          {/* Display name */}
          <div className="form-group">
            <label className="form-label" htmlFor="displayName">
              {user.role === "CompanyOwner" ? "اسم الشركة" : "اسم المكتب العقاري"}{" "}
              <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="displayName" name="displayName" type="text" className="form-input"
              value={form.displayName} onChange={handleTextChange} required
              placeholder={user.role === "CompanyOwner" ? "مثال: شركة الأمل للتطوير العقاري" : "مثال: مكتب النجاح العقاري"}
            />
            {fieldErrors.displayName && <span className="form-error">{fieldErrors.displayName}</span>}
          </div>

          {/* Phone + WhatsApp — two columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="phoneNumber">
                رقم الهاتف <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <PhoneInput
                id="phoneNumber"
                international
                defaultCountry="SY"
                value={(form.phoneNumber || undefined) as E164Number | undefined}
                onChange={(val) => setField("phoneNumber", val ?? "")}
                className="phone-input-wrapper"
              />
              {fieldErrors.phoneNumber && <span className="form-error">{fieldErrors.phoneNumber}</span>}
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="whatsapp">
                واتساب{" "}
                <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(اختياري)</span>
              </label>
              <PhoneInput
                id="whatsapp"
                international
                defaultCountry="SY"
                value={(form.whatsapp || undefined) as E164Number | undefined}
                onChange={(val) => setField("whatsapp", val ?? "")}
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
              value={form.description} onChange={handleTextChange}
              rows={3}
              placeholder="اكتب نبذة مختصرة عن نشاطك العقاري..."
              style={{ resize: "vertical", minHeight: 80 }}
            />
          </div>

          {/* ── معلومات الموقع ───────────────────────────────────────────── */}
          <div style={{
            fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.04em",
            color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)",
            paddingBottom: "0.4rem", marginBottom: "1rem", marginTop: "0.5rem",
          }}>
            معلومات الموقع
          </div>

          {/* City + District — two columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="city">
                المدينة <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <input
                id="city" name="city" type="text" className="form-input"
                value={form.city} onChange={handleTextChange} required
                placeholder="مثال: دمشق"
              />
              {fieldErrors.city && <span className="form-error">{fieldErrors.city}</span>}
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="district">
                الحي / المنطقة <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <input
                id="district" name="district" type="text" className="form-input"
                value={form.district} onChange={handleTextChange} required
                placeholder="مثال: المزة"
              />
              {fieldErrors.district && <span className="form-error">{fieldErrors.district}</span>}
            </div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label" htmlFor="address">
              العنوان التفصيلي <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="address" name="address" type="text" className="form-input"
              value={form.address} onChange={handleTextChange} required
              placeholder="مثال: شارع الثورة، بناء رقم 7، الطابق الثالث"
            />
            {fieldErrors.address && <span className="form-error">{fieldErrors.address}</span>}
          </div>

          {/* ── Map picker ────────────────────────────────────────────────── */}
          <div className="form-group">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <label className="form-label" style={{ margin: 0 }}>
                الموقع على الخريطة <span style={{ color: "var(--color-error)" }}>*</span>
              </label>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={geoLoading}
                style={{
                  fontSize: "0.78rem", fontWeight: 600, color: "var(--color-primary)",
                  background: "none", border: "none",
                  cursor: geoLoading ? "wait" : "pointer",
                  padding: "0.2rem 0", display: "flex", alignItems: "center", gap: "0.3rem",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
                {geoLoading ? "جاري التحديد..." : "استخدم موقعي الحالي"}
              </button>
            </div>

            <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "0.6rem" }}>
              انقر على الخريطة لتحديد موقع مكتبك، أو اسحب العلامة لضبط الموقع بدقة
            </p>

            <LocationPickerDynamic value={mapValue} onChange={handleMapChange} />

            {/* Coordinates display — form.latitude / form.longitude */}
            {form.latitude != null && form.longitude != null && (
              <p style={{
                fontSize: "0.72rem", color: "var(--color-text-muted)",
                marginTop: "0.4rem", fontFamily: "monospace",
                direction: "ltr", textAlign: "right",
              }}>
                {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {submitting ? "جاري الحفظ..." : "حفظ الملف التجاري والمتابعة"}
          </button>
        </form>

        {/* Skip link */}
        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>
          يمكنك{" "}
          <Link
            href="/dashboard"
            style={{ color: "var(--color-text-secondary)", textDecoration: "underline" }}
          >
            تخطي هذه الخطوة الآن
          </Link>{" "}
          وإكمالها لاحقاً من الإعدادات
        </p>
      </div>
    </div>
  );
}
