"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { apiConfig } from "@/lib/api-config";
import { tokenStorage } from "@/lib/token";
import type {
  PropertyResponse,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  ListingTypeConfig,
} from "@/types";
import {
  PROPERTY_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
} from "@/features/properties/constants";
import { ProvinceSelect, CitySelect, NeighborhoodSelect } from "@/components/dashboard/LocationSelect";
import LocationPicker from "@/components/dashboard/properties/LocationPicker";
import { api } from "@/lib/api";

// ─── Property features / amenities ───────────────────────────────────────────

const FEATURES: { key: string; label: string }[] = [
  { key: "Balcony",        label: "شرفة" },
  { key: "Parking",        label: "موقف سيارة" },
  { key: "Elevator",       label: "مصعد" },
  { key: "MaidRoom",       label: "غرفة خادمة" },
  { key: "Storage",        label: "غرفة تخزين" },
  { key: "CentralAC",      label: "تكييف مركزي" },
  { key: "Furnished",      label: "مفروش" },
  { key: "Security",       label: "حراسة أمنية" },
  { key: "Garden",         label: "حديقة" },
  { key: "Pool",           label: "مسبح" },
  { key: "Gym",            label: "صالة رياضية" },
  { key: "DriverRoom",     label: "غرفة سائق" },
  { key: "SmartHome",      label: "منزل ذكي" },
  { key: "SeaView",        label: "إطلالة بحرية" },
  { key: "CornerUnit",     label: "شقة كونر" },
  { key: "PrivateEntrance",label: "مدخل خاص" },
  { key: "Basement",       label: "قبو" },
  { key: "Roof",           label: "روف / سطح" },
  { key: "Duplex",         label: "دوبلكس" },
  { key: "NearMosque",     label: "قرب مسجد" },
  { key: "NearSchool",     label: "قرب مدرسة" },
];

// ─── Image utility ────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormFields {
  title: string;
  description: string;
  type: string;
  listingType: string;
  status: string;
  price: string;
  currency: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  province: string;
  city: string;
  neighborhood: string;
  address: string;
  companyId: string;
}

type FormErrors = Partial<Record<keyof FormFields, string>>;

interface PropertyFormProps {
  mode: "create" | "edit";
  initialData?: PropertyResponse;
  onSubmit: (data: CreatePropertyRequest | UpdatePropertyRequest) => Promise<void>;
  isSubmitting: boolean;
  serverError: string;
  hideCompany?: boolean;
  submitLabel?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMPTY_FIELDS: FormFields = {
  title: "",
  description: "",
  type: "",
  listingType: "",
  status: "",
  price: "",
  currency: "SYP",
  area: "",
  bedrooms: "",
  bathrooms: "",
  province: "",
  city: "",
  neighborhood: "",
  address: "",
  companyId: "",
};

function fromInitial(data: PropertyResponse): FormFields {
  return {
    title: data.title,
    description: data.description ?? "",
    type: data.type,
    listingType: data.listingType,
    status: data.status,
    price: String(data.price),
    currency: data.currency ?? "SYP",
    area: String(data.area),
    bedrooms: data.bedrooms != null ? String(data.bedrooms) : "",
    bathrooms: data.bathrooms != null ? String(data.bathrooms) : "",
    province: data.province ?? "",
    city: data.city,
    neighborhood: data.neighborhood ?? "",
    address: data.address ?? "",
    companyId: "",
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(fields: FormFields, mode: "create" | "edit"): FormErrors {
  const errors: FormErrors = {};

  const title = fields.title.trim();
  if (!title) errors.title = "العنوان مطلوب";
  else if (title.length < 2) errors.title = "العنوان يجب ألا يقل عن حرفين";
  else if (title.length > 300) errors.title = "العنوان يجب ألا يتجاوز 300 حرف";

  if (!fields.type) errors.type = "نوع العقار مطلوب";
  if (!fields.listingType) errors.listingType = "نوع الإدراج مطلوب";
  if (mode === "edit" && !fields.status) errors.status = "حالة العقار مطلوبة";

  const price = Number(fields.price);
  if (fields.price === "" || isNaN(price) || price < 0)
    errors.price = "السعر يجب أن يكون صفراً أو أكثر";

  const area = Number(fields.area);
  if (!fields.area || isNaN(area) || area < 1)
    errors.area = "المساحة يجب أن تكون أكبر من صفر";

  if (!fields.city) errors.city = "المدينة مطلوبة";

  if (fields.bedrooms !== "") {
    const b = Number(fields.bedrooms);
    if (isNaN(b) || b < 0 || b > 20)
      errors.bedrooms = "يجب أن يكون بين 0 و 20";
  }

  if (fields.bathrooms !== "") {
    const b = Number(fields.bathrooms);
    if (isNaN(b) || b < 0 || b > 10)
      errors.bathrooms = "يجب أن يكون بين 0 و 10";
  }

  if (mode === "create" && fields.companyId.trim()) {
    if (!UUID_RE.test(fields.companyId.trim()))
      errors.companyId = "صيغة المعرف غير صحيحة — يجب أن يكون UUID";
  }

  if (fields.description && fields.description.length > 3000)
    errors.description = "الوصف يجب ألا يتجاوز 3000 حرف";

  if (fields.address && fields.address.length > 300)
    errors.address = "العنوان التفصيلي يجب ألا يتجاوز 300 حرف";

  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PropertyForm({
  mode,
  initialData,
  onSubmit,
  isSubmitting,
  serverError,
  hideCompany = false,
  submitLabel,
}: PropertyFormProps) {
  const [fields, setFields] = useState<FormFields>(
    initialData ? fromInitial(initialData) : EMPTY_FIELDS
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [listingTypes, setListingTypes] = useState<ListingTypeConfig[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    initialData?.features ?? []
  );

  function toggleFeature(key: string) {
    setSelectedFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  // Location coordinates state
  const [lat, setLat] = useState<number | null>(initialData?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(initialData?.longitude ?? null);

  // Media state
  const [images, setImages] = useState<string[]>(
    initialData?.images?.slice().sort((a, b) => (a.isPrimary ? -1 : b.isPrimary ? 1 : a.order - b.order)).map(img => img.imageUrl) ?? []
  );
  const [videoUrl, setVideoUrl] = useState<string>(initialData?.videoUrl ?? "");
  const [imageLoading, setImageLoading] = useState(false);
  const [videoMode, setVideoMode] = useState<"url" | "file">("url");
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .get<ListingTypeConfig[]>("/listing-types")
      .then((data) => setListingTypes(data))
      .catch(() => {});
  }, []);

  function set(field: keyof FormFields) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
      setFields((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  function setField(field: keyof FormFields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleImageFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 10 - images.length;
    if (remaining <= 0) return;
    const toProcess = files.slice(0, remaining);
    setImageLoading(true);
    try {
      const b64s = await Promise.all(toProcess.map((f) => resizeImage(f)));
      setImages((prev) => [...prev, ...b64s]);
    } finally {
      setImageLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleVideoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { setVideoError("حجم الفيديو يتجاوز 50MB"); return; }
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
      setVideoUrl(url);
    } catch { setVideoError("حدث خطأ أثناء رفع الفيديو"); }
    finally {
      setVideoLoading(false);
      if (videoFileRef.current) videoFileRef.current.value = "";
    }
  }

  function removeVideo() { setVideoUrl(""); setVideoError(null); if (videoFileRef.current) videoFileRef.current.value = ""; }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const fieldErrors = validate(fields, mode);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    const base = {
      title: fields.title.trim(),
      description: fields.description.trim() || undefined,
      type: fields.type,
      listingType: fields.listingType,
      price: Number(fields.price),
      currency: fields.currency,
      area: Number(fields.area),
      bedrooms: fields.bedrooms !== "" ? Number(fields.bedrooms) : undefined,
      bathrooms: fields.bathrooms !== "" ? Number(fields.bathrooms) : undefined,
      province: fields.province.trim() || undefined,
      neighborhood: fields.neighborhood.trim() || undefined,
      address: fields.address.trim() || undefined,
      city: fields.city,
      latitude:  lat  ?? undefined,
      longitude: lng  ?? undefined,
    };

    if (mode === "create") {
      const cid = fields.companyId.trim();
      await onSubmit({
        ...base,
        companyId: cid || undefined,
        features: selectedFeatures.length > 0 ? selectedFeatures : undefined,
        images: images.length > 0 ? images : undefined,
        videoUrl: videoUrl.trim() || undefined,
      } as CreatePropertyRequest);
    } else {
      await onSubmit({
        ...base,
        status: fields.status,
        features: selectedFeatures.length > 0 ? selectedFeatures : undefined,
        images,
        videoUrl: videoUrl.trim() || "",
      } as UpdatePropertyRequest);
    }
  }

  const disabled = isSubmitting;


  return (
    <form onSubmit={handleSubmit} noValidate>
      {serverError && (
        <div
          style={{
            background: "#ffebee",
            color: "#c62828",
            padding: "0.85rem 1rem",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            fontSize: "0.9rem",
          }}
        >
          {serverError}
        </div>
      )}

      {/* ── Section: basic info ── */}
      <Section label="المعلومات الأساسية">
        <div className="form-group">
          <label className="form-label">
            عنوان العقار <Required />
          </label>
          <input
            className="form-input"
            type="text"
            value={fields.title}
            onChange={set("title")}
            placeholder="مثال: شقة مؤثثة بالكامل في المزة"
            maxLength={300}
            disabled={disabled}
          />
          {errors.title && <p className="form-error">{errors.title}</p>}
        </div>

        <Row>
          <div className="form-group">
            <label className="form-label">
              نوع العقار <Required />
            </label>
            <select
              className="form-input"
              value={fields.type}
              onChange={set("type")}
              disabled={disabled}
            >
              <option value="">اختر نوع العقار</option>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {errors.type && <p className="form-error">{errors.type}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">
              نوع الإدراج <Required />
            </label>
            <select
              className="form-input"
              value={fields.listingType}
              onChange={set("listingType")}
              disabled={disabled}
            >
              <option value="">بيع أم إيجار؟</option>
              {listingTypes.length > 0
                ? listingTypes.map((lt) => (
                    <option key={lt.value} value={lt.value}>
                      {lt.label}
                    </option>
                  ))
                : [
                    { value: "Sale", label: "للبيع" },
                    { value: "Rent", label: "للإيجار" },
                    { value: "DailyRent", label: "إيجار يومي" },
                  ].map((lt) => (
                    <option key={lt.value} value={lt.value}>
                      {lt.label}
                    </option>
                  ))}
            </select>
            {errors.listingType && (
              <p className="form-error">{errors.listingType}</p>
            )}
          </div>
        </Row>

        {mode === "edit" && (
          <div className="form-group">
            <label className="form-label">
              حالة العقار <Required />
            </label>
            <select
              className="form-input"
              value={fields.status}
              onChange={set("status")}
              disabled={disabled}
            >
              <option value="">اختر الحالة</option>
              {Object.entries(PROPERTY_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {errors.status && <p className="form-error">{errors.status}</p>}
          </div>
        )}
      </Section>

      {/* ── Section: pricing ── */}
      <Section label="السعر والمساحة">
        <div className="form-group">
          <label className="form-label">
            السعر <Required />
          </label>
          <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1.5px solid var(--color-border, #e5e7eb)" }}>
            <input
              className="form-input"
              type="number"
              min={0}
              step="any"
              value={fields.price}
              onChange={set("price")}
              placeholder="0"
              disabled={disabled}
              dir="ltr"
              style={{
                flex: 1,
                borderTop: "none",
                borderBottom: "none",
                borderRight: "none",
                borderLeft: "none",
                borderRadius: 0,
                outline: "none",
                boxShadow: "none",
                minWidth: 0,
              }}
            />
            {(["SYP", "USD"] as const).map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => setField("currency", cur)}
                disabled={disabled}
                style={{
                  padding: "0 1rem",
                  background: fields.currency === cur ? "var(--color-primary, #16a34a)" : "#f8fafc",
                  color: fields.currency === cur ? "#fff" : "#64748b",
                  borderTop: "none",
                  borderBottom: "none",
                  borderRight: "none",
                  borderLeft: cur === "SYP" ? "1.5px solid var(--color-border, #e5e7eb)" : "none",
                  cursor: disabled ? "default" : "pointer",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  flexShrink: 0,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {cur === "SYP" ? "ل.س" : "$"}
              </button>
            ))}
          </div>
          {errors.price && <p className="form-error">{errors.price}</p>}
        </div>

        <div className="form-group">
          <label className="form-label">
            المساحة (م²) <Required />
          </label>
          <input
            className="form-input"
            type="number"
            min={1}
            step="any"
            value={fields.area}
            onChange={set("area")}
            placeholder="مثال: 120"
            disabled={disabled}
            dir="ltr"
          />
          {errors.area && <p className="form-error">{errors.area}</p>}
        </div>
      </Section>

      {/* ── Section: location ── */}
      <Section label="الموقع">
        <Row>
          <ProvinceSelect
            label="المحافظة (اختياري)"
            value={fields.province}
            onChange={(val) => {
              setField("province", val);
              setField("city", "");
              setField("neighborhood", "");
            }}
            disabled={disabled}
          />

          <CitySelect
            label="المدينة"
            value={fields.city}
            onChange={(val) => {
              setField("city", val);
              setField("neighborhood", "");
            }}
            province={fields.province}
            required
            error={errors.city}
            disabled={disabled}
          />
        </Row>

        <Row>
          <NeighborhoodSelect
            label="الحي (اختياري)"
            value={fields.neighborhood}
            onChange={(val) => setField("neighborhood", val)}
            city={fields.city}
            disabled={disabled}
          /></Row>

        <div className="form-group">
          <label className="form-label">العنوان التفصيلي (اختياري)</label>
          <input
            className="form-input"
            type="text"
            value={fields.address}
            onChange={set("address")}
            placeholder="مثال: شارع الثورة، بناء رقم 5"
            maxLength={300}
            disabled={disabled}
          />
          {errors.address && <p className="form-error">{errors.address}</p>}
        </div>

        <LocationPicker
          lat={lat}
          lng={lng}
          onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
          disabled={disabled}
        />
      </Section>

      {/* ── Section: rooms (optional) ── */}
      <Section label="الغرف (اختياري)">
        <Row>
          <div className="form-group">
            <label className="form-label">غرف النوم</label>
            <input
              className="form-input"
              type="number"
              min={0}
              max={20}
              value={fields.bedrooms}
              onChange={set("bedrooms")}
              placeholder="—"
              disabled={disabled}
              dir="ltr"
            />
            {errors.bedrooms && (
              <p className="form-error">{errors.bedrooms}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">الحمامات</label>
            <input
              className="form-input"
              type="number"
              min={0}
              max={10}
              value={fields.bathrooms}
              onChange={set("bathrooms")}
              placeholder="—"
              disabled={disabled}
              dir="ltr"
            />
            {errors.bathrooms && (
              <p className="form-error">{errors.bathrooms}</p>
            )}
          </div>
        </Row>
      </Section>

      {/* ── Section: description ── */}
      <Section label="الوصف (اختياري)">
        <div className="form-group">
          <label className="form-label">وصف العقار</label>
          <textarea
            className="form-input"
            value={fields.description}
            onChange={set("description")}
            placeholder="أضف وصفاً تفصيلياً للعقار..."
            rows={4}
            maxLength={3000}
            disabled={disabled}
            style={{ resize: "vertical", fontFamily: "inherit" }}
          />
          {errors.description && (
            <p className="form-error">{errors.description}</p>
          )}
        </div>
      </Section>

      {/* ── Section: features / amenities ── */}
      <Section label="المميزات والمرافق (اختياري)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {FEATURES.map((feat) => {
            const active = selectedFeatures.includes(feat.key);
            return (
              <button
                key={feat.key}
                type="button"
                disabled={disabled}
                onClick={() => toggleFeature(feat.key)}
                style={{
                  padding: "0.35rem 0.85rem",
                  borderRadius: 999,
                  border: `1.5px solid ${active ? "var(--color-primary)" : "#e0e7e0"}`,
                  background: active ? "var(--color-primary)" : "#f5f7f5",
                  color: active ? "#fff" : "var(--color-text-secondary)",
                  fontFamily: "var(--font-arabic)",
                  fontSize: "0.83rem",
                  fontWeight: active ? 700 : 500,
                  cursor: disabled ? "default" : "pointer",
                  transition: "all 0.15s",
                  userSelect: "none",
                }}
              >
                {feat.label}
              </button>
            );
          })}
        </div>
        {selectedFeatures.length > 0 && (
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.5rem" }}>
            تم اختيار {selectedFeatures.length} {selectedFeatures.length === 1 ? "ميزة" : "مميزات"}
          </p>
        )}
      </Section>

      {/* ── Section: company (create only, optional) ── */}
      {mode === "create" && !hideCompany && (
        <Section label="الشركة (اختياري)">
          <div className="form-group">
            <label className="form-label">معرف الشركة (Company ID)</label>
            <input
              className="form-input"
              type="text"
              value={fields.companyId}
              onChange={set("companyId")}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              disabled={disabled}
              dir="ltr"
              style={{ fontFamily: "monospace", letterSpacing: "0.03em" }}
            />
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--color-text-secondary)",
                margin: "0.3rem 0 0",
              }}
            >
              اتركه فارغاً لربط العقار تلقائياً بشركتك — أو أدخل UUID الشركة لتحديدها يدوياً.
            </p>
            {errors.companyId && (
              <p className="form-error">{errors.companyId}</p>
            )}
          </div>
        </Section>
      )}

      {/* ── Section: Images & Video ── */}
      <Section label="الصور والفيديو (اختياري)">
        {/* Images */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <label className="form-label" style={{ margin: 0 }}>
              صور العقار <span style={{ color: "#94a3b8", fontWeight: 400 }}>(حتى 10 صور)</span>
            </label>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{images.length} / 10</span>
          </div>

          {images.length < 10 && (
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              border: "2px dashed #d1d5db", borderRadius: 10, padding: "1.25rem",
              cursor: disabled || imageLoading ? "default" : "pointer",
              background: "#f9fafb", color: "#6b7280", gap: "0.35rem", marginBottom: "0.75rem",
            }}>
              <span style={{ fontSize: "1.5rem" }}>{imageLoading ? "⏳" : "📷"}</span>
              <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{imageLoading ? "جاري المعالجة..." : "اضغط لإضافة صور"}</span>
              <span style={{ fontSize: "0.75rem" }}>JPG، PNG — حتى 5MB لكل صورة</span>
              <input ref={fileInputRef} type="file" accept="image/*" multiple hidden
                disabled={disabled || imageLoading} onChange={handleImageFiles} />
            </label>
          )}

          {images.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
              {images.map((src, idx) => (
                <div key={idx} style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "4/3" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`صورة ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {idx === 0 && (
                    <span style={{
                      position: "absolute", top: 3, right: 3,
                      background: "#16a34a", color: "#fff",
                      fontSize: "0.6rem", fontWeight: 700, padding: "2px 5px", borderRadius: 99,
                    }}>رئيسية</span>
                  )}
                  <button type="button" onClick={() => removeImage(idx)}
                    style={{
                      position: "absolute", top: 3, left: 3,
                      background: "rgba(0,0,0,0.55)", color: "#fff",
                      border: "none", borderRadius: "50%", width: 22, height: 22,
                      cursor: "pointer", fontSize: "0.7rem",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>✕</button>
                </div>
              ))}
            </div>
          )}
          {images.length > 0 && (
            <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.35rem 0 0" }}>
              الصورة الأولى ستكون الصورة الرئيسية للإعلان
            </p>
          )}
        </div>

        {/* Video */}
        <div>
          <label className="form-label" style={{ display: "block", marginBottom: "0.5rem" }}>
            فيديو العقار <span style={{ color: "#94a3b8", fontWeight: 400 }}>(اختياري)</span>
          </label>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {(["url", "file"] as const).map((m) => (
              <button key={m} type="button"
                onClick={() => { setVideoMode(m); removeVideo(); }}
                style={{
                  padding: "0.35rem 0.8rem", borderRadius: 7, fontSize: "0.82rem", fontWeight: 600,
                  border: `1.5px solid ${videoMode === m ? "#16a34a" : "#e2e8f0"}`,
                  background: videoMode === m ? "#f0fdf4" : "#f8fafc",
                  color: videoMode === m ? "#16a34a" : "#64748b",
                  cursor: "pointer",
                }}>
                {m === "url" ? "🔗 إدخال رابط" : "📁 رفع من الجهاز"}
              </button>
            ))}
          </div>

          {videoMode === "url" ? (
            <>
              <input className="form-input" type="url" dir="ltr" disabled={disabled}
                value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/... أو رابط مباشر للفيديو" />
              {videoUrl && (
                <button type="button" onClick={removeVideo}
                  style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  ✕ حذف الرابط
                </button>
              )}
            </>
          ) : (
            <>
              {videoUrl && videoUrl.includes("/videos/") ? (
                <div style={{ position: "relative" }}>
                  <video src={videoUrl} controls
                    style={{ width: "100%", borderRadius: 8, maxHeight: 200, background: "#000" }} />
                  <button type="button" onClick={removeVideo}
                    style={{
                      position: "absolute", top: 6, left: 6,
                      background: "rgba(0,0,0,0.6)", color: "#fff",
                      border: "none", borderRadius: "50%", width: 26, height: 26,
                      cursor: "pointer", fontSize: "0.75rem",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>✕</button>
                </div>
              ) : (
                <label style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  border: "2px dashed #d1d5db", borderRadius: 10, padding: "1.25rem",
                  cursor: disabled || videoLoading ? "default" : "pointer",
                  background: "#f9fafb", color: "#6b7280", gap: "0.35rem",
                }}>
                  <span style={{ fontSize: "1.5rem" }}>{videoLoading ? "⏳" : "🎬"}</span>
                  <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{videoLoading ? "جاري الرفع..." : "اضغط لاختيار فيديو"}</span>
                  <span style={{ fontSize: "0.75rem" }}>MP4، WebM، MOV — حتى 50MB</span>
                  <input ref={videoFileRef} type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                    hidden disabled={disabled || videoLoading} onChange={handleVideoFile} />
                </label>
              )}
              {videoError && <p style={{ fontSize: "0.78rem", color: "#dc2626", margin: "0.3rem 0 0" }}>{videoError}</p>}
            </>
          )}
        </div>
      </Section>

      {/* ── Submit ── */}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={disabled}
        style={{ width: "100%", marginTop: "0.5rem", fontSize: "1rem", padding: "0.85rem" }}
      >
        {isSubmitting
          ? "جارٍ النشر..."
          : submitLabel
          ? submitLabel
          : mode === "create"
          ? "إضافة العقار"
          : "حفظ التعديلات"}
      </button>
    </form>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function Required() {
  return (
    <span style={{ color: "var(--color-error)", marginRight: "2px" }}>*</span>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <p
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "var(--color-text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "0.85rem",
          paddingBottom: "0.4rem",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1rem",
      }}
    >
      {children}
    </div>
  );
}
