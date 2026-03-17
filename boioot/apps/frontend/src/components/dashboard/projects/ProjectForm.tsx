"use client";

import { useState, type FormEvent } from "react";
import type {
  ProjectResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@/types";
import { PROJECT_STATUS_LABELS } from "@/features/projects/constants";
import { ProvinceSelect, CitySelect } from "@/components/dashboard/LocationSelect";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormFields {
  title: string;
  description: string;
  status: string;
  province: string;
  city: string;
  address: string;
  startingPrice: string;
  deliveryDate: string;
  isPublished: boolean;
  companyId: string;
}

type FormErrors = Partial<Record<keyof FormFields, string>>;

interface ProjectFormProps {
  mode: "create" | "edit";
  initialData?: ProjectResponse;
  onSubmit: (data: CreateProjectRequest | UpdateProjectRequest) => Promise<void>;
  isSubmitting: boolean;
  serverError: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMPTY_FIELDS: FormFields = {
  title: "",
  description: "",
  status: "Upcoming",
  province: "",
  city: "",
  address: "",
  startingPrice: "",
  deliveryDate: "",
  isPublished: false,
  companyId: "",
};

function fromInitial(data: ProjectResponse): FormFields {
  return {
    title: data.title,
    description: data.description ?? "",
    status: data.status,
    province: data.province ?? "",
    city: data.city,
    address: data.address ?? "",
    startingPrice: data.startingPrice != null ? String(data.startingPrice) : "",
    // ISO string "2026-12-31T00:00:00" → "2026-12-31" for <input type="date">
    deliveryDate: data.deliveryDate ? data.deliveryDate.slice(0, 10) : "",
    isPublished: data.isPublished,
    companyId: "",
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(fields: FormFields, mode: "create" | "edit"): FormErrors {
  const errors: FormErrors = {};

  const title = fields.title.trim();
  if (!title) errors.title = "اسم المشروع مطلوب";
  else if (title.length < 2) errors.title = "اسم المشروع يجب ألا يقل عن حرفين";
  else if (title.length > 300) errors.title = "اسم المشروع يجب ألا يتجاوز 300 حرف";

  if (!fields.status) errors.status = "حالة المشروع مطلوبة";
  if (!fields.city) errors.city = "المدينة مطلوبة";

  if (fields.startingPrice !== "") {
    const p = Number(fields.startingPrice);
    if (isNaN(p) || p < 0)
      errors.startingPrice = "السعر الابتدائي يجب أن يكون صفراً أو أكثر";
  }

  if (fields.deliveryDate) {
    const d = new Date(fields.deliveryDate);
    if (isNaN(d.getTime()))
      errors.deliveryDate = "تاريخ التسليم غير صالح";
  }

  if (fields.description && fields.description.length > 3000)
    errors.description = "الوصف يجب ألا يتجاوز 3000 حرف";

  if (fields.address && fields.address.length > 300)
    errors.address = "العنوان التفصيلي يجب ألا يتجاوز 300 حرف";

  if (mode === "create") {
    const cid = fields.companyId.trim();
    if (!cid) errors.companyId = "معرف الشركة مطلوب";
    else if (!UUID_RE.test(cid))
      errors.companyId = "صيغة المعرف غير صحيحة — يجب أن يكون UUID";
  }

  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectForm({
  mode,
  initialData,
  onSubmit,
  isSubmitting,
  serverError,
}: ProjectFormProps) {
  const [fields, setFields] = useState<FormFields>(
    initialData ? fromInitial(initialData) : EMPTY_FIELDS
  );
  const [errors, setErrors] = useState<FormErrors>({});

  function set(field: keyof FormFields) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      setFields((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  function setPublished(e: React.ChangeEvent<HTMLInputElement>) {
    setFields((prev) => ({ ...prev, isPublished: e.target.checked }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const fieldErrors = validate(fields, mode);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    const base = {
      title: fields.title.trim(),
      description: fields.description.trim() || undefined,
      status: fields.status,
      province: fields.province.trim() || undefined,
      city: fields.city,
      address: fields.address.trim() || undefined,
      startingPrice:
        fields.startingPrice !== "" ? Number(fields.startingPrice) : undefined,
      deliveryDate: fields.deliveryDate || undefined,
      isPublished: fields.isPublished,
    };

    if (mode === "create") {
      await onSubmit({
        ...base,
        companyId: fields.companyId.trim(),
      } as CreateProjectRequest);
    } else {
      await onSubmit(base as UpdateProjectRequest);
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
            اسم المشروع <Required />
          </label>
          <input
            className="form-input"
            type="text"
            value={fields.title}
            onChange={set("title")}
            placeholder="مثال: مشروع المزة للإسكان الفاخر"
            maxLength={300}
            disabled={disabled}
          />
          {errors.title && <p className="form-error">{errors.title}</p>}
        </div>

        <Row>
          <div className="form-group">
            <label className="form-label">
              حالة المشروع <Required />
            </label>
            <select
              className="form-input"
              value={fields.status}
              onChange={set("status")}
              disabled={disabled}
            >
              <option value="">اختر الحالة</option>
              {Object.entries(PROJECT_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            {errors.status && <p className="form-error">{errors.status}</p>}
          </div>

          <ProvinceSelect
            label="المحافظة"
            value={fields.province}
            onChange={(val) => setFields((p) => ({ ...p, province: val, city: "" }))}
            disabled={disabled}
          />
        </Row>

        <Row>
          <CitySelect
            label="المدينة *"
            value={fields.city}
            onChange={(val) => setFields((p) => ({ ...p, city: val }))}
            province={fields.province}
            required
            error={errors.city}
            disabled={disabled}
          />
        </Row>

        <div className="form-group">
          <label className="form-label">العنوان التفصيلي</label>
          <input
            className="form-input"
            type="text"
            value={fields.address}
            onChange={set("address")}
            placeholder="مثال: شارع بغداد، المزة"
            maxLength={300}
            disabled={disabled}
          />
          {errors.address && <p className="form-error">{errors.address}</p>}
        </div>
      </Section>

      {/* ── Section: price & delivery ── */}
      <Section label="السعر والتسليم">
        <Row>
          <div className="form-group">
            <label className="form-label">السعر الابتدائي (ل.س)</label>
            <input
              className="form-input"
              type="number"
              min={0}
              step="any"
              value={fields.startingPrice}
              onChange={set("startingPrice")}
              placeholder="اتركه فارغاً إذا لم يُحدد"
              disabled={disabled}
              dir="ltr"
            />
            {errors.startingPrice && (
              <p className="form-error">{errors.startingPrice}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">تاريخ التسليم المتوقع</label>
            <input
              className="form-input"
              type="date"
              value={fields.deliveryDate}
              onChange={set("deliveryDate")}
              disabled={disabled}
              dir="ltr"
            />
            {errors.deliveryDate && (
              <p className="form-error">{errors.deliveryDate}</p>
            )}
          </div>
        </Row>
      </Section>

      {/* ── Section: publish ── */}
      <Section label="النشر">
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.65rem",
            cursor: disabled ? "not-allowed" : "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={fields.isPublished}
            onChange={setPublished}
            disabled={disabled}
            style={{
              width: 18,
              height: 18,
              accentColor: "var(--color-primary)",
              cursor: "inherit",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: "0.95rem",
              color: "var(--color-text-primary)",
              fontWeight: 500,
            }}
          >
            نشر المشروع للعرض العام
          </span>
        </label>
        <p
          style={{
            margin: "0.4rem 0 0 1.65rem",
            fontSize: "0.78rem",
            color: "var(--color-text-secondary)",
          }}
        >
          عند التفعيل، يظهر المشروع للزوار في صفحة المشاريع.
        </p>
      </Section>

      {/* ── Section: description ── */}
      <Section label="الوصف (اختياري)">
        <div className="form-group">
          <label className="form-label">وصف المشروع</label>
          <textarea
            className="form-input"
            value={fields.description}
            onChange={set("description")}
            placeholder="أضف وصفاً تفصيلياً للمشروع..."
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
              أدخل المعرف الفريد (UUID) للشركة التابع لها هذا المشروع.
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
        style={{
          width: "100%",
          marginTop: "0.5rem",
          fontSize: "1rem",
          padding: "0.85rem",
        }}
      >
        {isSubmitting
          ? "جارٍ الحفظ..."
          : mode === "create"
          ? "إنشاء المشروع"
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
