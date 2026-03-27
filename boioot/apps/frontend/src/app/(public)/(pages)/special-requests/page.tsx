"use client";

import { useState, useEffect, useRef } from "react";
import { useContent } from "@/context/ContentContext";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  getSpecialRequestTypes,
  submitSpecialRequest,
  type SpecialRequestType,
  type SubmitSpecialRequestDto,
} from "@/features/special-requests/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILES    = 5;
const MAX_MB       = 10;
const MAX_BYTES    = MAX_MB * 1024 * 1024;
const ALLOWED_EXT  = [".jpg", ".jpeg", ".png", ".pdf"];
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

const EMPTY_FORM: SubmitSpecialRequestDto = {
  fullName:       "",
  phone:          "",
  whatsApp:       "",
  email:          "",
  requestType:    "",
  message:        "",
  source:         "web",
  attachmentUrls: [],
};

interface AttachFile {
  name:  string;
  url:   string;
  isPdf: boolean;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpecialRequestsPage() {
  const title       = useContent("special_requests.title",       "الطلبات الخاصة");
  const description = useContent("special_requests.description",  "هل تبحث عن عقار بمواصفات خاصة؟ أرسل لنا طلبك وسيتواصل معك فريقنا لمساعدتك في العثور على العقار المناسب.");
  const ctaText     = useContent("special_requests.cta_text",    "أضف طلبك الآن");

  // Auth
  const { isAuthenticated, openAuthModal } = useRequireAuth();

  // Types
  const [types, setTypes] = useState<SpecialRequestType[]>([]);

  // Form
  const [form, setForm]         = useState<SubmitSpecialRequestDto>(EMPTY_FORM);
  const [errors, setErrors]     = useState<Partial<Record<keyof SubmitSpecialRequestDto, string>>>({});
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [apiError, setApiError] = useState("");

  // Attachments
  const [attachFiles, setAttachFiles]       = useState<AttachFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [fileError, setFileError]           = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSpecialRequestTypes().then(setTypes).catch(() => setTypes([]));
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate() {
    const e: typeof errors = {};
    if (!form.requestType.trim()) e.requestType = "هذا الحقل مطلوب";
    if (!form.phone.trim())       e.phone       = "هذا الحقل مطلوب";
    if (!form.email.trim())       e.email       = "هذا الحقل مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "البريد الإلكتروني غير صحيح";
    if (!form.message.trim())     e.message     = "هذا الحقل مطلوب";
    return e;
  }

  // ── Actual API submission (called after auth is confirmed) ──────────────────

  async function doSubmit(urls: string[]) {
    setLoading(true);
    setApiError("");
    try {
      await submitSpecialRequest({
        ...form,
        whatsApp:       form.whatsApp || undefined,
        attachmentUrls: urls,
      });
      setSuccess(true);
    } catch {
      setApiError("حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  // ── Submit handler — triggers auth gate if needed ───────────────────────────

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();

    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});

    const urls = attachFiles.map(a => a.url);

    if (!isAuthenticated) {
      // Open auth modal — on success the callback fires doSubmit automatically
      openAuthModal(() => doSubmit(urls));
      return;
    }

    doSubmit(urls);
  }

  // ── File upload ─────────────────────────────────────────────────────────────

  async function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(ev.target.files ?? []);
    if (!files.length) return;
    ev.target.value = "";
    setFileError("");

    const remaining = MAX_FILES - attachFiles.length;
    if (remaining <= 0) { setFileError(`الحد الأقصى ${MAX_FILES} ملفات`); return; }

    const toUpload = files.slice(0, remaining);
    const invalid  = toUpload.filter(f => !ALLOWED_MIME.includes(f.type) || f.size > MAX_BYTES);

    if (invalid.length > 0) {
      setFileError("بعض الملفات غير مدعومة أو تجاوزت 10MB. المدعومة: JPG، PNG، PDF");
      return;
    }

    setUploadingFiles(true);
    const newFiles: AttachFile[] = [];

    for (const file of toUpload) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await api.postForm<{ url: string }>("/upload/special-request-attachment", fd);
        newFiles.push({ name: file.name, url: res.url, isPdf: file.type === "application/pdf" });
      } catch {
        setFileError(`فشل رفع الملف: ${file.name}`);
      }
    }

    setUploadingFiles(false);
    const updated = [...attachFiles, ...newFiles];
    setAttachFiles(updated);
    setForm(f => ({ ...f, attachmentUrls: updated.map(a => a.url) }));
  }

  function removeFile(idx: number) {
    const updated = attachFiles.filter((_, i) => i !== idx);
    setAttachFiles(updated);
    setForm(f => ({ ...f, attachmentUrls: updated.map(a => a.url) }));
  }

  function resetAll() {
    setSuccess(false);
    setForm(EMPTY_FORM);
    setAttachFiles([]);
    setFileError("");
    setApiError("");
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", paddingBottom: 64 }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        padding: "80px 24px 60px", textAlign: "center", color: "#fff",
      }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 16px" }}>{title}</h1>
        <p style={{ fontSize: 18, opacity: 0.85, maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.7 }}>{description}</p>
        {!success && (
          <a href="#form" style={{
            display: "inline-block", background: "#e63946", color: "#fff",
            padding: "14px 36px", borderRadius: 10, fontWeight: 700, fontSize: 17, textDecoration: "none",
          }}>{ctaText}</a>
        )}
      </section>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 16px 0" }}>

        {/* ── Success ────────────────────────────────────────────────────── */}
        {success ? (
          <div style={{
            background: "#fff", borderRadius: 16, padding: "56px 40px",
            textAlign: "center", boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
          }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", margin: "0 0 12px" }}>تم إرسال طلبك بنجاح</h2>
            <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, margin: "0 0 32px" }}>
              سيقوم فريقنا بالتواصل معك قريبًا على الرقم الذي أدخلته.
            </p>
            <button onClick={resetAll} style={{
              background: "#1a1a2e", color: "#fff", border: "none",
              padding: "12px 28px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 15,
            }}>إرسال طلب آخر</button>
          </div>

        ) : (

          /* ── Form ──────────────────────────────────────────────────────── */
          <form id="form" onSubmit={handleSubmit} style={{
            background: "#fff", borderRadius: 16, padding: "40px 32px",
            boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px", color: "#1a1a2e" }}>أرسل طلبك</h2>
            <p style={{ color: "#777", marginBottom: 28, fontSize: 14 }}>
              اكتب طلبك وسيتواصل معك فريقنا لمساعدتك في العثور على العقار المناسب
            </p>

            {apiError && (
              <div style={{
                background: "#fff5f5", border: "1px solid #ffcdd2", borderRadius: 8,
                padding: "12px 16px", color: "#c62828", marginBottom: 20, fontSize: 14,
              }}>{apiError}</div>
            )}

            {/* نوع الطلب */}
            <FieldBlock label="نوع الطلب *" error={errors.requestType}>
              <select value={form.requestType}
                onChange={e => setForm(f => ({ ...f, requestType: e.target.value }))}
                style={selectStyle(!!errors.requestType)}>
                <option value="">-- اختر نوع الطلب --</option>
                {types.map(t => <option key={t.id} value={t.value}>{t.label}</option>)}
              </select>
            </FieldBlock>

            {/* نص الطلب */}
            <FieldBlock label="نص الطلب *" error={errors.message}>
              <textarea rows={5} placeholder="مثال: أبحث عن شقة للإيجار في المزة بسعر مناسب..."
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                style={{ ...inputStyle(!!errors.message), resize: "vertical", lineHeight: 1.7, minHeight: 120 }} />
            </FieldBlock>

            {/* الاسم + الهاتف */}
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
              <FieldBlock label="الاسم" error={errors.fullName}>
                <input type="text" placeholder="الاسم الكامل" value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  style={inputStyle(!!errors.fullName)} />
              </FieldBlock>
              <FieldBlock label="رقم الهاتف *" error={errors.phone}>
                <input type="tel" placeholder="09xxxxxxxx" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={inputStyle(!!errors.phone)} dir="ltr" />
              </FieldBlock>
            </div>

            {/* البريد + الواتساب */}
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
              <FieldBlock label="البريد الإلكتروني *" error={errors.email}>
                <input type="email" placeholder="example@mail.com" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={inputStyle(!!errors.email)} dir="ltr" />
              </FieldBlock>
              <FieldBlock label="واتساب (اختياري)">
                <input type="tel" placeholder="09xxxxxxxx" value={form.whatsApp}
                  onChange={e => setForm(f => ({ ...f, whatsApp: e.target.value }))}
                  style={inputStyle()} dir="ltr" />
              </FieldBlock>
            </div>

            {/* ── المرفقات ─────────────────────────────────────────────────── */}
            <div style={{ marginTop: 24 }}>
              <label style={{ display: "block", fontWeight: 700, fontSize: 14, color: "#333", marginBottom: 8 }}>
                المرفقات
                <span style={{ fontWeight: 400, color: "#888", marginRight: 6 }}>
                  (اختياري — JPG، PNG، PDF — حتى {MAX_FILES} ملفات، {MAX_MB}MB لكل ملف)
                </span>
              </label>

              <div
                onClick={() => !uploadingFiles && attachFiles.length < MAX_FILES && fileInputRef.current?.click()}
                style={{
                  border: "2px dashed #d0d5dd", borderRadius: 10, padding: "20px",
                  textAlign: "center", background: "#fafafa",
                  cursor: attachFiles.length >= MAX_FILES ? "not-allowed" : "pointer",
                  opacity: attachFiles.length >= MAX_FILES ? 0.5 : 1,
                  transition: "border-color 0.2s",
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 6 }}>📎</div>
                <p style={{ margin: 0, fontSize: 14, color: "#555", fontWeight: 500 }}>
                  {uploadingFiles
                    ? "جاري رفع الملفات..."
                    : attachFiles.length >= MAX_FILES
                    ? `وصلت للحد الأقصى (${MAX_FILES} ملفات)`
                    : "اضغط لاختيار ملفات أو اسحبها هنا"}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#aaa" }}>
                  {attachFiles.length}/{MAX_FILES} ملفات مرفقة
                </p>
              </div>

              <input ref={fileInputRef} type="file" multiple accept={ALLOWED_EXT.join(",")}
                onChange={handleFileChange} style={{ display: "none" }} />

              {fileError && <p style={{ color: "#e63946", fontSize: 12, margin: "6px 0 0" }}>{fileError}</p>}

              {attachFiles.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {attachFiles.map((f, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "#f0f4ff", borderRadius: 8, padding: "8px 12px",
                      border: "1px solid #dbeafe",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 18 }}>{f.isPdf ? "📄" : "🖼️"}</span>
                        <a href={f.url} target="_blank" rel="noreferrer" style={{
                          fontSize: 13, color: "#1d4ed8", textDecoration: "none",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{f.name}</a>
                      </div>
                      <button type="button" onClick={() => removeFile(i)} style={{
                        background: "none", border: "none", color: "#e63946",
                        cursor: "pointer", fontSize: 16, padding: "0 4px", flexShrink: 0,
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Submit ───────────────────────────────────────────────────── */}
            <button type="submit" disabled={loading || uploadingFiles} style={{
              marginTop: 28, width: "100%",
              background: (loading || uploadingFiles) ? "#999" : "#e63946",
              color: "#fff", border: "none", borderRadius: 10, padding: "15px",
              fontSize: 17, fontWeight: 700,
              cursor: (loading || uploadingFiles) ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}>
              {loading        ? "جاري الإرسال..."
               : uploadingFiles ? "يرجى انتظار اكتمال الرفع..."
               : "إرسال الطلب"}
            </button>

            {/* Auth hint for guests */}
            {!isAuthenticated && (
              <p style={{
                marginTop: 10, textAlign: "center", fontSize: 12,
                color: "#9ca3af", lineHeight: 1.5,
              }}>
                🔐 سيُطلب منك تسجيل الدخول أو إنشاء حساب قبل إرسال الطلب
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldBlock({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <label style={{ display: "block", fontWeight: 600, fontSize: 14, color: "#333", marginBottom: 6 }}>{label}</label>
      {children}
      {error && <p style={{ color: "#e63946", fontSize: 12, margin: "4px 0 0" }}>{error}</p>}
    </div>
  );
}

function inputStyle(hasError = false): React.CSSProperties {
  return {
    width: "100%", padding: "11px 14px", borderRadius: 8,
    border: `1.5px solid ${hasError ? "#e63946" : "#e0e0e0"}`,
    fontSize: 15, outline: "none", boxSizing: "border-box",
    fontFamily: "inherit", background: "#fafafa",
  };
}

function selectStyle(hasError = false): React.CSSProperties {
  return { ...inputStyle(hasError), appearance: "auto", cursor: "pointer", color: "#333" };
}
