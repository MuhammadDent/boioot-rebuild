"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { ProvinceSelect, CitySelect, NeighborhoodSelect } from "@/components/dashboard/LocationSelect";
import type { ListingTypeConfig } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { value: "Apartment", label: "شقة", icon: "🏢" },
  { value: "Villa",     label: "فيلا", icon: "🏡" },
  { value: "Office",    label: "مكتب", icon: "🏬" },
  { value: "Shop",      label: "محل تجاري", icon: "🏪" },
  { value: "Land",      label: "أرض", icon: "🌍" },
  { value: "Building",  label: "بناء كامل", icon: "🏗️" },
];

const OWNERSHIP_TYPES = [
  { value: "GreenDeed",     label: "طابو أخضر" },
  { value: "BlueDeed",      label: "طابو أزرق" },
  { value: "CourtOrder",    label: "حكم محكمة" },
  { value: "Customary",     label: "ملكية عرفية" },
  { value: "LongTermLease", label: "إيجار طويل الأمد" },
  { value: "UnderSettlement", label: "قيد تسوية" },
];

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

export const FEATURES_LIST = [
  { key: "Pool",           label: "مسبح",            icon: "🏊" },
  { key: "Garden",         label: "حديقة",            icon: "🌿" },
  { key: "Elevator",       label: "مصعد",             icon: "🛗" },
  { key: "Parking",        label: "موقف سيارات",      icon: "🅿️" },
  { key: "Security",       label: "حراسة أمنية",      icon: "🔒" },
  { key: "Generator",      label: "مولد كهربائي",     icon: "⚡" },
  { key: "CentralAC",      label: "تكييف مركزي",      icon: "❄️" },
  { key: "CentralHeating", label: "تدفئة مركزية",     icon: "🔥" },
  { key: "Balcony",        label: "شرفة",             icon: "🏙️" },
  { key: "Storage",        label: "مستودع",           icon: "📦" },
  { key: "MaidRoom",       label: "غرفة خدم",         icon: "🛏️" },
  { key: "Gym",            label: "نادي رياضي",       icon: "💪" },
  { key: "EquippedKitchen",label: "مطبخ مجهز",        icon: "🍳" },
  { key: "Furnished",      label: "مؤثث بالكامل",     icon: "🪑" },
  { key: "NearSchools",    label: "مدارس قريبة",      icon: "🏫" },
  { key: "NearHospital",   label: "مستشفى قريب",      icon: "🏥" },
  { key: "NearMalls",      label: "مراكز تسوق قريبة", icon: "🛍️" },
  { key: "InternetReady",  label: "إنترنت جاهز",      icon: "📡" },
  { key: "Playground",     label: "ملعب أطفال",       icon: "🎠" },
  { key: "SmartHome",      label: "منزل ذكي",         icon: "📱" },
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
  return n.toLocaleString("ar-SY") + " " + (currency === "SYP" ? "ل.س" : "$");
}

const LISTING_TYPE_LABELS: Record<string, string> = {
  Sale: "للبيع", Rent: "للإيجار", DailyRent: "إيجار يومي",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Apartment: "شقة", Villa: "فيلا", Office: "مكتب",
  Shop: "محل تجاري", Land: "أرض", Building: "بناء كامل",
};

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
  listingTypes: ListingTypeConfig[];
  onSubmit: (data: WizardData) => Promise<void>;
  isSubmitting: boolean;
  serverError: string;
}

export default function PostAdWizard({
  listingTypes, onSubmit, isSubmitting, serverError,
}: PostAdWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(EMPTY);
  const [stepError, setStepError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

          <Field label="نوع العقار" required>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem" }}>
              {PROPERTY_TYPES.map((pt) => (
                <button key={pt.value} type="button" disabled={disabled}
                  onClick={() => set("propertyType", pt.value)}
                  style={{
                    padding: "0.7rem 0.5rem", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${data.propertyType === pt.value ? "#16a34a" : "#e2e8f0"}`,
                    background: data.propertyType === pt.value ? "#f0fdf4" : "#fff",
                    color: data.propertyType === pt.value ? "#166534" : "#374151",
                    fontWeight: 600, fontSize: "0.82rem", fontFamily: "inherit",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem",
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontSize: "1.5rem" }}>{pt.icon}</span>
                  {pt.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="نوع الإدراج" required>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              {(listingTypes.length > 0
                ? listingTypes.map((lt) => ({ value: lt.value, label: lt.label }))
                : [{ value: "Sale", label: "للبيع" }, { value: "Rent", label: "للإيجار" }, { value: "DailyRent", label: "إيجار يومي" }]
              ).map((lt) => (
                <button key={lt.value} type="button" disabled={disabled}
                  onClick={() => set("listingType", lt.value)}
                  style={{
                    padding: "0.55rem 1.2rem", borderRadius: 99, cursor: "pointer",
                    border: `2px solid ${data.listingType === lt.value ? "#16a34a" : "#e2e8f0"}`,
                    background: data.listingType === lt.value ? "#16a34a" : "#fff",
                    color: data.listingType === lt.value ? "#fff" : "#374151",
                    fontWeight: 700, fontSize: "0.88rem", fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {lt.label}
                </button>
              ))}
            </div>
          </Field>

          <Row>
            <Field label="نوع الملكية (اختياري)">
              <select className="form-input" value={data.ownershipType} disabled={disabled}
                onChange={(e) => set("ownershipType", e.target.value)}>
                <option value="">اختر نوع الملكية</option>
                {OWNERSHIP_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>

            <Field label="الدور / الطابق (اختياري)">
              <select className="form-input" value={data.floor} disabled={disabled}
                onChange={(e) => set("floor", e.target.value)}>
                <option value="">اختر الدور</option>
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

          {/* Video URL */}
          <Field label="رابط الفيديو (اختياري)">
            <input className="form-input" type="url" dir="ltr" disabled={disabled}
              value={data.videoUrl} onChange={(e) => set("videoUrl", e.target.value)}
              placeholder="https://youtube.com/... أو رابط مباشر للفيديو" />
            <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0.3rem 0 0" }}>
              أدخل رابط فيديو من يوتيوب أو أي منصة أخرى لعرضه مع الإعلان
            </p>
          </Field>
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
              <ReviewRow label="نوع العقار"   value={PROPERTY_TYPE_LABELS[data.propertyType] ?? data.propertyType} />
              <ReviewRow label="الإدراج"       value={LISTING_TYPE_LABELS[data.listingType] ?? data.listingType} />
              {data.ownershipType && <ReviewRow label="الملكية" value={OWNERSHIP_TYPES.find((o) => o.value === data.ownershipType)?.label ?? data.ownershipType} />}
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
