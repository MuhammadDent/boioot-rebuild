"use client";

import { useState } from "react";
import { useContent } from "@/context/ContentContext";
import { submitSpecialRequest, type SubmitSpecialRequestDto } from "@/features/special-requests/api";

const STATUS_LABELS: Record<string, string> = {
  required: "هذا الحقل مطلوب",
};

export default function SpecialRequestsPage() {
  const title       = useContent("special_requests.title",       "الطلبات الخاصة");
  const description = useContent("special_requests.description",  "هل تبحث عن عقار بمواصفات خاصة؟ أرسل لنا طلبك وسيتواصل معك فريقنا لمساعدتك في العثور على العقار المناسب.");
  const ctaText     = useContent("special_requests.cta_text",    "أضف طلبك الآن");

  const [form, setForm] = useState<SubmitSpecialRequestDto>({
    fullName: "",
    phone: "",
    whatsApp: "",
    email: "",
    message: "",
    source: "web",
  });

  const [errors, setErrors]     = useState<Partial<Record<keyof SubmitSpecialRequestDto, string>>>({});
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [apiError, setApiError] = useState("");

  function validate() {
    const e: typeof errors = {};
    if (!form.phone.trim())   e.phone   = STATUS_LABELS.required;
    if (!form.message.trim()) e.message = STATUS_LABELS.required;
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    setApiError("");
    try {
      await submitSpecialRequest({
        ...form,
        whatsApp: form.whatsApp || undefined,
        email:    form.email    || undefined,
      });
      setSuccess(true);
    } catch {
      setApiError("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", paddingBottom: 64 }}>

        {/* ── Hero ────────────────────────────────────────────────────────────── */}
        <section style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          padding: "80px 24px 60px",
          textAlign: "center",
          color: "#fff",
        }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 16px", fontFamily: "inherit" }}>
            {title}
          </h1>
          <p style={{ fontSize: 18, opacity: 0.85, maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.7 }}>
            {description}
          </p>
          {!success && (
            <a
              href="#form"
              style={{
                display: "inline-block",
                background: "#e63946",
                color: "#fff",
                padding: "14px 36px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 17,
                textDecoration: "none",
                transition: "background 0.2s",
              }}
            >
              {ctaText}
            </a>
          )}
        </section>

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 16px 0" }}>

          {/* ── Success ───────────────────────────────────────────────────────── */}
          {success ? (
            <div style={{
              background: "#fff",
              borderRadius: 16,
              padding: "56px 40px",
              textAlign: "center",
              boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
            }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
              <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: "0 0 12px" }}>
                تم إرسال طلبك بنجاح
              </h2>
              <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, margin: "0 0 32px" }}>
                سيقوم فريقنا بالتواصل معك قريبًا على الرقم الذي أدخلته.
              </p>
              <button
                onClick={() => { setSuccess(false); setForm({ fullName: "", phone: "", whatsApp: "", email: "", message: "", source: "web" }); }}
                style={{
                  background: "#1a1a2e",
                  color: "#fff",
                  border: "none",
                  padding: "12px 28px",
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: 15,
                }}
              >
                إرسال طلب آخر
              </button>
            </div>
          ) : (

            /* ── Form ───────────────────────────────────────────────────────── */
            <form
              id="form"
              onSubmit={handleSubmit}
              style={{
                background: "#fff",
                borderRadius: 16,
                padding: "40px 32px",
                boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
              }}
            >
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: "#1a1a2e" }}>
                أرسل طلبك
              </h2>
              <p style={{ color: "#777", marginBottom: 28, fontSize: 14 }}>
                اكتب طلبك وسيتواصل معك فريقنا لمساعدتك في العثور على العقار المناسب
              </p>

              {apiError && (
                <div style={{
                  background: "#fff5f5",
                  border: "1px solid #ffcdd2",
                  borderRadius: 8,
                  padding: "12px 16px",
                  color: "#c62828",
                  marginBottom: 20,
                  fontSize: 14,
                }}>
                  {apiError}
                </div>
              )}

              {/* Message — first and prominent */}
              <FieldBlock label="نص الطلب *" error={errors.message}>
                <textarea
                  rows={5}
                  placeholder="مثال: أبحث عن شقة للإيجار في المزة بسعر مناسب..."
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  style={textareaStyle(!!errors.message)}
                />
              </FieldBlock>

              {/* Required contact */}
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
                <FieldBlock label="الاسم" error={errors.fullName}>
                  <input
                    type="text"
                    placeholder="الاسم الكامل"
                    value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    style={inputStyle(!!errors.fullName)}
                  />
                </FieldBlock>
                <FieldBlock label="رقم الهاتف *" error={errors.phone}>
                  <input
                    type="tel"
                    placeholder="09xxxxxxxx"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    style={inputStyle(!!errors.phone)}
                    dir="ltr"
                  />
                </FieldBlock>
              </div>

              {/* Optional */}
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
                <FieldBlock label="واتساب (اختياري)">
                  <input
                    type="tel"
                    placeholder="09xxxxxxxx"
                    value={form.whatsApp}
                    onChange={e => setForm(f => ({ ...f, whatsApp: e.target.value }))}
                    style={inputStyle()}
                    dir="ltr"
                  />
                </FieldBlock>
                <FieldBlock label="البريد الإلكتروني (اختياري)">
                  <input
                    type="email"
                    placeholder="example@mail.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    style={inputStyle()}
                    dir="ltr"
                  />
                </FieldBlock>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 28,
                  width: "100%",
                  background: loading ? "#999" : "#e63946",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "15px",
                  fontSize: 17,
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                }}
              >
                {loading ? "جاري الإرسال..." : "إرسال الطلب"}
              </button>
            </form>
          )}
        </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldBlock({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#333", marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {error && <p style={{ color: "#e63946", fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function inputStyle(hasError = false): React.CSSProperties {
  return {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 8,
    border: `1.5px solid ${hasError ? "#e63946" : "#e0e0e0"}`,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    background: "#fafafa",
  };
}

function textareaStyle(hasError = false): React.CSSProperties {
  return {
    ...inputStyle(hasError),
    resize: "vertical",
    lineHeight: 1.7,
    minHeight: 120,
  };
}
