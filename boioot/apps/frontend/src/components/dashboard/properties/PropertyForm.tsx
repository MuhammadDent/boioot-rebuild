"use client";

import { useState, type FormEvent } from "react";
import type {
  PropertyResponse,
  CreatePropertyRequest,
  UpdatePropertyRequest,
} from "@/types";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  SYRIAN_CITIES,
} from "@/features/properties/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormFields {
  title: string;
  description: string;
  type: string;
  listingType: string;
  status: string;
  price: string;
  area: string;
  bedrooms: string;
  bathrooms: string;
  city: string;
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
  area: "",
  bedrooms: "",
  bathrooms: "",
  city: "",
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
    area: String(data.area),
    bedrooms: data.bedrooms != null ? String(data.bedrooms) : "",
    bathrooms: data.bathrooms != null ? String(data.bathrooms) : "",
    city: data.city,
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

  if (mode === "create") {
    const cid = fields.companyId.trim();
    if (!cid) errors.companyId = "معرف الشركة مطلوب";
    else if (!UUID_RE.test(cid)) errors.companyId = "صيغة المعرف غير صحيحة — يجب أن يكون UUID";
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
}: PropertyFormProps) {
  const [fields, setFields] = useState<FormFields>(
    initialData ? fromInitial(initialData) : EMPTY_FIELDS
  );
  const [errors, setErrors] = useState<FormErrors>({});

  function set(field: keyof FormFields) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
      setFields((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

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
      area: Number(fields.area),
      bedrooms: fields.bedrooms !== "" ? Number(fields.bedrooms) : undefined,
      bathrooms: fields.bathrooms !== "" ? Number(fields.bathrooms) : undefined,
      address: fields.address.trim() || undefined,
      city: fields.city,
    };

    if (mode === "create") {
      await onSubmit({ ...base, companyId: fields.companyId.trim() } as CreatePropertyRequest);
    } else {
      await onSubmit({ ...base, status: fields.status } as UpdatePropertyRequest);
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
              {Object.entries(LISTING_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
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
        <Row>
          <div className="form-group">
            <label className="form-label">
              السعر (ل.س) <Required />
            </label>
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
            />
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
        </Row>
      </Section>

      {/* ── Section: location ── */}
      <Section label="الموقع">
        <Row>
          <div className="form-group">
            <label className="form-label">
              المدينة <Required />
            </label>
            <select
              className="form-input"
              value={fields.city}
              onChange={set("city")}
              disabled={disabled}
            >
              <option value="">اختر المدينة</option>
              {SYRIAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.city && <p className="form-error">{errors.city}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">العنوان التفصيلي</label>
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
        </Row>
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

      {/* ── Section: company (create only) ── */}
      {mode === "create" && (
        <Section label="الشركة">
          <div className="form-group">
            <label className="form-label">
              معرف الشركة (Company ID) <Required />
            </label>
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
              أدخل المعرف الفريد (UUID) للشركة التابع لها هذا العقار.
            </p>
            {errors.companyId && (
              <p className="form-error">{errors.companyId}</p>
            )}
          </div>
        </Section>
      )}

      {/* ── Submit ── */}
      <button
        type="submit"
        className="btn btn-primary"
        disabled={disabled}
        style={{ width: "100%", marginTop: "0.5rem", fontSize: "1rem", padding: "0.85rem" }}
      >
        {isSubmitting
          ? "جارٍ الحفظ..."
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
