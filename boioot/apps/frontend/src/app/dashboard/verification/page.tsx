"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { api, normalizeError } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface VDocResponse {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

interface VRequestSummary {
  id: string;
  verificationType: string;
  status: string;
  documentCount: number;
  submittedAt?: string;
  createdAt: string;
}

interface VRequestResponse {
  id: string;
  userId: string;
  verificationType: string;
  status: string;
  submittedAt?: string;
  reviewedAt?: string;
  userNotes?: string;
  adminNotes?: string;
  rejectionReason?: string;
  documents: VDocResponse[];
  createdAt: string;
  updatedAt: string;
}

interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  Draft:         "مسودة",
  Submitted:     "مُقدَّم",
  Pending:       "مُقدَّم",
  UnderReview:   "قيد المراجعة",
  NeedsMoreInfo: "يحتاج معلومات إضافية",
  Approved:      "مقبول",
  Rejected:      "مرفوض",
  Cancelled:     "ملغى",
};

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Draft:         { bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  Submitted:     { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  Pending:       { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  UnderReview:   { bg: "#f0f9ff", color: "#0369a1", border: "#bae6fd" },
  NeedsMoreInfo: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  Approved:      { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
  Rejected:      { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
  Cancelled:     { bg: "#f8fafc", color: "#94a3b8", border: "#e2e8f0" },
};

const TYPE_OPTIONS = [
  { value: "Identity", label: "توثيق الهوية الشخصية",    desc: "هوية وطنية أو جواز سفر أو رخصة" },
  { value: "Business", label: "توثيق السجل التجاري",    desc: "سجل تجاري أو شهادة ضريبية" },
  { value: "Both",     label: "هوية + سجل تجاري معاً",  desc: "التوثيق الكامل للأفراد والشركات" },
];

const DOC_TYPE_OPTIONS = [
  { value: "NationalId",       label: "الهوية الوطنية" },
  { value: "Passport",         label: "جواز السفر" },
  { value: "DriverLicense",    label: "رخصة القيادة" },
  { value: "CommercialRecord", label: "السجل التجاري" },
  { value: "TaxCertificate",  label: "الشهادة الضريبية" },
  { value: "PropertyDeed",    label: "سند الملكية" },
  { value: "Other",            label: "مستند آخر" },
];

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("ar-SY", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return s; }
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.Draft;
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 11px",
      borderRadius: 20,
      fontSize: "0.75rem",
      fontWeight: 600,
      backgroundColor: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      letterSpacing: "0.01em",
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── File upload document form ──────────────────────────────────────────────────

function AddDocumentForm({
  requestId,
  onAdded,
  onCancel,
}: {
  requestId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [docType, setDocType]   = useState("NationalId");
  const [file, setFile]         = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX_MB = 10;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`حجم الملف يتجاوز ${MAX_MB} ميجابايت`);
      return;
    }
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowed.includes(f.type)) {
      setError("نوع الملف غير مدعوم. المدعومة: JPG، PNG، PDF");
      return;
    }
    setError("");
    setFile(f);
  }

  async function handleUploadAndAdd() {
    if (!file) { setError("يرجى اختيار ملف أولاً"); return; }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.upload<{ url: string }>("/upload/document", formData);
      await api.post(`/verification/requests/${requestId}/documents`, {
        documentType: docType,
        fileName: file.name,
        fileUrl: uploadRes.url,
        mimeType: file.type,
      });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onAdded();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: "1.1rem 1.25rem",
    }}>
      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.9rem" }}>
        إضافة مستند جديد
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ fontSize: "0.78rem", color: "#475569", display: "block", marginBottom: 5, fontWeight: 500 }}>
          نوع المستند
        </label>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          style={{
            width: "100%",
            border: "1px solid #cbd5e1",
            borderRadius: 7,
            padding: "0.45rem 0.75rem",
            fontSize: "0.85rem",
            color: "#1e293b",
            background: "#fff",
            outline: "none",
          }}
        >
          {DOC_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "0.9rem" }}>
        <label style={{ fontSize: "0.78rem", color: "#475569", display: "block", marginBottom: 5, fontWeight: 500 }}>
          الملف (JPG / PNG / PDF — بحد أقصى {MAX_MB} ميجابايت)
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? "var(--color-primary)" : "#cbd5e1"}`,
            borderRadius: 8,
            padding: "1rem",
            textAlign: "center",
            cursor: "pointer",
            background: file ? "#f0fdf4" : "#fff",
            transition: "all 0.15s",
          }}
        >
          {file ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
                stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span style={{ fontSize: "0.83rem", color: "#166534", fontWeight: 500 }}>{file.name}</span>
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                ({(file.size / 1024).toFixed(0)} KB)
              </span>
            </div>
          ) : (
            <div>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none"
                stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ display: "block", margin: "0 auto 0.4rem" }}>
                <polyline points="16 16 12 12 8 16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
              <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                اضغط لاختيار ملف من جهازك
              </div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
                JPG · PNG · PDF
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        {file && (
          <button
            onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
            style={{
              marginTop: 6,
              fontSize: "0.75rem",
              color: "#94a3b8",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            إزالة الملف
          </button>
        )}
      </div>

      {error && <InlineBanner message={error} />}

      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "0.45rem 1rem",
            border: "1px solid #cbd5e1",
            borderRadius: 7,
            background: "#fff",
            color: "#64748b",
            fontSize: "0.82rem",
            cursor: "pointer",
          }}
        >
          إلغاء
        </button>
        <button
          onClick={handleUploadAndAdd}
          disabled={uploading || !file}
          style={{
            padding: "0.45rem 1.25rem",
            background: "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: 7,
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: (uploading || !file) ? "not-allowed" : "pointer",
            opacity: (uploading || !file) ? 0.65 : 1,
          }}
        >
          {uploading ? "جاري الرفع…" : "رفع وإضافة"}
        </button>
      </div>
    </div>
  );
}

// ── Confirm modal ──────────────────────────────────────────────────────────────

function ConfirmModal({
  message,
  confirmLabel,
  loading,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.35)",
    }}>
      <div style={{
        background: "#fff", borderRadius: 14, padding: "1.75rem 2rem",
        maxWidth: 380, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
      }}>
        <div style={{ fontSize: "1rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.5rem" }}>
          تأكيد الحذف
        </div>
        <div style={{ fontSize: "0.88rem", color: "#64748b", lineHeight: 1.6, marginBottom: "1.25rem" }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "0.45rem 1rem",
              border: "1px solid #e2e8f0",
              borderRadius: 7,
              background: "#fff",
              color: "#64748b",
              fontSize: "0.84rem",
              cursor: "pointer",
            }}
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "0.45rem 1.25rem",
              background: "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 7,
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "جاري الحذف…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Document row (light) ───────────────────────────────────────────────────────

function DocRow({ doc }: { doc: VDocResponse }) {
  const docLabel = DOC_TYPE_OPTIONS.find((o) => o.value === doc.documentType)?.label ?? doc.documentType;
  const isPdf    = doc.mimeType === "application/pdf" || doc.fileUrl?.endsWith(".pdf");

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 8,
      padding: "0.55rem 0.85rem",
      gap: "0.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
        {isPdf ? (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
            stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        ) : (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
            stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.82rem", color: "#1e293b", fontWeight: 500 }}>{docLabel}</div>
          <div style={{
            fontSize: "0.71rem", color: "#94a3b8",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180,
          }}>
            {doc.fileName}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        {doc.status === "Accepted" && (
          <span style={{ fontSize: "0.72rem", color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "1px 8px" }}>مقبول</span>
        )}
        {doc.status === "Rejected" && (
          <span style={{ fontSize: "0.72rem", color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "1px 8px" }}>مرفوض</span>
        )}
        {doc.fileUrl && (
          <a
            href={doc.fileUrl.startsWith("http") ? doc.fileUrl : `${process.env.NEXT_PUBLIC_API_URL || ""}${doc.fileUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.77rem", color: "#0369a1",
              textDecoration: "none",
              padding: "2px 9px",
              border: "1px solid #bae6fd",
              borderRadius: 6,
              background: "#f0f9ff",
            }}
          >
            عرض
          </a>
        )}
      </div>
    </div>
  );
}

// ── Request card ──────────────────────────────────────────────────────────────

function RequestCard({
  summary,
  onRefresh,
}: {
  summary: VRequestSummary;
  onRefresh: () => void;
}) {
  const [detail, setDetail]         = useState<VRequestResponse | null>(null);
  const [loading, setLoading]       = useState(false);
  const [expanded, setExpanded]     = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  const typeLabel  = TYPE_OPTIONS.find((o) => o.value === summary.verificationType)?.label ?? summary.verificationType;
  const isDraft    = summary.status === "Draft";
  const canAddDoc  = isDraft || summary.status === "NeedsMoreInfo";
  const canSubmit  = isDraft;

  async function loadDetail() {
    if (detail) { setExpanded((v) => !v); return; }
    setLoading(true);
    try {
      const res: VRequestResponse = await api.get(`/verification/requests/${summary.id}`);
      setDetail(res);
      setExpanded(true);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (detail && detail.documents.length === 0) {
      setError("لا يمكن إرسال الطلب بدون إرفاق مستندات");
      return;
    }
    setSubmitting(true); setError(""); setSuccess("");
    try {
      const res: VRequestResponse = await api.post(`/verification/requests/${summary.id}/submit`, {});
      setDetail(res);
      setSuccess("تم تقديم الطلب بنجاح، سيتم مراجعته من قبل الإدارة.");
      onRefresh();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true); setError("");
    try {
      await api.delete(`/verification/requests/${summary.id}`);
      setShowConfirm(false);
      onRefresh();
    } catch (e) {
      setError(normalizeError(e));
      setShowConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  function handleDocAdded() {
    setShowAddDoc(false);
    api.get<VRequestResponse>(`/verification/requests/${summary.id}`)
      .then((res) => setDetail(res))
      .catch(() => null);
    onRefresh();
  }

  return (
    <>
      {showConfirm && (
        <ConfirmModal
          message="سيتم حذف المسودة ومستنداتها بشكل نهائي. هل أنت متأكد؟"
          confirmLabel="نعم، احذف المسودة"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {/* Card header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.9rem 1.1rem",
          gap: "0.75rem",
        }}>
          <button
            onClick={loadDetail}
            style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              background: "none", border: "none", cursor: "pointer", padding: 0,
              textAlign: "right", flex: 1, minWidth: 0,
            }}
          >
            <StatusBadge status={summary.status} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>{typeLabel}</div>
              <div style={{ fontSize: "0.73rem", color: "#94a3b8", marginTop: 1 }}>
                {summary.submittedAt
                  ? `تاريخ التقديم: ${fmtDate(summary.submittedAt)}`
                  : `تاريخ الإنشاء: ${fmtDate(summary.createdAt)}`}
                {" · "}{summary.documentCount} مستند
              </div>
            </div>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            {isDraft && (
              <button
                onClick={() => setShowConfirm(true)}
                title="حذف المسودة"
                style={{
                  padding: "5px 10px",
                  border: "1px solid #fecaca",
                  borderRadius: 7,
                  background: "#fef2f2",
                  color: "#dc2626",
                  fontSize: "0.77rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                حذف
              </button>
            )}
            <Link
              href={`/dashboard/verification/${summary.id}`}
              style={{
                padding: "5px 12px",
                border: "1px solid #bae6fd",
                borderRadius: 7,
                background: "#f0f9ff",
                color: "#0369a1",
                fontSize: "0.77rem",
                fontWeight: 500,
                textDecoration: "none",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              فتح الطلب
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div style={{
            borderTop: "1px solid #e2e8f0",
            padding: "1rem 1.1rem",
            background: "#fafafa",
          }}>
            {loading && (
              <div style={{ fontSize: "0.84rem", color: "#94a3b8", padding: "0.5rem 0" }}>جاري التحميل…</div>
            )}

            {error && <InlineBanner message={error} />}
            {success && <InlineBanner message={success} />}

            {detail && (
              <>
                {/* Draft status badge */}
                {isDraft && (
                  <div style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: 8,
                    padding: "0.65rem 1rem",
                    marginBottom: "0.85rem",
                    fontSize: "0.83rem",
                    color: "#92400e",
                    fontWeight: 600,
                  }}>
                    🟡 حالة الطلب: مسودة (لم يتم إرساله بعد)
                  </div>
                )}

                {/* Rejection reason */}
                {detail.rejectionReason && (
                  <div style={{
                    background: "#fef2f2", border: "1px solid #fecaca",
                    borderRadius: 8, padding: "0.65rem 0.9rem", marginBottom: "0.85rem",
                  }}>
                    <div style={{ fontSize: "0.73rem", color: "#991b1b", fontWeight: 600, marginBottom: 3 }}>
                      سبب الرفض
                    </div>
                    <div style={{ fontSize: "0.83rem", color: "#7f1d1d" }}>{detail.rejectionReason}</div>
                  </div>
                )}

                {/* Admin notes */}
                {detail.adminNotes && (
                  <div style={{
                    background: "#fffbeb", border: "1px solid #fde68a",
                    borderRadius: 8, padding: "0.65rem 0.9rem", marginBottom: "0.85rem",
                  }}>
                    <div style={{ fontSize: "0.73rem", color: "#92400e", fontWeight: 600, marginBottom: 3 }}>
                      ملاحظات الإدارة
                    </div>
                    <div style={{ fontSize: "0.83rem", color: "#78350f" }}>{detail.adminNotes}</div>
                  </div>
                )}

                {/* User notes */}
                {detail.userNotes && (
                  <div style={{ marginBottom: "0.85rem" }}>
                    <div style={{ fontSize: "0.73rem", color: "#64748b", fontWeight: 500, marginBottom: 3 }}>ملاحظاتي</div>
                    <div style={{ fontSize: "0.83rem", color: "#475569" }}>{detail.userNotes}</div>
                  </div>
                )}

                {/* Documents */}
                <div style={{ marginBottom: canAddDoc ? "0.75rem" : 0 }}>
                  <div style={{
                    fontSize: "0.78rem", fontWeight: 600, color: "#64748b",
                    marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.03em",
                  }}>
                    المستندات المرفقة ({detail.documents.length})
                  </div>
                  {detail.documents.length === 0 ? (
                    <div style={{
                      background: "#f8fafc", border: "1px dashed #cbd5e1",
                      borderRadius: 8, padding: "0.85rem", textAlign: "center",
                      fontSize: "0.82rem", color: "#94a3b8",
                    }}>
                      لم يتم إرفاق أي مستندات بعد
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      {detail.documents.map((doc) => <DocRow key={doc.id} doc={doc} />)}
                    </div>
                  )}
                </div>

                {/* Add document form */}
                {canAddDoc && (
                  <>
                    {!showAddDoc ? (
                      <button
                        onClick={() => setShowAddDoc(true)}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "0.4rem 0.9rem",
                          border: "1px dashed #cbd5e1",
                          borderRadius: 7,
                          background: "#fff",
                          color: "#475569",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          marginBottom: canSubmit ? "0.75rem" : 0,
                        }}
                      >
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        إضافة مستند من جهازك
                      </button>
                    ) : (
                      <div style={{ marginBottom: canSubmit ? "0.75rem" : 0 }}>
                        <AddDocumentForm
                          requestId={summary.id}
                          onAdded={handleDocAdded}
                          onCancel={() => setShowAddDoc(false)}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Submit */}
                {canSubmit && !showAddDoc && (
                  <div style={{
                    borderTop: "2px solid #e2e8f0",
                    paddingTop: "1rem",
                    marginTop: "0.25rem",
                    display: "flex", flexDirection: "column", gap: "0.6rem",
                  }}>
                    {detail.documents.length === 0 && (
                      <div style={{
                        background: "#fef3c7",
                        border: "1px solid #fcd34d",
                        borderRadius: 8,
                        padding: "0.6rem 0.9rem",
                        fontSize: "0.82rem",
                        color: "#92400e",
                        fontWeight: 500,
                      }}>
                        ⚠️ لا يمكن إرسال الطلب بدون إرفاق مستندات — أضف مستنداً واحداً على الأقل أولاً
                      </div>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || detail.documents.length === 0}
                      style={{
                        padding: "0.75rem 2rem",
                        background: "var(--color-primary)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        fontSize: "0.98rem",
                        fontWeight: 700,
                        cursor: (submitting || detail.documents.length === 0) ? "not-allowed" : "pointer",
                        opacity: (submitting || detail.documents.length === 0) ? 0.55 : 1,
                        boxShadow: detail.documents.length > 0 ? "0 3px 10px rgba(0,114,188,0.25)" : "none",
                        display: "flex", alignItems: "center", gap: "0.5rem",
                        alignSelf: "flex-start",
                        transition: "opacity 0.15s",
                      }}
                    >
                      {submitting ? "جاري التقديم…" : "📤 تقديم الطلب للمراجعة"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── New request form ───────────────────────────────────────────────────────────

// ── Inline file drop zone used inside NewRequestForm ──────────────────────────

const UPLOAD_MAX_MB = 5;
const UPLOAD_ACCEPT = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

function FileDropZone({
  label,
  required,
  file,
  onChange,
  onRemove,
  validationError,
}: {
  label: string;
  required: boolean;
  file: File | null;
  onChange: (f: File) => void;
  onRemove: () => void;
  validationError?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > UPLOAD_MAX_MB * 1024 * 1024) return;
    if (!UPLOAD_ACCEPT.includes(f.type)) return;
    onChange(f);
  }

  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: 5 }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
        <span style={{ fontWeight: 400, color: "#94a3b8", marginRight: 4 }}>
          (JPG · PNG · PDF · حد {UPLOAD_MAX_MB} MB)
        </span>
      </div>

      {/* Drop / click zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (!f) return;
          if (f.size > UPLOAD_MAX_MB * 1024 * 1024) return;
          if (!UPLOAD_ACCEPT.includes(f.type)) return;
          onChange(f);
        }}
        style={{
          border: `2px dashed ${validationError ? "#ef4444" : file ? "var(--color-primary)" : "#cbd5e1"}`,
          borderRadius: 9,
          padding: "0.85rem 1rem",
          textAlign: "center",
          cursor: "pointer",
          background: file ? "#f0fdf4" : validationError ? "#fef2f2" : "#fff",
          transition: "all 0.15s",
        }}
      >
        {file ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
              stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span style={{ fontSize: "0.82rem", color: "#166534", fontWeight: 500 }}>{file.name}</span>
            <span style={{ fontSize: "0.71rem", color: "#64748b" }}>
              ({(file.size / 1024).toFixed(0)} KB)
            </span>
          </div>
        ) : (
          <div>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none"
              stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ display: "block", margin: "0 auto 0.35rem" }}>
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
              اسحب الملف هنا أو اضغط للاختيار
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        onChange={handleChange}
        style={{ display: "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 20, marginTop: 3 }}>
        {validationError ? (
          <span style={{ fontSize: "0.72rem", color: "#ef4444" }}>{validationError}</span>
        ) : <span />}
        {file && (
          <button
            type="button"
            onClick={onRemove}
            style={{ fontSize: "0.72rem", color: "#94a3b8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
          >
            إزالة الملف
          </button>
        )}
      </div>
    </div>
  );
}

function NewRequestForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [type, setType]             = useState("Identity");
  const [notes, setNotes]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [savePhase, setSavePhase]   = useState<"idle" | "creating" | "uploading" | "done">("idle");
  const [error, setError]           = useState("");

  // ── Document files ──────────────────────────────────────────────────────────
  const [identityDocType, setIdentityDocType]     = useState("NationalId");
  const [identityFile, setIdentityFile]           = useState<File | null>(null);
  const [identityFileErr, setIdentityFileErr]     = useState("");

  const [businessDocType, setBusinessDocType]     = useState("CommercialRecord");
  const [businessFile, setBusinessFile]           = useState<File | null>(null);
  const [businessFileErr, setBusinessFileErr]     = useState("");

  const needsIdentity = type === "Identity" || type === "Both";
  const needsBusiness = type === "Business" || type === "Both";

  // Identity doc type options
  const IDENTITY_DOC_TYPES = [
    { value: "NationalId",    label: "الهوية الوطنية" },
    { value: "Passport",      label: "جواز السفر" },
    { value: "DriverLicense", label: "رخصة القيادة" },
  ];

  // Business doc type options
  const BUSINESS_DOC_TYPES = [
    { value: "CommercialRecord", label: "السجل التجاري" },
    { value: "TaxCertificate",  label: "الشهادة الضريبية" },
  ];

  function getSavePhaseLabel() {
    if (savePhase === "creating")  return "جاري الحفظ…";
    if (savePhase === "uploading") return "جاري رفع المستندات…";
    return "حفظ ومتابعة";
  }

  async function uploadAndAddDocument(requestId: string, file: File, docType: string) {
    const formData = new FormData();
    formData.append("file", file);
    const { url } = await api.upload<{ url: string }>("/upload/document", formData);
    await api.post(`/verification/requests/${requestId}/documents`, {
      documentType: docType,
      fileName:     file.name,
      fileUrl:      url,
      mimeType:     file.type,
    });
    console.log(`[Verification] uploaded ${docType}:`, url);
  }

  async function handleCreate() {
    // ── Client-side validation ──────────────────────────────────────────────
    let valid = true;
    if (needsIdentity && !identityFile) {
      setIdentityFileErr("يرجى رفع مستند الهوية (هوية وطنية أو جواز سفر أو رخصة)");
      valid = false;
    } else {
      setIdentityFileErr("");
    }
    if (needsBusiness && !businessFile) {
      setBusinessFileErr("يرجى رفع مستند السجل التجاري أو الشهادة الضريبية");
      valid = false;
    } else {
      setBusinessFileErr("");
    }
    if (!valid) return;

    setSaving(true);
    setError("");
    try {
      // Step 1: Create the request (Draft)
      setSavePhase("creating");
      const created = await api.post<{ id: string }>("/verification/requests", {
        verificationType: type,
        userNotes: notes.trim() || undefined,
      });
      console.log("[Verification] created request:", created.id);

      // Step 2: Upload documents
      setSavePhase("uploading");
      if (needsIdentity && identityFile) {
        await uploadAndAddDocument(created.id, identityFile, identityDocType);
      }
      if (needsBusiness && businessFile) {
        await uploadAndAddDocument(created.id, businessFile, businessDocType);
      }

      setSavePhase("done");
      onCreated();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
      setSavePhase("idle");
    }
  }

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 14,
      padding: "1.5rem",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>
        طلب توثيق جديد
      </div>
      <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "1.25rem" }}>
        حدد نوع التوثيق وارفع المستندات المطلوبة
      </div>

      {/* ── Type selection ── */}
      <div style={{ marginBottom: "1.1rem" }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>
          نوع التوثيق
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {TYPE_OPTIONS.map((o) => (
            <label
              key={o.value}
              style={{
                display: "flex", alignItems: "flex-start", gap: "0.7rem",
                cursor: "pointer",
                background: type === o.value ? "#f0fdf4" : "#f8fafc",
                border: `1.5px solid ${type === o.value ? "var(--color-primary)" : "#e2e8f0"}`,
                borderRadius: 9,
                padding: "0.65rem 0.9rem",
                transition: "all 0.15s",
              }}
            >
              <input
                type="radio"
                name="verType"
                value={o.value}
                checked={type === o.value}
                onChange={() => { setType(o.value); setIdentityFileErr(""); setBusinessFileErr(""); }}
                style={{ accentColor: "var(--color-primary)", marginTop: 2 }}
              />
              <div>
                <div style={{ fontSize: "0.86rem", fontWeight: 600, color: type === o.value ? "#166534" : "#1e293b" }}>
                  {o.label}
                </div>
                <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 1 }}>{o.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ── Identity document upload ── */}
      {needsIdentity && (
        <div style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: "1rem 1.1rem",
          marginBottom: "0.85rem",
        }}>
          <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>🪪</span> مستند إثبات الهوية
          </div>

          {/* Identity doc type selector */}
          <div style={{ marginBottom: "0.65rem" }}>
            <label style={{ fontSize: "0.76rem", color: "#475569", display: "block", marginBottom: 4, fontWeight: 500 }}>
              نوع المستند
            </label>
            <select
              value={identityDocType}
              onChange={(e) => setIdentityDocType(e.target.value)}
              style={{
                width: "100%", border: "1px solid #cbd5e1", borderRadius: 7,
                padding: "0.4rem 0.7rem", fontSize: "0.83rem", color: "#1e293b",
                background: "#fff", outline: "none",
              }}
            >
              {IDENTITY_DOC_TYPES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <FileDropZone
            label="الملف"
            required
            file={identityFile}
            onChange={(f) => { setIdentityFile(f); setIdentityFileErr(""); }}
            onRemove={() => { setIdentityFile(null); }}
            validationError={identityFileErr}
          />
        </div>
      )}

      {/* ── Business document upload ── */}
      {needsBusiness && (
        <div style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: "1rem 1.1rem",
          marginBottom: "0.85rem",
        }}>
          <div style={{ fontSize: "0.83rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>🏢</span> مستند السجل التجاري
          </div>

          {/* Business doc type selector */}
          <div style={{ marginBottom: "0.65rem" }}>
            <label style={{ fontSize: "0.76rem", color: "#475569", display: "block", marginBottom: 4, fontWeight: 500 }}>
              نوع المستند
            </label>
            <select
              value={businessDocType}
              onChange={(e) => setBusinessDocType(e.target.value)}
              style={{
                width: "100%", border: "1px solid #cbd5e1", borderRadius: 7,
                padding: "0.4rem 0.7rem", fontSize: "0.83rem", color: "#1e293b",
                background: "#fff", outline: "none",
              }}
            >
              {BUSINESS_DOC_TYPES.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <FileDropZone
            label="الملف"
            required
            file={businessFile}
            onChange={(f) => { setBusinessFile(f); setBusinessFileErr(""); }}
            onRemove={() => { setBusinessFile(null); }}
            validationError={businessFileErr}
          />
        </div>
      )}

      {/* ── Notes ── */}
      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: 5 }}>
          ملاحظات إضافية <span style={{ fontWeight: 400, color: "#94a3b8" }}>(اختياري)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="معلومات تريد إخبار الإدارة بها…"
          style={{
            width: "100%", border: "1px solid #e2e8f0",
            borderRadius: 8, padding: "0.5rem 0.75rem",
            fontSize: "0.84rem", color: "#1e293b",
            resize: "vertical", boxSizing: "border-box",
            outline: "none",
          }}
        />
      </div>

      {error && <InlineBanner message={error} />}

      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: "0.5rem 1.1rem",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#fff",
            color: "#64748b",
            fontSize: "0.85rem",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.5 : 1,
          }}
        >
          إلغاء
        </button>
        <button
          onClick={handleCreate}
          disabled={saving}
          style={{
            padding: "0.5rem 1.5rem",
            background: "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: "0.85rem",
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? getSavePhaseLabel() : "حفظ ومتابعة"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UserVerificationPage() {
  useProtectedRoute();

  const [requests, setRequests]   = useState<VRequestSummary[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showNew, setShowNew]     = useState(false);
  const [savedBanner, setSavedBanner] = useState("");

  const load = useCallback(async () => {
    setFetching(true); setFetchError("");
    try {
      const res: PagedResult<VRequestSummary> = await api.get("/verification/requests/my");
      setRequests(res.items ?? []);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleCreated() {
    setShowNew(false);
    load();
    setSavedBanner("تم حفظ الطلب كمسودة بنجاح ✅  يمكنك الآن مراجعة الطلب وإرساله للمراجعة");
    setTimeout(() => setSavedBanner(""), 7000);
  }

  // Business rule: only block new request if there's already a Draft (can't have two drafts)
  const hasActiveDraft = requests.some((r) => r.status === "Draft");
  const canCreateNew   = !hasActiveDraft;

  return (
    <div
      style={{
        direction: "rtl",
        padding: "1.5rem",
        maxWidth: 720,
        margin: "0 auto",
        fontFamily: "var(--font-arabic)",
      }}
    >
      <DashboardBackLink href="/dashboard" label="العودة للوحة التحكم" />

      {/* Page header */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem",
        marginBottom: "1.5rem",
      }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
            التوثيق والهوية
          </h1>
          <p style={{ fontSize: "0.83rem", color: "#94a3b8", margin: "0.3rem 0 0" }}>
            تقديم مستندات التوثيق للحصول على شارة المستخدم الموثَّق
          </p>
        </div>

        {!showNew && (
          <button
            onClick={() => {
              if (canCreateNew) {
                setShowNew(true);
              }
            }}
            title={hasActiveDraft ? "لديك مسودة طلب لم تُقدَّم بعد" : undefined}
            style={{
              padding: "0.5rem 1.25rem",
              background: canCreateNew ? "var(--color-primary)" : "#e2e8f0",
              color: canCreateNew ? "#fff" : "#94a3b8",
              border: "none",
              borderRadius: 8,
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: canCreateNew ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            طلب جديد
          </button>
        )}
      </div>

      {/* Info card */}
      <div style={{
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: 10,
        padding: "0.85rem 1.1rem",
        marginBottom: "1.35rem",
        fontSize: "0.83rem",
        color: "#1d4ed8",
        lineHeight: 1.65,
      }}>
        <strong>كيفية التوثيق:</strong> أنشئ طلباً ← أرفق المستندات من جهازك ← قدّم الطلب.
        ستراجع الإدارة طلبك وتُخبرك بالنتيجة.
        {hasActiveDraft && (
          <span style={{ display: "block", marginTop: 5, color: "#92400e", background: "#fffbeb", borderRadius: 6, padding: "3px 8px", border: "1px solid #fde68a", width: "fit-content" }}>
            لديك مسودة طلب معلّقة — أضف المستندات وقدّمها أولاً قبل إنشاء طلب جديد
          </span>
        )}
      </div>

      {fetchError && <InlineBanner message={fetchError} />}

      {savedBanner && (
        <div style={{
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: 10,
          padding: "0.85rem 1.1rem",
          marginBottom: "1.1rem",
          fontSize: "0.88rem",
          color: "#166534",
          fontWeight: 500,
          lineHeight: 1.6,
        }}>
          {savedBanner}
        </div>
      )}

      {/* New request form */}
      {showNew && (
        <div style={{ marginBottom: "1.25rem" }}>
          <NewRequestForm onCreated={handleCreated} onCancel={() => setShowNew(false)} />
        </div>
      )}

      {/* Requests list */}
      {fetching ? (
        <div style={{
          textAlign: "center", padding: "3rem",
          color: "#94a3b8", fontSize: "0.88rem",
        }}>
          جاري التحميل…
        </div>
      ) : requests.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "3rem 2rem",
          background: "#fff",
          border: "1px dashed #cbd5e1",
          borderRadius: 14,
        }}>
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none"
            stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ display: "block", margin: "0 auto 0.75rem" }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#64748b", marginBottom: 6 }}>
            لا توجد طلبات توثيق
          </div>
          <div style={{ fontSize: "0.83rem", color: "#94a3b8", marginBottom: "1rem" }}>
            أنشئ طلبك الأول وارفع المستندات المطلوبة
          </div>
          {!showNew && (
            <button
              onClick={() => setShowNew(true)}
              style={{
                padding: "0.5rem 1.5rem",
                background: "var(--color-primary)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ابدأ طلباً جديداً
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {requests.map((req) => (
            <RequestCard key={req.id} summary={req} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}
