"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { api, normalizeError } from "@/lib/api";
import { resolveFileUrl } from "@/lib/api-config";
import {
  DOCUMENT_TYPE_OPTIONS,
  DOCUMENT_TYPE_LABELS,
  isValidDocumentType,
} from "@/lib/document-types";

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

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  Draft:         "مسودة",
  Submitted:     "مُقدَّم",
  Pending:       "مُقدَّم",
  UnderReview:   "قيد المراجعة",
  NeedsMoreInfo: "يحتاج معلومات إضافية",
  Approved:      "مقبول ✓",
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

const TYPE_LABELS: Record<string, string> = {
  Identity: "توثيق الهوية الشخصية",
  Business: "توثيق السجل التجاري",
  Both:     "هوية + سجل تجاري معاً",
};


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
      display: "inline-block", padding: "4px 14px", borderRadius: 20,
      fontSize: "0.78rem", fontWeight: 600,
      backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Document row ──────────────────────────────────────────────────────────────

function DocRow({
  doc,
  canRemove,
  onRemove,
  removing,
}: {
  doc: VDocResponse;
  canRemove: boolean;
  onRemove: (id: string) => void;
  removing: boolean;
}) {
  const docLabel = DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType;
  const isPdf    = doc.mimeType === "application/pdf" || doc.fileUrl?.endsWith(".pdf");
  const fileUrl  = resolveFileUrl(doc.fileUrl);

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "#f8fafc", border: "1px solid #e2e8f0",
      borderRadius: 9, padding: "0.65rem 0.9rem", gap: "0.5rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
        {isPdf ? (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
            stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        ) : (
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
            stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "#1e293b" }}>{docLabel}</div>
          <div style={{
            fontSize: "0.73rem", color: "#94a3b8",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200,
          }}>
            {doc.fileName}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
        {doc.status === "Accepted" && (
          <span style={{ fontSize: "0.72rem", color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "2px 8px" }}>مقبول</span>
        )}
        {doc.status === "Rejected" && (
          <span style={{ fontSize: "0.72rem", color: "#991b1b", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "2px 8px" }}>مرفوض</span>
        )}
        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.77rem", color: "#0369a1",
              textDecoration: "none",
              padding: "3px 10px",
              border: "1px solid #bae6fd",
              borderRadius: 6,
              background: "#f0f9ff",
            }}
          >
            عرض
          </a>
        ) : (
          <span style={{
            fontSize: "0.73rem", color: "#94a3b8",
            padding: "3px 10px",
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            background: "#f8fafc",
          }}>
            الرابط غير متوفر
          </span>
        )}
        {canRemove && (
          <button
            onClick={() => onRemove(doc.id)}
            disabled={removing}
            title="حذف هذا المستند"
            style={{
              padding: "3px 8px",
              border: "1px solid #fecaca",
              borderRadius: 6,
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: "0.77rem",
              cursor: removing ? "not-allowed" : "pointer",
              opacity: removing ? 0.6 : 1,
            }}
          >
            حذف
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add document form ─────────────────────────────────────────────────────────

function AddDocumentForm({
  requestId,
  onAdded,
  onCancel,
}: {
  requestId: string;
  onAdded: (updated: VRequestResponse) => void;
  onCancel: () => void;
}) {
  const [docType, setDocType]     = useState("NationalId");
  const [file, setFile]           = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX_MB = 10;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) { setError(`حجم الملف يتجاوز ${MAX_MB} ميجابايت`); return; }
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowed.includes(f.type)) { setError("نوع الملف غير مدعوم. المدعومة: JPG، PNG، PDF"); return; }
    setError(""); setFile(f);
  }

  async function handleUploadAndAdd() {
    if (!file) { setError("يرجى اختيار ملف أولاً"); return; }
    if (!isValidDocumentType(docType)) { setError("نوع المستند غير صالح"); return; }
    setUploading(true); setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.upload<{ url: string }>("/upload/document", formData);
      const updated = await api.post<VRequestResponse>(`/verification/requests/${requestId}/documents`, {
        documentType: docType,
        fileName: file.name,
        fileUrl: uploadRes.url,
        mimeType: file.type,
      });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onAdded(updated);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{
      background: "#f8fafc", border: "1px solid #e2e8f0",
      borderRadius: 10, padding: "1.1rem 1.25rem",
    }}>
      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.85rem" }}>
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
            width: "100%", border: "1px solid #cbd5e1", borderRadius: 7,
            padding: "0.45rem 0.75rem", fontSize: "0.85rem", color: "#1e293b", background: "#fff",
          }}
        >
          {DOCUMENT_TYPE_OPTIONS.map((o) => (
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
            borderRadius: 8, padding: "1.1rem",
            textAlign: "center", cursor: "pointer",
            background: file ? "#f0fdf4" : "#fff", transition: "all 0.15s",
          }}
        >
          {file ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span style={{ fontSize: "0.84rem", color: "#166534", fontWeight: 500 }}>{file.name}</span>
              <span style={{ fontSize: "0.73rem", color: "#64748b" }}>({(file.size / 1024).toFixed(0)} KB)</span>
            </div>
          ) : (
            <div>
              <svg width={26} height={26} viewBox="0 0 24 24" fill="none"
                stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ display: "block", margin: "0 auto 0.35rem" }}>
                <polyline points="16 16 12 12 8 16" />
                <line x1="12" y1="12" x2="12" y2="21" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
              <div style={{ fontSize: "0.82rem", color: "#64748b" }}>اضغط لاختيار ملف من جهازك</div>
              <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>JPG · PNG · PDF</div>
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
            style={{ marginTop: 5, fontSize: "0.74rem", color: "#94a3b8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
          >
            إزالة الملف
          </button>
        )}
      </div>

      {error && <InlineBanner message={error} />}

      <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "0.45rem 1rem", border: "1px solid #cbd5e1", borderRadius: 7, background: "#fff", color: "#64748b", fontSize: "0.82rem", cursor: "pointer" }}>
          إلغاء
        </button>
        <button
          onClick={handleUploadAndAdd}
          disabled={uploading || !file}
          style={{
            padding: "0.45rem 1.25rem", background: "var(--color-primary)",
            color: "#fff", border: "none", borderRadius: 7,
            fontSize: "0.82rem", fontWeight: 600,
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
  danger = true,
}: {
  message: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
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
        <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.5rem" }}>
          تأكيد الإجراء
        </div>
        <div style={{ fontSize: "0.88rem", color: "#64748b", lineHeight: 1.65, marginBottom: "1.25rem" }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "0.45rem 1rem", border: "1px solid #e2e8f0", borderRadius: 7, background: "#fff", color: "#64748b", fontSize: "0.84rem", cursor: "pointer" }}>
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: "0.45rem 1.25rem",
              background: danger ? "#dc2626" : "var(--color-primary)",
              color: "#fff", border: "none", borderRadius: 7,
              fontSize: "0.84rem", fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "جاري التنفيذ…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main detail page ──────────────────────────────────────────────────────────

export default function VerificationDetailPage() {
  useProtectedRoute();
  const params = useParams();
  const router = useRouter();
  const id     = params?.id as string;

  const [request, setRequest]       = useState<VRequestResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  const [showAddDoc, setShowAddDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [removingDocId, setRemovingDocId] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm]   = useState(false);

  // Notes state
  const [notes, setNotes]             = useState("");
  const [savedNotes, setSavedNotes]   = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesBanner, setNotesBanner] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const notesDirty = notes !== savedNotes;

  const isDraft   = request?.status === "Draft";
  const canEdit   = isDraft || request?.status === "NeedsMoreInfo";
  const canSubmit = isDraft;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError("");
    try {
      const res: VRequestResponse = await api.get(`/verification/requests/${id}`);
      setRequest(res);
      const n = res.userNotes ?? "";
      setNotes(n);
      setSavedNotes(n);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveNotes() {
    if (!notesDirty || savingNotes) return;
    const trimmed = notes.trim();
    if (trimmed.length > 1000) {
      setNotesBanner({ type: "err", msg: "الملاحظة لا يمكن أن تتجاوز 1000 حرف" });
      return;
    }
    setSavingNotes(true); setNotesBanner(null);
    try {
      const res: VRequestResponse = await api.put(`/verification/requests/${id}/notes`, { userNotes: trimmed || null });
      setRequest(res);
      const saved = res.userNotes ?? "";
      setNotes(saved);
      setSavedNotes(saved);
      setNotesBanner({ type: "ok", msg: "تم حفظ الملاحظة بنجاح" });
      setTimeout(() => setNotesBanner(null), 3000);
    } catch (e) {
      setNotesBanner({ type: "err", msg: normalizeError(e) });
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true); setError(""); setSuccess("");
    try {
      // Auto-save notes if they changed before submitting
      if (notesDirty && notes.trim() !== (request?.userNotes ?? "")) {
        await api.put(`/verification/requests/${id}/notes`, { userNotes: notes.trim() || null });
      }
      const res: VRequestResponse = await api.post(`/verification/requests/${id}/submit`, {});
      setRequest(res);
      setSuccess("تم تقديم الطلب بنجاح. سيتم مراجعته من قبل الإدارة.");
      setShowSubmitConfirm(false);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/verification/requests/${id}`);
      router.push("/dashboard/verification");
    } catch (e) {
      setError(normalizeError(e));
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleRemoveDoc(docId: string) {
    setRemovingDocId(docId);
    try {
      const updated: VRequestResponse = await api.delete(`/verification/requests/${id}/documents/${docId}`);
      setRequest(updated);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setRemovingDocId(null);
    }
  }

  function handleDocAdded(updated: VRequestResponse) {
    setRequest(updated);
    setShowAddDoc(false);
    setSuccess("تمت إضافة المستند بنجاح.");
  }

  if (loading) {
    return (
      <div style={{ direction: "rtl", padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
        جاري تحميل الطلب…
      </div>
    );
  }

  if (error && !request) {
    return (
      <div style={{ direction: "rtl", padding: "2rem", maxWidth: 600, margin: "0 auto" }}>
        <DashboardBackLink href="/dashboard/verification" label="العودة لطلبات التوثيق" />
        <InlineBanner message={error} />
      </div>
    );
  }

  if (!request) return null;

  const typeLabel = TYPE_LABELS[request.verificationType] ?? request.verificationType;

  return (
    <>
      {showDeleteConfirm && (
        <ConfirmModal
          message="سيتم حذف هذه المسودة ومستنداتها نهائياً. لا يمكن التراجع عن هذا الإجراء."
          confirmLabel="نعم، احذف المسودة"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {showSubmitConfirm && (
        <ConfirmModal
          message="بعد تقديم الطلب لن تتمكن من تعديله. هل تريد المتابعة؟"
          confirmLabel="نعم، قدّم الطلب"
          loading={submitting}
          onConfirm={handleSubmit}
          onCancel={() => setShowSubmitConfirm(false)}
          danger={false}
        />
      )}

      <div style={{
        direction: "rtl", padding: "1.5rem",
        maxWidth: 720, margin: "0 auto",
        fontFamily: "var(--font-arabic)",
      }}>
        <DashboardBackLink href="/dashboard/verification" label="العودة لطلبات التوثيق" />

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem",
          marginBottom: "1.5rem",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                {typeLabel}
              </h1>
              <StatusBadge status={request.status} />
            </div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>
              {request.submittedAt
                ? `تاريخ التقديم: ${fmtDate(request.submittedAt)}`
                : `تاريخ الإنشاء: ${fmtDate(request.createdAt)}`}
              {request.reviewedAt && ` · تاريخ المراجعة: ${fmtDate(request.reviewedAt)}`}
            </div>
          </div>

          {isDraft && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: "0.45rem 1rem",
                border: "1px solid #fecaca",
                borderRadius: 8,
                background: "#fef2f2",
                color: "#dc2626",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              حذف المسودة
            </button>
          )}
        </div>

        {error && <InlineBanner message={error} />}
        {success && <InlineBanner message={success} />}

        {/* Alerts */}
        {request.rejectionReason && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1rem",
          }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#991b1b", marginBottom: 4 }}>سبب الرفض</div>
            <div style={{ fontSize: "0.86rem", color: "#7f1d1d" }}>{request.rejectionReason}</div>
          </div>
        )}

        {request.adminNotes && (
          <div style={{
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1rem",
          }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#92400e", marginBottom: 4 }}>ملاحظات الإدارة</div>
            <div style={{ fontSize: "0.86rem", color: "#78350f" }}>{request.adminNotes}</div>
          </div>
        )}

        {/* Notes card */}
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0",
          borderRadius: 12, padding: "1.1rem 1.25rem",
          marginBottom: "1rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "0.6rem" }}>
            ملاحظاتك للإدارة
          </div>

          {isDraft ? (
            <div>
              <textarea
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setNotesBanner(null); }}
                rows={4}
                maxLength={1000}
                placeholder="اكتب أي ملاحظة تريد إرسالها للإدارة..."
                style={{
                  width: "100%", border: `1px solid ${notesDirty ? "#93c5fd" : "#e2e8f0"}`,
                  borderRadius: 8, padding: "0.55rem 0.8rem",
                  fontSize: "0.85rem", color: "#1e293b",
                  resize: "vertical", boxSizing: "border-box", outline: "none",
                  marginBottom: "0.35rem", lineHeight: 1.7,
                  transition: "border-color 0.15s",
                  background: "#fafbfc",
                  direction: "rtl",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{
                  fontSize: "0.72rem",
                  color: notes.length > 950 ? "#dc2626" : "#94a3b8",
                }}>
                  {notes.length} / 1000
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {notesBanner && (
                    <span style={{
                      fontSize: "0.76rem",
                      color: notesBanner.type === "ok" ? "#166534" : "#dc2626",
                      background: notesBanner.type === "ok" ? "#f0fdf4" : "#fef2f2",
                      border: `1px solid ${notesBanner.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
                      borderRadius: 6, padding: "2px 10px",
                    }}>
                      {notesBanner.msg}
                    </span>
                  )}
                  <button
                    onClick={handleSaveNotes}
                    disabled={!notesDirty || savingNotes}
                    style={{
                      padding: "0.38rem 1.1rem",
                      background: notesDirty ? "var(--color-primary)" : "#e2e8f0",
                      color: notesDirty ? "#fff" : "#94a3b8",
                      border: "none", borderRadius: 7,
                      fontSize: "0.8rem", fontWeight: 600,
                      cursor: notesDirty && !savingNotes ? "pointer" : "not-allowed",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    {savingNotes ? "جاري الحفظ…" : "حفظ الملاحظة"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: "0.86rem",
              color: request.userNotes ? "#475569" : "#cbd5e1",
              fontStyle: request.userNotes ? "normal" : "italic",
              lineHeight: 1.7,
            }}>
              {request.userNotes || "لا توجد ملاحظات"}
            </div>
          )}
        </div>

        {/* Documents card */}
        <div style={{
          background: "#fff", border: "1px solid #e2e8f0",
          borderRadius: 12, padding: "1.1rem 1.25rem",
          marginBottom: "1rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "0.85rem",
          }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
              المستندات المرفقة
              <span style={{ fontSize: "0.78rem", color: "#94a3b8", marginRight: 6, fontWeight: 400 }}>
                ({request.documents.length})
              </span>
            </div>
            {canEdit && !showAddDoc && (
              <button
                onClick={() => setShowAddDoc(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 12px",
                  border: "1px solid #bae6fd",
                  borderRadius: 7,
                  background: "#f0f9ff",
                  color: "#0369a1",
                  fontSize: "0.79rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                إضافة مستند
              </button>
            )}
          </div>

          {request.documents.length === 0 ? (
            <div style={{
              background: "#f8fafc", border: "1px dashed #e2e8f0",
              borderRadius: 9, padding: "1.5rem", textAlign: "center",
              fontSize: "0.85rem", color: "#94a3b8",
            }}>
              <svg width={32} height={32} viewBox="0 0 24 24" fill="none"
                stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ display: "block", margin: "0 auto 0.5rem" }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              لم يتم إرفاق أي مستندات بعد
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {request.documents.map((doc) => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  canRemove={canEdit}
                  onRemove={handleRemoveDoc}
                  removing={removingDocId === doc.id}
                />
              ))}
            </div>
          )}

          {showAddDoc && (
            <div style={{ marginTop: "0.85rem" }}>
              <AddDocumentForm
                requestId={id}
                onAdded={handleDocAdded}
                onCancel={() => setShowAddDoc(false)}
              />
            </div>
          )}
        </div>

        {/* Submit section */}
        {canSubmit && (
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 12, padding: "1.1rem 1.25rem",
          }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#166534", marginBottom: 4 }}>
              تقديم الطلب للمراجعة
            </div>
            <div style={{ fontSize: "0.8rem", color: "#15803d", marginBottom: "0.85rem", lineHeight: 1.6 }}>
              بعد التقديم لن تتمكن من التعديل. تأكد من رفع جميع المستندات المطلوبة.
            </div>
            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={request.documents.length === 0}
              style={{
                padding: "0.55rem 1.75rem",
                background: "var(--color-primary)",
                color: "#fff", border: "none", borderRadius: 8,
                fontSize: "0.88rem", fontWeight: 700,
                cursor: request.documents.length === 0 ? "not-allowed" : "pointer",
                opacity: request.documents.length === 0 ? 0.55 : 1,
              }}
            >
              تقديم الطلب
            </button>
            {request.documents.length === 0 && (
              <div style={{ fontSize: "0.76rem", color: "#94a3b8", marginTop: 6 }}>
                أرفق مستنداً واحداً على الأقل قبل التقديم
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
