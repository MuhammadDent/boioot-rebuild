"use client";

import { useState, type FormEvent } from "react";
import { requestsApi } from "@/features/requests/api";
import { normalizeError } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InquiryFormProps {
  /** Pass exactly one of these to link the inquiry to a property or project. */
  propertyId?: string;
  projectId?: string;
  /** Title of the property or project — displayed in the form heading. */
  contextTitle: string;
}

interface FormFields {
  name: string;
  phone: string;
  email: string;
  message: string;
}

type FormErrors = Partial<Record<keyof FormFields, string>>;

// ─── Constants ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY: FormFields = { name: "", phone: "", email: "", message: "" };

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(f: FormFields): FormErrors {
  const errors: FormErrors = {};

  const name = f.name.trim();
  if (!name) errors.name = "الاسم مطلوب";
  else if (name.length < 2) errors.name = "الاسم يجب أن لا يقل عن حرفين";
  else if (name.length > 200) errors.name = "الاسم يجب أن لا يتجاوز 200 حرف";

  const phone = f.phone.trim();
  if (!phone) errors.phone = "رقم الهاتف مطلوب";
  else if (phone.length < 5) errors.phone = "رقم الهاتف يجب أن لا يقل عن 5 أرقام";
  else if (phone.length > 50) errors.phone = "رقم الهاتف يجب أن لا يتجاوز 50 رقماً";

  const email = f.email.trim();
  if (email) {
    if (!EMAIL_RE.test(email)) errors.email = "صيغة البريد الإلكتروني غير صحيحة";
    else if (email.length > 200) errors.email = "البريد الإلكتروني يجب أن لا يتجاوز 200 حرف";
  }

  if (f.message.length > 2000)
    errors.message = "الرسالة يجب أن لا تتجاوز 2000 حرف";

  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InquiryForm({
  propertyId,
  projectId,
  contextTitle,
}: InquiryFormProps) {
  const [fields, setFields] = useState<FormFields>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [succeeded, setSucceeded] = useState(false);

  function set(field: keyof FormFields) {
    return (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      setFields((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const fieldErrors = validate(fields);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setIsSubmitting(true);
    setServerError("");
    try {
      await requestsApi.submit({
        name: fields.name.trim(),
        phone: fields.phone.trim(),
        email: fields.email.trim() || undefined,
        message: fields.message.trim() || undefined,
        propertyId,
        projectId,
      });
      setSucceeded(true);
    } catch (e) {
      setServerError(normalizeError(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────

  if (succeeded) {
    return (
      <div
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: "#e8f5e9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2e7d32"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 0.4rem",
          }}
        >
          تم إرسال استفسارك بنجاح
        </p>
        <p
          style={{
            fontSize: "0.9rem",
            color: "var(--color-text-secondary)",
            margin: 0,
          }}
        >
          سيتواصل معك فريقنا في أقرب وقت ممكن.
        </p>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  const disabled = isSubmitting;

  return (
    <div
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        padding: "1.5rem",
      }}
    >
      {/* Header */}
      <h2
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          margin: "0 0 0.3rem",
          color: "var(--color-text-primary)",
        }}
      >
        تواصل معنا
      </h2>
      <p
        style={{
          fontSize: "0.82rem",
          color: "var(--color-text-secondary)",
          margin: "0 0 1.25rem",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        استفسار عن: {contextTitle}
      </p>

      {/* Server error */}
      {serverError && (
        <div
          style={{
            background: "#ffebee",
            color: "#c62828",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            fontSize: "0.88rem",
          }}
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>

        {/* Name */}
        <div className="form-group">
          <label className="form-label">
            الاسم الكامل <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <input
            className="form-input"
            type="text"
            value={fields.name}
            onChange={set("name")}
            placeholder="مثال: أحمد السيد"
            maxLength={200}
            disabled={disabled}
          />
          {errors.name && <p className="form-error">{errors.name}</p>}
        </div>

        {/* Phone */}
        <div className="form-group">
          <label className="form-label">
            رقم الهاتف <span style={{ color: "var(--color-error)" }}>*</span>
          </label>
          <input
            className="form-input"
            type="tel"
            value={fields.phone}
            onChange={set("phone")}
            placeholder="مثال: 0991234567"
            maxLength={50}
            disabled={disabled}
            dir="ltr"
          />
          {errors.phone && <p className="form-error">{errors.phone}</p>}
        </div>

        {/* Email */}
        <div className="form-group">
          <label className="form-label">البريد الإلكتروني (اختياري)</label>
          <input
            className="form-input"
            type="email"
            value={fields.email}
            onChange={set("email")}
            placeholder="example@mail.com"
            maxLength={200}
            disabled={disabled}
            dir="ltr"
          />
          {errors.email && <p className="form-error">{errors.email}</p>}
        </div>

        {/* Message */}
        <div className="form-group">
          <label className="form-label">رسالتك (اختياري)</label>
          <textarea
            className="form-input"
            value={fields.message}
            onChange={set("message")}
            placeholder="اكتب استفسارك أو طلبك هنا..."
            rows={3}
            maxLength={2000}
            disabled={disabled}
            style={{ resize: "vertical", fontFamily: "inherit" }}
          />
          {errors.message && <p className="form-error">{errors.message}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={disabled}
          style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem" }}
        >
          {isSubmitting ? "جارٍ الإرسال..." : "إرسال الاستفسار"}
        </button>
      </form>
    </div>
  );
}
