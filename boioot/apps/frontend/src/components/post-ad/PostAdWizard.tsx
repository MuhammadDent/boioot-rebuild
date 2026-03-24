"use client";

import { useState, useRef, type ChangeEvent } from "react";
import Link from "next/link";
import { apiConfig } from "@/lib/api-config";
import { tokenStorage } from "@/lib/token";
import { ProvinceSelect, CitySelect, NeighborhoodSelect } from "@/components/dashboard/LocationSelect";
import LocationPicker from "@/components/dashboard/properties/LocationPicker";
import { FEATURES_LIST } from "@/features/properties/constants";
import { useSubscription } from "@/hooks/useSubscription";
import type { ListingTypeConfig, PropertyTypeConfig, OwnershipTypeConfig } from "@/types";

const FLOOR_OPTIONS = [
  { value: "Ground",      label: "أرضي" },
  { value: "First",       label: "الأول" },
  { value: "Second",      label: "الثاني" },
  { value: "Third",       label: "الثالث" },
  { value: "Fourth",      label: "الرابع" },
  { value: "Fifth",       label: "الخامس" },
  { value: "Sixth",       label: "السادس" },
  { value: "SeventhPlus", label: "سابع فما فوق" },
  { value: "Penthouse",   label: "بنتهاوس" },
  { value: "SingleFloor", label: "طابق واحد (فيلا/منزل)" },
];

const STEPS = [
  { id: 1, label: "نوع العقار" },
  { id: 2, label: "التفاصيل" },
  { id: 3, label: "السعر والدفع" },
  { id: 4, label: "الموقع" },
  { id: 5, label: "المميزات" },
  { id: 6, label: "الصور والفيديو" },
  { id: 7, label: "المراجعة" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardData {
  // Step 1
  propertyType: string;
  listingType: string;
  ownershipType: string;
  floor: string;
  // Step 2
  title: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  hallsCount: string;
  propertyAge: string;
  description: string;
  // Step 3
  price: string;
  currency: "SYP" | "USD";
  paymentType: "OneTime" | "Installments";
  installmentsCount: string;
  hasCommission: boolean;
  commissionType: "Percentage" | "Fixed";
  commissionValue: string;
  // Step 4
  province: string;
  city: string;
  neighborhood: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  // Step 5
  features: string[];
  // Step 6
  images: string[];      // base64 data URLs
  videoUrl: string;
}

const EMPTY: WizardData = {
  propertyType: "",
  listingType: "",
  ownershipType: "",
  floor: "",
  title: "",
  area: "",
  bedrooms: "",
  bathrooms: "",
  hallsCount: "",
  propertyAge: "",
  description: "",
  price: "",
  currency: "SYP",
  paymentType: "OneTime",
  installmentsCount: "",
  hasCommission: false,
  commissionType: "Percentage",
  commissionValue: "",
  province: "",
  city: "",
  neighborhood: "",
  address: "",
  latitude: null,
  longitude: null,
  features: [],
  images: [],
  videoUrl: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function resizeImage(file: File, maxPx = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatPrice(price: string, currency: string) {
  const n = Number(price);
  if (!price || isNaN(n)) return "—";
  return n.toLocaleString("en") + " " + (currency === "SYP" ? "ل.س" : "$");
}

// ─── Step validators ──────────────────────────────────────────────────────────

function validateStep(step: number, data: WizardData): string | null {
  if (step === 1) {
    if (!data.propertyType) return "يرجى اختيار نوع العقار";
    if (!data.listingType)  return "يرجى اختيار نوع الإدراج (بيع/إيجار)";
    return null;
  }
  if (step === 2) {
    if (!data.title.trim())       return "عنوان العقار مطلوب";
    if (data.title.trim().length < 2) return "العنوان يجب أن يكون حرفين على الأقل";
    if (!data.area || isNaN(Number(data.area)) || Number(data.area) < 1) return "المساحة مطلوبة وتكون أكبر من صفر";
    return null;
  }
  if (step === 3) {
    if (!data.price || isNaN(Number(data.price)) || Number(data.price) < 0) return "السعر مطلوب";
    if (data.paymentType === "Installments") {
      const c = Number(data.installmentsCount);
      if (!data.installmentsCount || isNaN(c) || c < 2) return "عدد الأقساط يجب أن يكون 2 أو أكثر";
    }
    if (data.hasCommission) {
      const v = Number(data.commissionValue);
      if (!data.commissionValue || isNaN(v) || v <= 0) return "يرجى إدخال قيمة العمولة";
      if (data.commissionType === "Percentage" && v > 100) return "النسبة المئوية لا يمكن أن تتجاوز 100%";
    }
    return null;
  }
  if (step === 4) {
    if (!data.city) return "المدينة مطلوبة";
    return null;
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PostAdWizardProps {
  listingTypes?: ListingTypeConfig[];
  propertyTypes?: PropertyTypeConfig[];
  ownershipTypes?: OwnershipTypeConfig[];
  onSubmit: (data: WizardData) => Promise<void>;
  isSubmitting: boolean;
  serverError: string;
}

export default function PostAdWizard({
  listingTypes = [], propertyTypes = [], ownershipTypes = [], onSubmit, isSubmitting, serverError,
}: PostAdWizardProps) {
  const { subscription } = useSubscription();
  const videoAllowed = subscription === null || subscription.hasVideoUpload;

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(EMPTY);
  const [stepError, setStepError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [videoMode, setVideoMode] = useState<"url" | "file">("url");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  function set<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    setStepError(null);
  }

  function goNext() {
    const err = validateStep(step, data);
    if (err) { setStepError(err); return; }
    setStepError(null);
    setStep((s) => Math.min(s + 1, STEPS.length));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goPrev() {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 1));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleFeature(key: string) {
    setData((prev) => ({
      ...prev,
      features: prev.features.includes(key)
        ? prev.features.filter((f) => f !== key)
        : [...prev.features, key],
    }));
  }

  async function handleImageFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 10 - data.images.length;
    if (remaining <= 0) return;
    const toProcess = files.slice(0, remaining);
    setImageLoading(true);
    try {
      const b64s = await Promise.all(toProcess.map((f) => resizeImage(f)));
      setData((prev) => ({ ...prev, images: [...prev.images, ...b64s] }));
    } finally {
      setImageLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(idx: number) {
    setData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  }

  async function handleVideoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setVideoError("حجم الفيديو يتجاوز 50MB");
      return;
    }
    setVideoError(null);
    setVideoLoading(true);
    try {
      const token = tokenStorage.getToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${apiConfig.baseUrl}/upload/video`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setVideoError((body as { error?: string }).error ?? "فشل رفع الفيديو");
        return;
      }
      const { url } = await res.json() as { url: string };
      set("videoUrl", url);
    } catch {
      setVideoError("حدث خطأ أثناء رفع الفيديو");
    } finally {
      setVideoLoading(false);
      if (videoFileRef.current) videoFileRef.current.value = "";
    }
  }

  function removeVideo() {
    set("videoUrl", "");
    setVideoError(null);
    if (videoFileRef.current) videoFileRef.current.value = "";
  }

  async function handleSubmit() {
    const err = validateStep(step, data);
    if (err) { setStepError(err); return; }
    await onSubmit(data);
  }

  const disabled = isSubmitting;

  return (
    <div ref={topRef}>
      {/* ── Step indicator ── */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", scrollbarWidth: "none" }}>
          {STEPS.map((s, idx) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", flex: idx < STEPS.length - 1 ? "1 1 0" : "0 0 auto" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem", minWidth: 52 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: active ? "#16a34a" : done ? "#bbf7d0" : "#f1f5f9",
                    border: `2px solid ${active ? "#16a34a" : done ? "#16a34a" : "#e2e8f0"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "0.8rem",
                    color: active ? "#fff" : done ? "#16a34a" : "#94a3b8",
                    flexShrink: 0,
                  }}>
                    {done ? "✓" : s.id}
                  </div>
                  <span style={{
                    fontSize: "0.65rem", fontWeight: 600, whiteSpace: "nowrap",
                    color: active ? "#16a34a" : done ? "#166534" : "#94a3b8",
                  }}>{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, marginBottom: "1.1rem",
                    background: done ? "#16a34a" : "#e2e8f0",
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Error banner ── */}
      {(stepError || serverError) && (
        <div style={{ background: "#ffebee", color: "#c62828", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1.25rem", fontSize: "0.9rem" }}>
          {stepError || serverError}
        </div>
      )}

      {/* ════════════════ STEP 1 — نوع العقار ════════════════ */}
      {step === 1 && (
        <div>
          <StepTitle>نوع العقار والإدراج</StepTitle>

          <Row>
            <Field label="نوع العقار" required>
              <select className="form-input" value={data.propertyType} disabled={disabled}
                onChange={(e) => set("propertyType", e.target.value)}>
                <option value="">— اختر نوع العقار —</option>
                {(propertyTypes.length > 0
                  ? propertyTypes
                  : [
                      { value: "Apartment", label: "شقة",       icon: "🏢" },
                      { value: "Villa",     label: "فيلا",      icon: "🏡" },
                      { value: "Office",    label: "مكتب",      icon: "🏬" },
                      { value: "Shop",      label: "محل تجاري", icon: "🏪" },
                      { value: "Land",      label: "أرض",       icon: "🌍" },
                      { value: "Building",  label: "بناء كامل", icon: "🏗️" },
                    ]
                ).map((pt) => (
                  <option key={pt.value} value={pt.value}>
                    {pt.icon ? `${pt.icon} ${pt.label}` : pt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="نوع الإدراج" required>
              <select className="form-input" value={data.listingType} disabled={disabled}
                onChange={(e) => set("listingType", e.target.value)}>
                <option value="">— اختر نوع الإدراج —</option>
                {(listingTypes.length > 0
                  ? listingTypes
                  : [
                      { value: "Sale",      label: "للبيع" },
                      { value: "Rent",      label: "للإيجار" },
                      { value: "DailyRent", label: "إيجار يومي" },
                    ]
                ).map((lt) => (
                  <option key={lt.value} value={lt.value}>{lt.label}</option>
                ))}
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="نوع الملكية (اختياري)">
              <select className="form-input" value={data.ownershipType} disabled={disabled}
                onChange={(e) => set("ownershipType", e.target.value)}>
                <option value="">— اختر نوع الملكية —</option>
                {(ownershipTypes.length > 0
                  ? ownershipTypes
                  : [
                      { value: "GreenDeed",       label: "طابو أخضر" },
                      { value: "BlueDeed",        label: "طابو أزرق" },
                      { value: "CourtOrder",      label: "حكم محكمة" },
                      { value: "Customary",       label: "ملكية عرفية" },
                      { value: "LongTermLease",   label: "إيجار طويل الأمد" },
                      { value: "UnderSettlement", label: "قيد تسوية" },
                    ]
                ).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>

            <Field label="الدور / الطابق (اختياري)">
              <select className="form-input" value={data.floor} disabled={disabled}
                onChange={(e) => set("floor", e.target.value)}>
                <option value="">— اختر الدور —</option>
                {FLOOR_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>
          </Row>
        </div>
      )}

      {/* ════════════════ STEP 2 — التفاصيل ════════════════ */}
      {step === 2 && (
        <div>
          <StepTitle>تفاصيل العقار</StepTitle>

          <Field label="عنوان العقار" required>
            <input className="form-input" type="text" maxLength={300} disabled={disabled}
              value={data.title} onChange={(e) => set("title", e.target.value)}
              placeholder="مثال: شقة مؤثثة بالكامل في المزة — 3 غرف" />
          </Field>

          <Row>
            <Field label="المساحة (م²)" required>
              <input className="form-input" type="number" min={1} dir="ltr" disabled={disabled}
                value={data.area} onChange={(e) => set("area", e.target.value)}
                placeholder="مثال: 120" />
            </Field>
            <Field label="عمر العقار (سنوات، اختياري)">
              <input className="form-input" type="number" min={0} max={200} dir="ltr" disabled={disabled}
                value={data.propertyAge} onChange={(e) => set("propertyAge", e.target.value)}
                placeholder="مثال: 5" />
            </Field>
          </Row>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <Field label="غرف النوم">
              <input className="form-input" type="number" min={0} max={20} dir="ltr" disabled={disabled}
                value={data.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} placeholder="—" />
            </Field>
            <Field label="الحمامات">
              <input className="form-input" type="number" min={0} max={10} dir="ltr" disabled={disabled}
                value={data.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} placeholder="—" />
            </Field>
            <Field label="الصالات">
              <input className="form-input" type="number" min={0} max={10} dir="ltr" disabled={disabled}
                value={data.hallsCount} onChange={(e) => set("hallsCount", e.target.value)} placeholder="—" />
            </Field>
          </div>

          <Field label="وصف العقار (اختياري)">
            <textarea className="form-input" rows={4} maxLength={3000} disabled={disabled}
              value={data.description} onChange={(e) => set("description", e.target.value)}
              placeholder="أضف وصفاً تفصيلياً: الموقع، المزايا، حالة العقار..."
              style={{ resize: "vertical", fontFamily: "inherit" }} />
          </Field>
        </div>
      )}

      {/* ════════════════ STEP 3 — السعر والدفع ════════════════ */}
      {step === 3 && (
        <div>
          <StepTitle>السعر وطريقة الدفع</StepTitle>

          {/* Price + currency */}
          <Field label="السعر" required>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid #e5e7eb" }}>
              <input className="form-input" type="number" min={0} dir="ltr" disabled={disabled}
                value={data.price} onChange={(e) => set("price", e.target.value)}
                placeholder="0"
                style={{ flex: 1, borderTop: "none", borderBottom: "none", borderRight: "none", borderLeft: "none", borderRadius: 0, outline: "none", boxShadow: "none", minWidth: 0 }} />
              {(["SYP", "USD"] as const).map((cur) => (
                <button key={cur} type="button" disabled={disabled}
                  onClick={() => set("currency", cur)}
                  style={{
                    padding: "0 1rem", fontWeight: 700, fontSize: "0.85rem", fontFamily: "inherit",
                    background: data.currency === cur ? "#16a34a" : "#f8fafc",
                    color: data.currency === cur ? "#fff" : "#64748b",
                    borderTop: "none", borderBottom: "none", borderRight: "none",
                    borderLeft: cur === "SYP" ? "1.5px solid #e5e7eb" : "none",
                    cursor: disabled ? "default" : "pointer", flexShrink: 0,
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {cur === "SYP" ? "ل.س" : "$"}
                </button>
              ))}
            </div>
          </Field>

          {/* Payment type */}
          <Field label="طريقة الدفع" required>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              {[
                { value: "OneTime",      label: "دفعة واحدة" },
                { value: "Installments", label: "دفعات / تقسيط" },
              ].map((opt) => (
                <button key={opt.value} type="button" disabled={disabled}
                  onClick={() => set("paymentType", opt.value as "OneTime" | "Installments")}
                  style={{
                    flex: 1, padding: "0.7rem", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${data.paymentType === opt.value ? "#16a34a" : "#e2e8f0"}`,
                    background: data.paymentType === opt.value ? "#f0fdf4" : "#fff",
                    color: data.paymentType === opt.value ? "#166534" : "#374151",
                    fontWeight: 700, fontSize: "0.9rem", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Installments count */}
          {data.paymentType === "Installments" && (
            <Field label="عدد الدفعات / الأقساط" required>
              <input className="form-input" type="number" min={2} max={120} dir="ltr" disabled={disabled}
                value={data.installmentsCount}
                onChange={(e) => set("installmentsCount", e.target.value)}
                placeholder="مثال: 12" />
            </Field>
          )}

          {/* Commission */}
          <Field label="هل يوجد عمولة؟">
            <div style={{ display: "flex", gap: "0.6rem" }}>
              {[{ v: false, label: "لا يوجد عمولة" }, { v: true, label: "يوجد عمولة" }].map((opt) => (
                <button key={String(opt.v)} type="button" disabled={disabled}
                  onClick={() => set("hasCommission", opt.v)}
                  style={{
                    flex: 1, padding: "0.6rem", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${data.hasCommission === opt.v ? "#16a34a" : "#e2e8f0"}`,
                    background: data.hasCommission === opt.v ? "#f0fdf4" : "#fff",
                    color: data.hasCommission === opt.v ? "#166534" : "#374151",
                    fontWeight: 600, fontSize: "0.88rem", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Field>

          {data.hasCommission && (
            <>
              <Field label="نوع العمولة">
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  {[
                    { value: "Percentage", label: "نسبة مئوية (%)" },
                    { value: "Fixed",      label: "مبلغ ثابت" },
                  ].map((opt) => (
                    <button key={opt.value} type="button" disabled={disabled}
                      onClick={() => set("commissionType", opt.value as "Percentage" | "Fixed")}
                      style={{
                        flex: 1, padding: "0.6rem", borderRadius: 10, cursor: "pointer",
                        border: `2px solid ${data.commissionType === opt.value ? "#16a34a" : "#e2e8f0"}`,
                        background: data.commissionType === opt.value ? "#f0fdf4" : "#fff",
                        color: data.commissionType === opt.value ? "#166534" : "#374151",
                        fontWeight: 600, fontSize: "0.85rem", fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label={data.commissionType === "Percentage" ? "نسبة العمولة (%)" : "قيمة العمولة"} required>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input className="form-input" type="number" min={0} dir="ltr" disabled={disabled}
                    value={data.commissionValue}
                    onChange={(e) => set("commissionValue", e.target.value)}
                    placeholder={data.commissionType === "Percentage" ? "مثال: 3" : "مثال: 500000"}
                    style={{ flex: 1 }} />
                  {data.commissionType === "Percentage" && (
                    <span style={{ fontWeight: 700, color: "#64748b", fontSize: "1.1rem" }}>%</span>
                  )}
                  {data.commissionType === "Fixed" && (
                    <span style={{ fontWeight: 700, color: "#64748b" }}>
                      {data.currency === "SYP" ? "ل.س" : "$"}
                    </span>
                  )}
                </div>
              </Field>
            </>
          )}
        </div>
      )}

      {/* ════════════════ STEP 4 — الموقع ════════════════ */}
      {step === 4 && (
        <div>
          <StepTitle>موقع العقار</StepTitle>

          <Row>
            <ProvinceSelect label="المحافظة (اختياري)" value={data.province} disabled={disabled}
              onChange={(val) => { set("province", val); set("city", ""); set("neighborhood", ""); }} />
            <CitySelect label="المدينة" required value={data.city} province={data.province} disabled={disabled}
              onChange={(val) => { set("city", val); set("neighborhood", ""); }}
              error={stepError && !data.city ? stepError : undefined} />
          </Row>

          <Row>
            <NeighborhoodSelect label="الحي (اختياري)" value={data.neighborhood} city={data.city} disabled={disabled}
              onChange={(val) => set("neighborhood", val)} />
            <Field label="العنوان التفصيلي (اختياري)">
              <input className="form-input" type="text" maxLength={300} disabled={disabled}
                value={data.address} onChange={(e) => set("address", e.target.value)}
                placeholder="مثال: شارع الثورة، بناء رقم 5" />
            </Field>
          </Row>

          <LocationPicker
            lat={data.latitude}
            lng={data.longitude}
            onChange={(newLat, newLng) => {
              setData(prev => ({ ...prev, latitude: newLat, longitude: newLng }));
            }}
            disabled={disabled}
          />
        </div>
      )}

      {/* ════════════════ STEP 5 — المميزات ════════════════ */}
      {step === 5 && (
        <div>
          <StepTitle>المميزات الإضافية (اختياري)</StepTitle>
          <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#64748b" }}>
            اختر كل ما ينطبق على عقارك
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {FEATURES_LIST.map((f) => {
              const selected = data.features.includes(f.key);
              return (
                <button key={f.key} type="button" disabled={disabled}
                  onClick={() => toggleFeature(f.key)}
                  style={{
                    padding: "0.65rem 0.85rem", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${selected ? "#16a34a" : "#e2e8f0"}`,
                    background: selected ? "#f0fdf4" : "#fff",
                    color: selected ? "#166534" : "#374151",
                    fontWeight: 600, fontSize: "0.83rem", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    transition: "all 0.15s", textAlign: "right",
                  }}
                >
                  <span>{f.icon}</span>
                  {f.label}
                  {selected && <span style={{ marginRight: "auto", fontSize: "0.75rem" }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════════════ STEP 6 — الصور والفيديو ════════════════ */}
      {step === 6 && (
        <div>
          <StepTitle>الصور والفيديو (اختياري)</StepTitle>

          {/* Images */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <label className="form-label" style={{ margin: 0 }}>
                صور العقار
                <span style={{ color: "#94a3b8", fontWeight: 400, marginRight: "0.4rem" }}>(حتى 10 صور)</span>
              </label>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{data.images.length} / 10</span>
            </div>

            {/* Upload button */}
            {data.images.length < 10 && (
              <label style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                border: "2px dashed #d1d5db", borderRadius: 12, padding: "1.5rem",
                cursor: disabled || imageLoading ? "default" : "pointer",
                background: "#f9fafb", marginBottom: "0.75rem",
                color: "#6b7280", gap: "0.4rem",
              }}>
                <span style={{ fontSize: "1.8rem" }}>{imageLoading ? "⏳" : "📷"}</span>
                <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {imageLoading ? "جاري المعالجة..." : "اضغط لرفع الصور"}
                </span>
                <span style={{ fontSize: "0.78rem" }}>JPG، PNG — حتى 5MB لكل صورة</span>
                <input ref={fileInputRef} type="file" accept="image/*" multiple hidden
                  disabled={disabled || imageLoading} onChange={handleImageFiles} />
              </label>
            )}

            {/* Image previews */}
            {data.images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                {data.images.map((src, idx) => (
                  <div key={idx} style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "4/3" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`صورة ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {idx === 0 && (
                      <span style={{
                        position: "absolute", top: 4, right: 4,
                        background: "#16a34a", color: "#fff",
                        fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: 99,
                      }}>رئيسية</span>
                    )}
                    <button type="button"
                      onClick={() => removeImage(idx)}
                      style={{
                        position: "absolute", top: 4, left: 4,
                        background: "rgba(0,0,0,0.55)", color: "#fff",
                        border: "none", borderRadius: "50%", width: 24, height: 24,
                        cursor: "pointer", fontSize: "0.75rem", lineHeight: 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {data.images.length > 0 && (
              <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0.4rem 0 0" }}>
                الصورة الأولى ستكون الصورة الرئيسية للإعلان
              </p>
            )}
          </div>

          {/* Video section */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label className="form-label" style={{ marginBottom: "0.5rem", display: "block" }}>
              فيديو العقار <span style={{ color: "#94a3b8", fontWeight: 400 }}>(اختياري)</span>
            </label>

            {!videoAllowed ? (
              <div style={{
                background: "#fffbeb",
                border: "1.5px solid #fcd34d",
                borderRadius: 10,
                padding: "0.9rem 1.1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.65rem",
              }}>
                <span style={{ fontSize: "1.25rem", lineHeight: 1.3 }}>🔒</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: "#92400e", fontSize: "0.88rem" }}>
                    رفع الفيديو غير متاح في باقتك الحالية
                  </p>
                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#78350f" }}>
                    قم بترقية خطتك إلى Gold أو أعلى لإضافة فيديو لإعلانك.{" "}
                    <Link
                      href="/dashboard/subscription/plans"
                      style={{ color: "#b45309", fontWeight: 700 }}
                    >
                      ترقية الخطة ←
                    </Link>
                  </p>
                </div>
              </div>
            ) : (
            <>
            {/* Mode toggle */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem" }}>
              {(["url", "file"] as const).map((m) => (
                <button key={m} type="button"
                  onClick={() => { setVideoMode(m); removeVideo(); }}
                  style={{
                    padding: "0.4rem 0.9rem", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600,
                    border: `1.5px solid ${videoMode === m ? "#16a34a" : "#e2e8f0"}`,
                    background: videoMode === m ? "#f0fdf4" : "#f8fafc",
                    color: videoMode === m ? "#16a34a" : "#64748b",
                    cursor: "pointer",
                  }}
                >
                  {m === "url" ? "🔗 إدخال رابط" : "📁 رفع من الجهاز"}
                </button>
              ))}
            </div>

            {videoMode === "url" ? (
              <>
                <input className="form-input" type="url" dir="ltr" disabled={disabled}
                  value={data.videoUrl} onChange={(e) => set("videoUrl", e.target.value)}
                  placeholder="https://youtube.com/... أو رابط مباشر للفيديو" />
                <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0.3rem 0 0" }}>
                  أدخل رابط فيديو من يوتيوب أو أي منصة أخرى
                </p>
              </>
            ) : (
              <>
                {/* Uploaded video preview */}
                {data.videoUrl && data.videoUrl.includes("/videos/") ? (
                  <div style={{ position: "relative", marginBottom: "0.5rem" }}>
                    <video
                      src={data.videoUrl}
                      controls
                      style={{ width: "100%", borderRadius: 10, maxHeight: 240, background: "#000" }}
                    />
                    <button type="button" onClick={removeVideo}
                      style={{
                        position: "absolute", top: 6, left: 6,
                        background: "rgba(0,0,0,0.6)", color: "#fff",
                        border: "none", borderRadius: "50%", width: 28, height: 28,
                        cursor: "pointer", fontSize: "0.8rem", lineHeight: 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>✕</button>
                  </div>
                ) : (
                  <label style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    border: "2px dashed #d1d5db", borderRadius: 12, padding: "1.5rem",
                    cursor: disabled || videoLoading ? "default" : "pointer",
                    background: "#f9fafb", color: "#6b7280", gap: "0.4rem",
                  }}>
                    <span style={{ fontSize: "1.8rem" }}>{videoLoading ? "⏳" : "🎬"}</span>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {videoLoading ? "جاري الرفع..." : "اضغط لاختيار فيديو"}
                    </span>
                    <span style={{ fontSize: "0.78rem" }}>MP4، WebM، MOV — حتى 50MB</span>
                    <input ref={videoFileRef} type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                      hidden disabled={disabled || videoLoading}
                      onChange={handleVideoFile} />
                  </label>
                )}
                {videoError && (
                  <p style={{ fontSize: "0.8rem", color: "#dc2626", margin: "0.35rem 0 0" }}>{videoError}</p>
                )}
              </>
            )}
            </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════ STEP 7 — المراجعة ════════════════ */}
      {step === 7 && (
        <div>
          <StepTitle>مراجعة الإعلان</StepTitle>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.88rem", color: "#64748b" }}>
            تأكد من المعلومات قبل نشر الإعلان
          </p>

          {/* Summary cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <ReviewSection title="نوع العقار" onEdit={() => setStep(1)}>
              <ReviewRow label="نوع العقار"   value={propertyTypes.find((p) => p.value === data.propertyType)?.label ?? data.propertyType} />
              <ReviewRow label="الإدراج"       value={listingTypes.find((l) => l.value === data.listingType)?.label ?? data.listingType} />
              {data.ownershipType && <ReviewRow label="الملكية" value={ownershipTypes.find((o) => o.value === data.ownershipType)?.label ?? data.ownershipType} />}
              {data.floor && <ReviewRow label="الدور" value={FLOOR_OPTIONS.find((f) => f.value === data.floor)?.label ?? data.floor} />}
            </ReviewSection>

            <ReviewSection title="التفاصيل" onEdit={() => setStep(2)}>
              <ReviewRow label="العنوان"    value={data.title} />
              <ReviewRow label="المساحة"    value={`${data.area} م²`} />
              {data.bedrooms  && <ReviewRow label="غرف النوم" value={data.bedrooms} />}
              {data.bathrooms && <ReviewRow label="الحمامات"  value={data.bathrooms} />}
              {data.hallsCount && <ReviewRow label="الصالات"  value={data.hallsCount} />}
              {data.propertyAge && <ReviewRow label="عمر العقار" value={`${data.propertyAge} سنة`} />}
              {data.description && <ReviewRow label="الوصف" value={data.description.length > 80 ? data.description.slice(0, 80) + "..." : data.description} />}
            </ReviewSection>

            <ReviewSection title="السعر والدفع" onEdit={() => setStep(3)}>
              <ReviewRow label="السعر" value={formatPrice(data.price, data.currency)} />
              <ReviewRow label="طريقة الدفع" value={data.paymentType === "OneTime" ? "دفعة واحدة" : `تقسيط — ${data.installmentsCount} دفعة`} />
              {data.hasCommission && (
                <ReviewRow label="العمولة"
                  value={data.commissionType === "Percentage"
                    ? `${data.commissionValue}%`
                    : `${formatPrice(data.commissionValue, data.currency)} (ثابت)`} />
              )}
            </ReviewSection>

            <ReviewSection title="الموقع" onEdit={() => setStep(4)}>
              {data.province    && <ReviewRow label="المحافظة" value={data.province} />}
              <ReviewRow label="المدينة"   value={data.city} />
              {data.neighborhood && <ReviewRow label="الحي"    value={data.neighborhood} />}
              {data.address      && <ReviewRow label="العنوان" value={data.address} />}
            </ReviewSection>

            {data.features.length > 0 && (
              <ReviewSection title="المميزات" onEdit={() => setStep(5)}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {data.features.map((key) => {
                    const f = FEATURES_LIST.find((fl) => fl.key === key);
                    return (
                      <span key={key} style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 99, padding: "0.2rem 0.65rem", fontSize: "0.8rem", fontWeight: 600 }}>
                        {f?.icon} {f?.label ?? key}
                      </span>
                    );
                  })}
                </div>
              </ReviewSection>
            )}

            {(data.images.length > 0 || data.videoUrl) && (
              <ReviewSection title="الصور والفيديو" onEdit={() => setStep(6)}>
                {data.images.length > 0 && (
                  <ReviewRow label="الصور" value={`${data.images.length} صورة`} />
                )}
                {data.videoUrl && <ReviewRow label="فيديو" value="تم إضافة رابط الفيديو" />}
              </ReviewSection>
            )}
          </div>
        </div>
      )}

      {/* ── Navigation buttons ── */}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.75rem" }}>
        {step > 1 && (
          <button type="button" disabled={disabled} onClick={goPrev}
            style={{
              padding: "0.7rem 1.5rem", borderRadius: 10,
              border: "1.5px solid #e2e8f0", background: "#fff",
              color: "#374151", fontWeight: 600, fontSize: "0.95rem",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            ← السابق
          </button>
        )}

        {step < STEPS.length ? (
          <button type="button" disabled={disabled} onClick={goNext}
            style={{
              flex: 1, padding: "0.75rem", borderRadius: 10,
              background: "#16a34a", color: "#fff",
              border: "none", fontWeight: 700, fontSize: "1rem",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            التالي ←
          </button>
        ) : (
          <button type="button" disabled={disabled} onClick={handleSubmit}
            style={{
              flex: 1, padding: "0.75rem", borderRadius: 10,
              background: "#16a34a", color: "#fff",
              border: "none", fontWeight: 700, fontSize: "1rem",
              cursor: disabled ? "default" : "pointer", fontFamily: "inherit",
              opacity: disabled ? 0.7 : 1,
            }}
          >
            {isSubmitting ? "جارٍ النشر..." : "🚀 نشر الإعلان"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: "1.05rem", fontWeight: 800, color: "#0f172a",
      margin: "0 0 1.25rem", paddingBottom: "0.6rem",
      borderBottom: "2px solid #f1f5f9",
    }}>{children}</p>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label}
        {required && <span style={{ color: "#ef4444", marginRight: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
      {children}
    </div>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 12, padding: "0.85rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#374151" }}>{title}</span>
        <button type="button" onClick={onEdit}
          style={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          تعديل
        </button>
      </div>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string | number | undefined }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.83rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
      <span style={{ color: "#64748b", minWidth: 70 }}>{label}:</span>
      <span style={{ color: "#0f172a", fontWeight: 600, flex: 1 }}>{value}</span>
    </div>
  );
}
