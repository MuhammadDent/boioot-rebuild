"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "@/context/AuthContext";
import { onboardingApi } from "@/features/onboarding/api";
import { api, normalizeError } from "@/lib/api";
import Spinner from "@/components/ui/Spinner";
import LocationPickerDynamic, { type LatLng } from "@/components/onboarding/LocationPickerDynamic";
import { CitySelect, NeighborhoodSelect } from "@/components/dashboard/LocationSelect";
import type { E164Number } from "libphonenumber-js/core";

// Roles that go through onboarding
const BUSINESS_ROLES = ["Broker", "CompanyOwner"];

const STEPS = [
  { label: "تم إنشاء الحساب" },
  { label: "الملف المهني" },
  { label: "مكتمل" },
];

interface LocationCity         { id: string; name: string; province: string; }
interface LocationNeighborhood { id: string; name: string; city: string; }

interface FormState {
  displayName: string;
  address:     string;
  phoneNumber: string;
  whatsapp:    string;
  description: string;
  latitude:    number | null;
  longitude:   number | null;
}

type FieldKey = keyof FormState;

const EMPTY: FormState = {
  displayName: "",
  address:     "",
  phoneNumber: "",
  whatsapp:    "",
  description: "",
  latitude:    null,
  longitude:   null,
};

// ── Shared helpers ────────────────────────────────────────────────────────────

const SECTION_HEADER: React.CSSProperties = {
  fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.04em",
  color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)",
  paddingBottom: "0.4rem", marginBottom: "1rem",
};

const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: "0.9rem",
  background: "#fff",
  color: "var(--color-text)",
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "left 0.75rem center",
  paddingLeft: "2rem",
  cursor: "pointer",
  fontFamily: "inherit",
  lineHeight: 1.5,
};

// ── Page component ────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [form, setForm]               = useState<FormState>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey | "cityId" | "neighborhoodId" | "province", string>>>({});
  const [error, setError]             = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [geoLoading, setGeoLoading]   = useState(false);

  // ── Location cascade ──────────────────────────────────────────────────────
  const [provinces,        setProvinces]        = useState<string[]>([]);
  const [province,         setProvince]         = useState("");
  const [provincesLoading, setProvincesLoading] = useState(true);

  const [cities,           setCities]           = useState<LocationCity[]>([]);
  const [citiesLoading,    setCitiesLoading]    = useState(false);
  const [cityId,           setCityId]           = useState("");
  const [cityName,         setCityName]         = useState("");

  const [neighborhoods,        setNeighborhoods]        = useState<LocationNeighborhood[]>([]);
  const [neighborhoodsLoading, setNeighborhoodsLoading] = useState(false);
  const [neighborhoodId,       setNeighborhoodId]       = useState("");
  const [neighborhoodName,     setNeighborhoodName]     = useState("");

  // ── Role helpers ──────────────────────────────────────────────────────────
  const isBroker       = user?.role === "Broker";
  const isCompanyOwner = user?.role === "CompanyOwner";

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.replace("/login"); return; }
    if (user && !BUSINESS_ROLES.includes(user.role)) router.replace("/dashboard");
  }, [isLoading, isAuthenticated, user, router]);

  // ── Load provinces once ───────────────────────────────────────────────────
  useEffect(() => {
    api.get<string[]>("/locations/provinces")
      .then(data => setProvinces(Array.isArray(data) ? data.filter(Boolean) : []))
      .catch(() => setProvinces([]))
      .finally(() => setProvincesLoading(false));
  }, []);

  // ── Load cities when province changes ─────────────────────────────────────
  useEffect(() => {
    setCityId(""); setCityName(""); setNeighborhoodId(""); setNeighborhoodName(""); setNeighborhoods([]);
    if (!province) { setCities([]); return; }
    setCitiesLoading(true);
    api.get<LocationCity[]>(`/locations/cities?province=${encodeURIComponent(province)}`)
      .then(data => {
        const safe = Array.isArray(data)
          ? data.filter(c => c?.id && c?.name).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"))
          : [];
        setCities(safe);
      })
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
  }, [province]);

  // ── Load neighborhoods when city changes ──────────────────────────────────
  useEffect(() => {
    setNeighborhoodId(""); setNeighborhoodName("");
    if (!cityName) { setNeighborhoods([]); return; }
    setNeighborhoodsLoading(true);
    api.get<LocationNeighborhood[]>(`/locations/neighborhoods?city=${encodeURIComponent(cityName)}`)
      .then(data => {
        const safe = Array.isArray(data)
          ? data.filter(n => n?.id && n?.name).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"))
          : [];
        setNeighborhoods(safe);
      })
      .catch(() => setNeighborhoods([]))
      .finally(() => setNeighborhoodsLoading(false));
  }, [cityName]);

  // ── Pre-fill from existing profile ────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user || !BUSINESS_ROLES.includes(user.role)) return;

    onboardingApi.getBusinessProfile()
      .then((p) => {
        setForm({
          displayName: p.displayName ?? "",
          address:     p.address     ?? "",
          // Pre-fill phone from profile; fall back to account phone from auth user
          phoneNumber: p.phone ?? (user as { phone?: string }).phone ?? "",
          whatsapp:    p.whatsApp    ?? "",
          description: p.description ?? "",
          latitude:    p.latitude    ?? null,
          longitude:   p.longitude   ?? null,
        });
        if (p.province) setProvince(p.province);
        if (p.cityId)   { setCityId(String(p.cityId)); setCityName(p.city ?? ""); }
        if (p.neighborhoodId) { setNeighborhoodId(String(p.neighborhoodId)); setNeighborhoodName(p.neighborhood ?? ""); }
      })
      .catch(() => {
        // If profile fetch fails entirely, at least pre-fill phone from auth user
        const phone = (user as { phone?: string }).phone ?? "";
        setForm(prev => ({ ...prev, phoneNumber: prev.phoneNumber || phone }));
      })
      .finally(() => setProfileLoading(false));
  }, [isAuthenticated, user]);

  // ── Field helpers ─────────────────────────────────────────────────────────
  function setField<K extends FieldKey>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setField(e.target.name as FieldKey, e.target.value);
  }

  function handleCityChange(name: string, id?: string) {
    setCityName(name); setCityId(id ?? "");
    setNeighborhoodId(""); setNeighborhoodName("");
    setFieldErrors(prev => ({ ...prev, cityId: undefined }));
  }

  function handleNeighborhoodChange(name: string, id?: string) {
    setNeighborhoodName(name); setNeighborhoodId(id ?? "");
    setFieldErrors(prev => ({ ...prev, neighborhoodId: undefined }));
  }

  const handleMapChange = useCallback((pos: LatLng) => {
    setForm((prev) => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
  }, []);

  function useCurrentLocation() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { handleMapChange({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); },
      () => setGeoLoading(false),
      { timeout: 8000 },
    );
  }

  // ── Validation (role-aware) ───────────────────────────────────────────────
  function validate(): boolean {
    const errors: Partial<Record<FieldKey | "cityId" | "neighborhoodId" | "province", string>> = {};

    if (!form.displayName.trim())
      errors.displayName = isBroker ? "الاسم المهني مطلوب" : "الاسم التجاري مطلوب";

    if (!province)
      errors.province = "يرجى اختيار المحافظة";

    // Address is required only for office/company accounts
    if (!isBroker) {
      if (!form.address.trim())
        errors.address = "العنوان التفصيلي مطلوب";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return false;

    // Map location required only for office/company
    if (!isBroker && (!form.latitude || !form.longitude)) {
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

    setSubmitting(true);
    try {
      await onboardingApi.updateBusinessProfile({
        displayName:    form.displayName.trim(),
        province:       province          || undefined,
        city:           cityName          || undefined,
        neighborhood:   neighborhoodName  || undefined,
        cityId:         cityId            || undefined,
        neighborhoodId: neighborhoodId    || undefined,
        address:        form.address.trim()     || undefined,
        phone:          form.phoneNumber.trim() || undefined,
        whatsApp:       form.whatsapp.trim()    || undefined,
        description:    form.description.trim() || undefined,
        latitude:       form.latitude   ?? undefined,
        longitude:      form.longitude  ?? undefined,
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(normalizeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / guard ───────────────────────────────────────────────────────
  if (isLoading || profileLoading) return <Spinner />;
  if (!isAuthenticated || !user || !BUSINESS_ROLES.includes(user.role)) return null;

  const mapValue: LatLng | null =
    form.latitude != null && form.longitude != null
      ? { lat: form.latitude, lng: form.longitude }
      : null;

  // ── Role-specific copy ────────────────────────────────────────────────────
  const pageTitle    = isBroker ? "أكمل ملفك المهني"    : "أكمل ملفك التجاري";
  const roleLabel    = isBroker ? "وسيط عقاري"
    : isCompanyOwner && user.accountType === "Company" ? "شركة تطوير" : "مكتب عقاري";
  const nameLabel    = isBroker ? "الاسم المهني أو اسم الوسيط"
    : user.accountType === "Company" ? "اسم الشركة" : "اسم المكتب العقاري";
  const namePlaceholder = isBroker ? "مثال: محمد خالد — وسيط عقاري"
    : user.accountType === "Company" ? "مثال: شركة الأمل للتطوير العقاري"
    : "مثال: مكتب النجاح العقاري";
  const submitLabel  = isBroker ? "حفظ الملف المهني والمتابعة" : "حفظ الملف التجاري والمتابعة";
  const sectionIntro = isBroker ? "المعلومات المهنية" : "المعلومات الأساسية";

  return (
    <div className="login-page">
      <div className="form-card" style={{ maxWidth: 580 }}>

        {/* Logo */}
        <div className="login-page__logo">
          <Image
            src="/logo-boioot.png" alt="بيوت"
            width={110} height={44}
            style={{ objectFit: "contain" }} priority
          />
        </div>

        {/* Progress steps */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: "1.75rem" }}>
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
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      : i + 1}
                  </div>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: isActive ? 700 : 400,
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

        {/* Page title */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1 className="login-page__title" style={{ marginBottom: "0.35rem" }}>{pageTitle}</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem" }}>
            حساب <strong>{roleLabel}</strong>{" "}
            {isBroker
              ? "— يُساعدنا ذلك في عرض ملفك المهني للعملاء الباحثين"
              : "— يُساعدنا ذلك في عرض معلوماتك للعملاء بشكل احترافي"}
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Section: Basic / Professional info ─────────────────────────── */}
          <div style={{ ...SECTION_HEADER }}>{sectionIntro}</div>

          {/* Display name */}
          <div className="form-group">
            <label className="form-label" htmlFor="displayName">
              {nameLabel} <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="displayName" name="displayName" type="text" className="form-input"
              value={form.displayName} onChange={handleTextChange} required
              placeholder={namePlaceholder}
            />
            {fieldErrors.displayName && <span className="form-error">{fieldErrors.displayName}</span>}
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
              placeholder={isBroker
                ? "اكتب نبذة عن خبرتك في السوق العقاري، تخصصك، والمناطق التي تعمل فيها..."
                : "اكتب نبذة مختصرة عن نشاطك العقاري..."}
              style={{ resize: "vertical", minHeight: 80 }}
            />
          </div>

          {/* Phone + WhatsApp */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="phoneNumber">
                رقم الهاتف{" "}
                <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(اختياري)</span>
              </label>
              <PhoneInput
                id="phoneNumber"
                international
                defaultCountry="SY"
                value={(form.phoneNumber || undefined) as E164Number | undefined}
                onChange={(val) => setField("phoneNumber", val ?? "")}
                className="phone-input-wrapper"
              />
              {isBroker && (
                <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  مُعبَّأ من حسابك — يمكنك تعديله
                </p>
              )}
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

          {/* ── Section: Location ──────────────────────────────────────────── */}
          <div style={{ ...SECTION_HEADER, marginTop: "0.5rem" }}>
            {isBroker ? "منطقة العمل" : "معلومات الموقع"}
          </div>

          {/* Province */}
          <div className="form-group">
            <label className="form-label" htmlFor="province">
              المحافظة <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <select
              id="province" value={province} disabled={provincesLoading}
              onChange={e => {
                setProvince(e.target.value);
                setFieldErrors(prev => ({ ...prev, province: undefined, cityId: undefined }));
              }}
              style={{
                ...SELECT_STYLE,
                ...(fieldErrors.province ? { borderColor: "#e53935" } : {}),
              }}
            >
              <option value="">{provincesLoading ? "جاري التحميل..." : "اختر المحافظة"}</option>
              {provinces.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {fieldErrors.province && <span className="form-error">{fieldErrors.province}</span>}
          </div>

          {/* City + Neighborhood */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ margin: 0 }}>
              <CitySelect
                label="المدينة"
                value={cityName}
                onChange={handleCityChange}
                province={province || undefined}
                error={fieldErrors.cityId}
              />
            </div>
            <div style={{ margin: 0 }}>
              <NeighborhoodSelect
                label="الحي / المنطقة"
                value={neighborhoodId}
                onChange={handleNeighborhoodChange}
                city={cityName}
                disabled={!cityName}
              />
              {fieldErrors.neighborhoodId && <span className="form-error">{fieldErrors.neighborhoodId}</span>}
            </div>
          </div>

          {/* Address — required for office/company only */}
          {!isBroker && (
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
          )}

          {/* Address — optional for broker */}
          {isBroker && (
            <div className="form-group">
              <label className="form-label" htmlFor="address">
                العنوان{" "}
                <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(اختياري)</span>
              </label>
              <input
                id="address" name="address" type="text" className="form-input"
                value={form.address} onChange={handleTextChange}
                placeholder="مثال: دمشق — شارع الثورة"
              />
            </div>
          )}

          {/* Map picker — required for office/company, hidden for broker */}
          {!isBroker && (
            <div className="form-group">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <label className="form-label" style={{ margin: 0 }}>
                  الموقع على الخريطة <span style={{ color: "var(--color-error)" }}>*</span>
                </label>
                <button
                  type="button" onClick={useCurrentLocation} disabled={geoLoading}
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
              {form.latitude != null && form.longitude != null && (
                <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.4rem", fontFamily: "monospace", direction: "ltr", textAlign: "right" }}>
                  {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                </p>
              )}
            </div>
          )}

          {/* ── Info box for Agent accounts (shouldn't reach here, just in case) ─ */}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {submitting ? "جاري الحفظ..." : submitLabel}
          </button>
        </form>

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
