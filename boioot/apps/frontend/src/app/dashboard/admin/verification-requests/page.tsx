"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
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
  userId: string;
  userFullName?: string;
  userEmail?: string;
  verificationType: string;
  status: string;
  documentCount: number;
  submittedAt?: string;
  createdAt: string;
}

interface VRequestDetail {
  id: string;
  userId: string;
  userFullName?: string;
  userEmail?: string;
  verificationType: string;
  status: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
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
  UnderReview:   "قيد المراجعة",
  NeedsMoreInfo: "يحتاج معلومات",
  Approved:      "مقبول",
  Rejected:      "مرفوض",
  Cancelled:     "ملغى",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Draft:         { bg: "#1f2937", text: "#9ca3af" },
  Submitted:     { bg: "#1e3a5f", text: "#60a5fa" },
  UnderReview:   { bg: "#1c3461", text: "#93c5fd" },
  NeedsMoreInfo: { bg: "#3b2d00", text: "#fbbf24" },
  Approved:      { bg: "#14532d", text: "#4ade80" },
  Rejected:      { bg: "#450a0a", text: "#f87171" },
  Cancelled:     { bg: "#1f2937", text: "#6b7280" },
};

const TYPE_LABELS: Record<string, string> = {
  Identity: "هوية شخصية",
  Business: "سجل تجاري",
  Both:     "هوية + سجل",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  NationalId:       "الهوية الوطنية",
  Passport:         "جواز السفر",
  DriverLicense:    "رخصة القيادة",
  CommercialRecord: "السجل التجاري",
  TaxCertificate:   "الشهادة الضريبية",
  PropertyDeed:     "سند الملكية",
  Other:            "مستند آخر",
};

const DOC_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending:  { bg: "#1e3a5f", text: "#60a5fa" },
  Accepted: { bg: "#14532d", text: "#4ade80" },
  Rejected: { bg: "#450a0a", text: "#f87171" },
};

const REVIEW_STATUS_OPTIONS = [
  { value: "UnderReview",   label: "قيد المراجعة" },
  { value: "NeedsMoreInfo", label: "يحتاج معلومات إضافية" },
  { value: "Approved",      label: "قبول الطلب" },
  { value: "Rejected",      label: "رفض الطلب" },
  { value: "Cancelled",     label: "إلغاء الطلب" },
];

const VERIFICATION_STATUS_OPTIONS = [
  { value: "",             label: "— بدون تغيير —" },
  { value: "Verified",     label: "موثَّق" },
  { value: "Partial",      label: "موثَّق جزئياً" },
  { value: "Unverified",   label: "غير موثَّق" },
  { value: "Rejected",     label: "مرفوض" },
];

const VERIFICATION_LEVEL_OPTIONS = [
  { value: "",  label: "— بدون تغيير —" },
  { value: "0", label: "0 — لا يوجد" },
  { value: "1", label: "1 — أساسي" },
  { value: "2", label: "2 — متقدم" },
  { value: "3", label: "3 — موثوق" },
];

const PAGE_SIZE = 20;

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return s; }
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: "#1f2937", text: "#9ca3af" };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 9px",
      borderRadius: 12,
      fontSize: "0.73rem",
      fontWeight: 600,
      backgroundColor: c.bg,
      color: c.text,
    }}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  req,
  onClose,
  onReviewed,
}: {
  req: VRequestDetail;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [reviewStatus, setReviewStatus] = useState("UnderReview");
  const [adminNotes, setAdminNotes] = useState(req.adminNotes ?? "");
  const [rejectionReason, setRejectionReason] = useState(req.rejectionReason ?? "");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [verificationLevel, setVerificationLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState("");

  async function handleReview() {
    setSaving(true);
    setSaveError("");
    setSaveOk("");
    try {
      const body: Record<string, unknown> = { status: reviewStatus, adminNotes, rejectionReason };
      if (verificationStatus) body.verificationStatus = verificationStatus;
      if (verificationLevel !== "") body.verificationLevel = Number(verificationLevel);
      await api.put(`/admin/verification/requests/${req.id}/review`, body);
      setSaveOk("تمت مراجعة الطلب بنجاح");
      setTimeout(() => { onReviewed(); }, 800);
    } catch (e) {
      setSaveError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  const canReview = !["Approved", "Rejected", "Cancelled"].includes(req.status);

  return (
    <div style={{
      position: "fixed", inset: 0,
      backgroundColor: "rgba(0,0,0,0.75)",
      zIndex: 1000,
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      padding: "2rem 1rem",
      overflowY: "auto",
    }}>
      <div style={{
        backgroundColor: "#111827",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: "1.5rem",
        width: "100%",
        maxWidth: 680,
        direction: "rtl",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f9fafb" }}>
              طلب التوثيق — {TYPE_LABELS[req.verificationType] ?? req.verificationType}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: 2 }}>
              {req.userFullName ?? "—"} &bull; {req.userEmail ?? "—"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <StatusBadge status={req.status} />
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "1.2rem", padding: 4 }}
            >✕</button>
          </div>
        </div>

        {/* Meta */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0.75rem", marginBottom: "1.25rem",
          backgroundColor: "#1f2937", borderRadius: 8, padding: "0.75rem 1rem",
        }}>
          {[
            ["تاريخ الإنشاء", fmtDate(req.createdAt)],
            ["تاريخ التقديم", fmtDate(req.submittedAt)],
            ["تاريخ المراجعة", fmtDate(req.reviewedAt)],
          ].map(([label, val]) => (
            <div key={label}>
              <div style={{ fontSize: "0.7rem", color: "#6b7280", marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: "0.82rem", color: "#d1d5db" }}>{val}</div>
            </div>
          ))}
        </div>

        {/* User notes */}
        {req.userNotes && (
          <div style={{ backgroundColor: "#1f2937", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: 4 }}>ملاحظات المستخدم</div>
            <div style={{ fontSize: "0.84rem", color: "#d1d5db" }}>{req.userNotes}</div>
          </div>
        )}

        {/* Documents */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.5rem" }}>
            المستندات ({req.documents.length})
          </div>
          {req.documents.length === 0 ? (
            <div style={{ fontSize: "0.8rem", color: "#4b5563", fontStyle: "italic" }}>لا توجد مستندات مرفقة</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {req.documents.map((doc) => {
                const dc = DOC_STATUS_COLORS[doc.status] ?? { bg: "#1f2937", text: "#9ca3af" };
                return (
                  <div key={doc.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    backgroundColor: "#1a2332", borderRadius: 7, padding: "0.5rem 0.75rem",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span style={{
                        display: "inline-block", padding: "1px 7px", borderRadius: 10,
                        fontSize: "0.68rem", fontWeight: 600,
                        backgroundColor: dc.bg, color: dc.text,
                      }}>
                        {doc.status === "Pending" ? "معلّق" : doc.status === "Accepted" ? "مقبول" : "مرفوض"}
                      </span>
                      <div>
                        <div style={{ fontSize: "0.8rem", color: "#d1d5db" }}>
                          {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>{doc.fileName}</div>
                      </div>
                    </div>
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "0.74rem", color: "#60a5fa",
                          textDecoration: "none",
                          padding: "3px 10px",
                          border: "1px solid #1e3a5f",
                          borderRadius: 6,
                        }}
                      >
                        عرض
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Review section */}
        {canReview && (
          <div style={{
            backgroundColor: "#1f2937", borderRadius: 10, padding: "1rem",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#9ca3af", marginBottom: "0.75rem" }}>
              مراجعة الطلب
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.72rem", color: "#6b7280", display: "block", marginBottom: 4 }}>
                  القرار
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  style={{
                    width: "100%", backgroundColor: "#111827", color: "#f9fafb",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7,
                    padding: "0.4rem 0.6rem", fontSize: "0.82rem",
                  }}
                >
                  {REVIEW_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {reviewStatus === "Approved" && (
                <div>
                  <label style={{ fontSize: "0.72rem", color: "#6b7280", display: "block", marginBottom: 4 }}>
                    مستوى التوثيق
                  </label>
                  <select
                    value={verificationLevel}
                    onChange={(e) => setVerificationLevel(e.target.value)}
                    style={{
                      width: "100%", backgroundColor: "#111827", color: "#f9fafb",
                      border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7,
                      padding: "0.4rem 0.6rem", fontSize: "0.82rem",
                    }}
                  >
                    {VERIFICATION_LEVEL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {reviewStatus === "Approved" && (
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ fontSize: "0.72rem", color: "#6b7280", display: "block", marginBottom: 4 }}>
                  حالة التوثيق بعد القبول
                </label>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value)}
                  style={{
                    width: "100%", backgroundColor: "#111827", color: "#f9fafb",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7,
                    padding: "0.4rem 0.6rem", fontSize: "0.82rem",
                  }}
                >
                  {VERIFICATION_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            )}

            {reviewStatus === "Rejected" && (
              <div style={{ marginBottom: "0.75rem" }}>
                <label style={{ fontSize: "0.72rem", color: "#6b7280", display: "block", marginBottom: 4 }}>
                  سبب الرفض
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                  placeholder="اذكر سبب الرفض للمستخدم..."
                  style={{
                    width: "100%", backgroundColor: "#111827", color: "#f9fafb",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7,
                    padding: "0.4rem 0.6rem", fontSize: "0.82rem", resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "0.72rem", color: "#6b7280", display: "block", marginBottom: 4 }}>
                ملاحظات الإدارة (اختياري)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={2}
                placeholder="ملاحظات داخلية للمراجع..."
                style={{
                  width: "100%", backgroundColor: "#111827", color: "#f9fafb",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7,
                  padding: "0.4rem 0.6rem", fontSize: "0.82rem", resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {saveError && <InlineBanner type="error" message={saveError} onDismiss={() => setSaveError("")} />}
            {saveOk    && <InlineBanner type="success" message={saveOk} />}

            <button
              onClick={handleReview}
              disabled={saving}
              style={{
                padding: "0.45rem 1.2rem",
                backgroundColor: "#166534",
                color: "#fff",
                border: "none",
                borderRadius: 7,
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "جاري الحفظ…" : "حفظ المراجعة"}
            </button>
          </div>
        )}

        {/* Previous decision (if already decided) */}
        {!canReview && req.adminNotes && (
          <div style={{ backgroundColor: "#1f2937", borderRadius: 8, padding: "0.75rem 1rem", marginTop: "0.75rem" }}>
            <div style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: 4 }}>ملاحظات الإدارة</div>
            <div style={{ fontSize: "0.84rem", color: "#d1d5db" }}>{req.adminNotes}</div>
          </div>
        )}
        {!canReview && req.rejectionReason && (
          <div style={{ backgroundColor: "#1f1010", borderRadius: 8, padding: "0.75rem 1rem", marginTop: "0.5rem" }}>
            <div style={{ fontSize: "0.72rem", color: "#f87171", marginBottom: 4 }}>سبب الرفض</div>
            <div style={{ fontSize: "0.84rem", color: "#fca5a5" }}>{req.rejectionReason}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminVerificationRequestsPage() {
  useProtectedRoute({ requiredPermission: "users.view" });

  const [items, setItems]           = useState<VRequestSummary[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType]     = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  const [detail, setDetail] = useState<VRequestDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async (p: number) => {
    setFetching(true);
    setFetchError("");
    try {
      const params = new URLSearchParams({
        page: String(p),
        pageSize: String(PAGE_SIZE),
      });
      if (filterStatus) params.set("status", filterStatus);
      if (filterType)   params.set("verificationType", filterType);
      if (filterSearch) params.set("search", filterSearch);

      const res: PagedResult<VRequestSummary> = await api.get(
        `/admin/verification/requests?${params.toString()}`
      );
      setItems(res.items ?? []);
      setTotalPages(res.totalPages ?? 1);
      setTotalCount(res.totalCount ?? 0);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, [filterStatus, filterType, filterSearch]);

  useEffect(() => { load(page); }, [page, load]);

  async function openDetail(id: string) {
    setLoadingDetail(true);
    try {
      const res: VRequestDetail = await api.get(`/admin/verification/requests/${id}`);
      setDetail(res);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleReviewed() {
    setDetail(null);
    load(page);
  }

  return (
    <div style={{ direction: "rtl", padding: "1.25rem 1.5rem", maxWidth: 1100, margin: "0 auto" }}>
      <DashboardBackLink href="/dashboard/admin" label="العودة للوحة التحكم" />

      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f9fafb", margin: 0 }}>
          طلبات التوثيق
        </h1>
        <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "0.25rem 0 0" }}>
          مراجعة وقبول/رفض طلبات توثيق الهوية والسجلات التجارية
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", gap: "0.75rem", flexWrap: "wrap",
        marginBottom: "1.25rem", alignItems: "center",
      }}>
        <input
          type="text"
          placeholder="بحث بالاسم أو البريد..."
          value={filterSearch}
          onChange={(e) => { setFilterSearch(e.target.value); setPage(1); }}
          style={{
            flex: "1 1 180px", minWidth: 180,
            backgroundColor: "#1f2937", color: "#f9fafb",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            padding: "0.4rem 0.75rem", fontSize: "0.82rem",
          }}
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          style={{
            backgroundColor: "#1f2937", color: "#f9fafb",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            padding: "0.4rem 0.6rem", fontSize: "0.82rem",
          }}
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          style={{
            backgroundColor: "#1f2937", color: "#f9fafb",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
            padding: "0.4rem 0.6rem", fontSize: "0.82rem",
          }}
        >
          <option value="">كل الأنواع</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={() => load(page)}
          style={{
            padding: "0.4rem 1rem", backgroundColor: "#166534", color: "#fff",
            border: "none", borderRadius: 8, fontSize: "0.82rem", cursor: "pointer",
          }}
        >
          بحث
        </button>
      </div>

      {fetchError && <InlineBanner type="error" message={fetchError} onDismiss={() => setFetchError("")} />}

      {/* Summary */}
      <div style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: "0.75rem" }}>
        {fetching ? "جاري التحميل…" : `${totalCount} طلب`}
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: "#111827",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 10,
        overflow: "hidden",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#1f2937", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {["المستخدم", "النوع", "الحالة", "المستندات", "تاريخ التقديم", ""].map((h) => (
                <th key={h} style={{
                  padding: "0.65rem 1rem", textAlign: "right",
                  fontSize: "0.73rem", fontWeight: 600, color: "#6b7280",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fetching ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem", color: "#6b7280", fontSize: "0.85rem" }}>
                  جاري التحميل…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2.5rem", color: "#4b5563", fontSize: "0.85rem" }}>
                  لا توجد طلبات توثيق
                </td>
              </tr>
            ) : items.map((item) => (
              <tr
                key={item.id}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  transition: "background-color 0.1s",
                }}
                onClick={() => openDetail(item.id)}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent"; }}
              >
                <td style={{ padding: "0.7rem 1rem" }}>
                  <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "#f3f4f6" }}>
                    {item.userFullName ?? "—"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>{item.userEmail ?? "—"}</div>
                </td>
                <td style={{ padding: "0.7rem 1rem", fontSize: "0.8rem", color: "#d1d5db" }}>
                  {TYPE_LABELS[item.verificationType] ?? item.verificationType}
                </td>
                <td style={{ padding: "0.7rem 1rem" }}>
                  <StatusBadge status={item.status} />
                </td>
                <td style={{ padding: "0.7rem 1rem", fontSize: "0.8rem", color: "#9ca3af" }}>
                  {item.documentCount} مستند
                </td>
                <td style={{ padding: "0.7rem 1rem", fontSize: "0.78rem", color: "#6b7280" }}>
                  {fmtDate(item.submittedAt ?? item.createdAt)}
                </td>
                <td style={{ padding: "0.7rem 1rem", textAlign: "left" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDetail(item.id); }}
                    disabled={loadingDetail}
                    style={{
                      padding: "3px 12px",
                      backgroundColor: "transparent",
                      color: "#60a5fa",
                      border: "1px solid #1e3a5f",
                      borderRadius: 6,
                      fontSize: "0.74rem",
                      cursor: "pointer",
                    }}
                  >
                    مراجعة
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {detail && (
        <DetailPanel
          req={detail}
          onClose={() => setDetail(null)}
          onReviewed={handleReviewed}
        />
      )}
    </div>
  );
}
