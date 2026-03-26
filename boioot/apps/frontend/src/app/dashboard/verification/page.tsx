"use client";

import { useState, useEffect, useCallback } from "react";
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

interface VRequestSummary {
  id: string;
  verificationType: string;
  status: string;
  documentCount: number;
  submittedAt?: string;
  createdAt: string;
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
  UnderReview:   "قيد المراجعة",
  NeedsMoreInfo: "يحتاج معلومات إضافية",
  Approved:      "مقبول ✓",
  Rejected:      "مرفوض",
  Cancelled:     "ملغى",
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Draft:         { bg: "#111827", text: "#9ca3af", border: "#374151" },
  Submitted:     { bg: "#0f1d2e", text: "#60a5fa", border: "#1e3a5f" },
  UnderReview:   { bg: "#0f1929", text: "#93c5fd", border: "#1c3461" },
  NeedsMoreInfo: { bg: "#1c1600", text: "#fbbf24", border: "#3b2d00" },
  Approved:      { bg: "#052e14", text: "#4ade80", border: "#14532d" },
  Rejected:      { bg: "#1c0000", text: "#f87171", border: "#450a0a" },
  Cancelled:     { bg: "#111827", text: "#4b5563", border: "#1f2937" },
};

const TYPE_OPTIONS = [
  { value: "Identity", label: "توثيق الهوية الشخصية" },
  { value: "Business", label: "توثيق السجل التجاري" },
  { value: "Both",     label: "هوية + سجل تجاري معاً" },
];

const DOC_TYPE_OPTIONS = [
  { value: "NationalId",       label: "الهوية الوطنية" },
  { value: "Passport",         label: "جواز السفر" },
  { value: "DriverLicense",    label: "رخصة القيادة" },
  { value: "CommercialRecord", label: "السجل التجاري" },
  { value: "TaxCertificate",   label: "الشهادة الضريبية" },
  { value: "PropertyDeed",     label: "سند الملكية" },
  { value: "Other",            label: "مستند آخر" },
];

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" }); }
  catch { return s; }
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: "#111827", text: "#9ca3af", border: "#374151" };
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 12px",
      borderRadius: 14,
      fontSize: "0.78rem",
      fontWeight: 600,
      backgroundColor: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Document row ──────────────────────────────────────────────────────────────

function DocRow({ doc }: { doc: VDocResponse }) {
  const docLabel = DOC_TYPE_OPTIONS.find((o) => o.value === doc.documentType)?.label ?? doc.documentType;
  const docStatus = doc.status === "Accepted" ? "مقبول" : doc.status === "Rejected" ? "مرفوض" : "معلّق";
  const docColor = doc.status === "Accepted"
    ? { text: "#4ade80", border: "#14532d" }
    : doc.status === "Rejected"
    ? { text: "#f87171", border: "#450a0a" }
    : { text: "#9ca3af", border: "#374151" };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      backgroundColor: "#1a2332",
      borderRadius: 8,
      padding: "0.6rem 0.9rem",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={docColor.text}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <div>
          <div style={{ fontSize: "0.84rem", color: "#f3f4f6", fontWeight: 500 }}>{docLabel}</div>
          <div style={{ fontSize: "0.71rem", color: "#6b7280" }}>{doc.fileName}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span style={{
          fontSize: "0.72rem", fontWeight: 600,
          color: docColor.text,
          border: `1px solid ${docColor.border}`,
          borderRadius: 10,
          padding: "1px 8px",
        }}>
          {docStatus}
        </span>
        {doc.fileUrl && (
          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "0.74rem", color: "#60a5fa", textDecoration: "none" }}>
            عرض
          </a>
        )}
      </div>
    </div>
  );
}

// ── Add document form ─────────────────────────────────────────────────────────

function AddDocumentForm({
  requestId,
  onAdded,
}: {
  requestId: string;
  onAdded: () => void;
}) {
  const [docType, setDocType] = useState("NationalId");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd() {
    if (!fileUrl.trim() || !fileName.trim()) {
      setError("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post(`/verification/requests/${requestId}/documents`, {
        documentType: docType,
        fileName: fileName.trim(),
        fileUrl: fileUrl.trim(),
      });
      setFileUrl("");
      setFileName("");
      onAdded();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      backgroundColor: "#1f2937",
      borderRadius: 10,
      padding: "1rem",
      border: "1px solid rgba(255,255,255,0.07)",
      marginTop: "1rem",
    }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.75rem" }}>
        إضافة مستند
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
        <div>
          <label style={{ fontSize: "0.71rem", color: "#6b7280", display: "block", marginBottom: 3 }}>
            نوع المستند
          </label>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            style={{
              width: "100%", backgroundColor: "#111827", color: "#f9fafb",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7,
              padding: "0.38rem 0.6rem", fontSize: "0.82rem",
            }}
          >
            {DOC_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: "0.71rem", color: "#6b7280", display: "block", marginBottom: 3 }}>
            اسم الملف
          </label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="مثال: هوية-احمد.jpg"
            style={{
              width: "100%", backgroundColor: "#111827", color: "#f9fafb",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7,
              padding: "0.38rem 0.6rem", fontSize: "0.82rem", boxSizing: "border-box",
            }}
          />
        </div>
      </div>
      <div style={{ marginBottom: "0.6rem" }}>
        <label style={{ fontSize: "0.71rem", color: "#6b7280", display: "block", marginBottom: 3 }}>
          رابط الملف (URL)
        </label>
        <input
          type="text"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          placeholder="https://..."
          style={{
            width: "100%", backgroundColor: "#111827", color: "#f9fafb",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7,
            padding: "0.38rem 0.6rem", fontSize: "0.82rem", boxSizing: "border-box",
          }}
        />
      </div>
      {error && <InlineBanner type="error" message={error} onDismiss={() => setError("")} />}
      <button
        onClick={handleAdd}
        disabled={saving}
        style={{
          padding: "0.4rem 1rem",
          backgroundColor: "#1e3a5f",
          color: "#93c5fd",
          border: "1px solid #1c3461",
          borderRadius: 7,
          fontSize: "0.8rem",
          fontWeight: 600,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "جاري الإضافة…" : "إضافة المستند"}
      </button>
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
  const [detail, setDetail] = useState<VRequestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const typeLabel = TYPE_OPTIONS.find((o) => o.value === summary.verificationType)?.label ?? summary.verificationType;

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
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res: VRequestResponse = await api.post(`/verification/requests/${summary.id}/submit`, {});
      setDetail(res);
      setSuccess("تم تقديم الطلب بنجاح، سيتم مراجعته من قبل الإدارة");
      onRefresh();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSubmitting(false);
    }
  }

  function handleDocAdded() {
    setShowAddDoc(false);
    // Reload detail
    api.get<VRequestResponse>(`/verification/requests/${summary.id}`)
      .then((res) => setDetail(res))
      .catch(() => null);
    onRefresh();
  }

  const canAddDoc = summary.status === "Draft" || summary.status === "NeedsMoreInfo";
  const canSubmit = summary.status === "Draft";
  const sc = STATUS_COLORS[summary.status] ?? { bg: "#111827", text: "#9ca3af", border: "#374151" };

  return (
    <div style={{
      backgroundColor: "#111827",
      border: `1px solid ${sc.border}`,
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* Header row */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.9rem 1.1rem",
          cursor: "pointer",
          backgroundColor: sc.bg,
        }}
        onClick={loadDetail}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <StatusBadge status={summary.status} />
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#f3f4f6" }}>{typeLabel}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>
              {summary.submittedAt ? `تاريخ التقديم: ${fmtDate(summary.submittedAt)}` : `تاريخ الإنشاء: ${fmtDate(summary.createdAt)}`}
              {" · "}{summary.documentCount} مستند
            </div>
          </div>
        </div>
        <svg
          width={16} height={16} viewBox="0 0 24 24" fill="none"
          stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: "1rem 1.1rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {loading && <div style={{ fontSize: "0.82rem", color: "#6b7280" }}>جاري التحميل…</div>}

          {error && <InlineBanner type="error" message={error} onDismiss={() => setError("")} />}
          {success && <InlineBanner type="success" message={success} />}

          {detail && (
            <>
              {/* User notes */}
              {detail.userNotes && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: 4 }}>ملاحظاتي</div>
                  <div style={{ fontSize: "0.82rem", color: "#d1d5db" }}>{detail.userNotes}</div>
                </div>
              )}

              {/* Admin notes */}
              {detail.adminNotes && (
                <div style={{
                  backgroundColor: "#1a2332", borderRadius: 8, padding: "0.6rem 0.9rem",
                  marginBottom: "0.75rem", border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginBottom: 4 }}>ملاحظات الإدارة</div>
                  <div style={{ fontSize: "0.82rem", color: "#d1d5db" }}>{detail.adminNotes}</div>
                </div>
              )}

              {/* Rejection reason */}
              {detail.rejectionReason && (
                <div style={{
                  backgroundColor: "#1c0000", borderRadius: 8, padding: "0.6rem 0.9rem",
                  marginBottom: "0.75rem", border: "1px solid #450a0a",
                }}>
                  <div style={{ fontSize: "0.72rem", color: "#f87171", marginBottom: 4 }}>سبب الرفض</div>
                  <div style={{ fontSize: "0.82rem", color: "#fca5a5" }}>{detail.rejectionReason}</div>
                </div>
              )}

              {/* Documents */}
              <div style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.4rem" }}>
                  المستندات المرفقة
                </div>
                {detail.documents.length === 0 ? (
                  <div style={{ fontSize: "0.8rem", color: "#4b5563", fontStyle: "italic" }}>
                    لم يتم إرفاق أي مستندات بعد
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {detail.documents.map((doc) => <DocRow key={doc.id} doc={doc} />)}
                  </div>
                )}
              </div>

              {/* Add document */}
              {canAddDoc && (
                <>
                  <button
                    onClick={() => setShowAddDoc((v) => !v)}
                    style={{
                      padding: "0.35rem 0.9rem",
                      backgroundColor: "transparent",
                      color: "#60a5fa",
                      border: "1px solid #1e3a5f",
                      borderRadius: 7,
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      marginBottom: showAddDoc ? 0 : "0.75rem",
                    }}
                  >
                    {showAddDoc ? "إلغاء" : "+ إضافة مستند"}
                  </button>
                  {showAddDoc && (
                    <AddDocumentForm requestId={summary.id} onAdded={handleDocAdded} />
                  )}
                </>
              )}

              {/* Submit button */}
              {canSubmit && (
                <div style={{ marginTop: "0.75rem" }}>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || detail.documents.length === 0}
                    style={{
                      padding: "0.5rem 1.5rem",
                      backgroundColor: "#166534",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: (submitting || detail.documents.length === 0) ? "not-allowed" : "pointer",
                      opacity: (submitting || detail.documents.length === 0) ? 0.6 : 1,
                    }}
                  >
                    {submitting ? "جاري التقديم…" : "تقديم الطلب للمراجعة"}
                  </button>
                  {detail.documents.length === 0 && (
                    <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 4 }}>
                      يجب إرفاق مستند واحد على الأقل قبل التقديم
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── New request form ──────────────────────────────────────────────────────────

function NewRequestForm({ onCreated }: { onCreated: () => void }) {
  const [type, setType] = useState("Identity");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setSaving(true);
    setError("");
    try {
      await api.post("/verification/requests", { verificationType: type, userNotes: notes || undefined });
      setNotes("");
      onCreated();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      backgroundColor: "#111827",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12,
      padding: "1.25rem 1.5rem",
    }}>
      <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#f9fafb", marginBottom: "0.75rem" }}>
        طلب توثيق جديد
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ fontSize: "0.75rem", color: "#6b7280", display: "block", marginBottom: 4 }}>
          نوع التوثيق المطلوب
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {TYPE_OPTIONS.map((o) => (
            <label key={o.value} style={{
              display: "flex", alignItems: "center", gap: "0.6rem",
              cursor: "pointer",
              backgroundColor: type === o.value ? "#0f1d2e" : "transparent",
              border: `1px solid ${type === o.value ? "#1e3a5f" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 8,
              padding: "0.5rem 0.75rem",
            }}>
              <input
                type="radio"
                name="verType"
                value={o.value}
                checked={type === o.value}
                onChange={() => setType(o.value)}
                style={{ accentColor: "#60a5fa" }}
              />
              <span style={{ fontSize: "0.84rem", color: type === o.value ? "#93c5fd" : "#9ca3af" }}>
                {o.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ fontSize: "0.75rem", color: "#6b7280", display: "block", marginBottom: 4 }}>
          ملاحظات إضافية (اختياري)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="معلومات إضافية تريد إخبار الإدارة بها..."
          style={{
            width: "100%", backgroundColor: "#1f2937", color: "#f9fafb",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            padding: "0.5rem 0.75rem", fontSize: "0.82rem", resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </div>

      {error && <InlineBanner type="error" message={error} onDismiss={() => setError("")} />}

      <button
        onClick={handleCreate}
        disabled={saving}
        style={{
          padding: "0.5rem 1.5rem",
          backgroundColor: "#166534",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: "0.85rem",
          fontWeight: 700,
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "جاري الإنشاء…" : "إنشاء الطلب"}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UserVerificationPage() {
  useProtectedRoute();

  const [requests, setRequests] = useState<VRequestSummary[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    setFetchError("");
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
  }

  const hasActiveRequest = requests.some(
    (r) => !["Cancelled", "Rejected"].includes(r.status)
  );

  return (
    <div style={{ direction: "rtl", padding: "1.25rem 1.5rem", maxWidth: 720, margin: "0 auto" }}>
      <DashboardBackLink href="/dashboard" label="العودة للوحة التحكم" />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f9fafb", margin: 0 }}>
            التوثيق والهوية
          </h1>
          <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
            تقديم مستندات التوثيق للحصول على شارة المستخدم الموثَّق
          </p>
        </div>
        {!hasActiveRequest && !showNew && (
          <button
            onClick={() => setShowNew(true)}
            style={{
              padding: "0.45rem 1.2rem",
              backgroundColor: "#166534",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + طلب توثيق جديد
          </button>
        )}
        {showNew && (
          <button
            onClick={() => setShowNew(false)}
            style={{
              padding: "0.45rem 1.2rem",
              backgroundColor: "transparent",
              color: "#6b7280",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            إلغاء
          </button>
        )}
      </div>

      {/* Info box */}
      <div style={{
        backgroundColor: "#0f1929",
        border: "1px solid #1c3461",
        borderRadius: 10,
        padding: "0.75rem 1rem",
        marginBottom: "1.25rem",
        fontSize: "0.82rem",
        color: "#93c5fd",
        lineHeight: 1.6,
      }}>
        <strong>كيفية التوثيق:</strong> أنشئ طلباً → أرفق المستندات المطلوبة → قدّم الطلب.
        ستقوم الإدارة بمراجعة طلبك وإخبارك بالنتيجة.
      </div>

      {fetchError && <InlineBanner type="error" message={fetchError} onDismiss={() => setFetchError("")} />}

      {/* New request form */}
      {showNew && (
        <div style={{ marginBottom: "1.25rem" }}>
          <NewRequestForm onCreated={handleCreated} />
        </div>
      )}

      {/* Requests list */}
      {fetching ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280", fontSize: "0.85rem" }}>
          جاري التحميل…
        </div>
      ) : requests.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "3rem",
          backgroundColor: "#111827",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 12,
          color: "#4b5563",
          fontSize: "0.85rem",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📋</div>
          لا توجد طلبات توثيق حتى الآن
          {!showNew && (
            <div style={{ marginTop: "0.75rem" }}>
              <button
                onClick={() => setShowNew(true)}
                style={{
                  padding: "0.4rem 1.2rem",
                  backgroundColor: "#166534",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ابدأ طلباً جديداً
              </button>
            </div>
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
