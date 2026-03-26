"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { adminApi } from "@/features/admin/api";
import {
  STATUS_META,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICON,
  CYCLE_LABELS,
} from "@/features/subscriptionPayments/constants";
import { normalizeError } from "@/lib/api";
import type { PaymentRequestResponse, PaymentRequestStatus } from "@/features/subscriptionPayments/types";
import type { PagedResult } from "@/types";

// ── State machine allowed actions per status ──────────────────────────────────

const ALLOWED_ACTIONS: Record<string, string[]> = {
  Pending:          ["under-review", "approve", "reject", "cancel"],
  AwaitingPayment:  ["under-review", "approve", "reject", "cancel"],
  ReceiptUploaded:  ["under-review", "approve", "reject", "cancel"],
  UnderReview:      ["approve", "reject", "cancel"],
  Approved:         ["activate", "cancel"],
  Rejected:         [],
  Activated:        [],
  Cancelled:        [],
};

function canDo(status: string, action: string): boolean {
  return (ALLOWED_ACTIONS[status] ?? []).includes(action);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (withTime) {
    return d.toLocaleString("ar-SY", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
  return d.toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" });
}

function fmtAmount(amount: number, currency: string): string {
  if (amount === 0) return "مجاني";
  return `${amount.toLocaleString("ar-SY")} ${currency}`;
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

// ── KPI summary card ──────────────────────────────────────────────────────────

const KPI_STATUSES: { key: string; label: string; color: string; bg: string }[] = [
  { key: "all",            label: "الكل",          color: "#374151", bg: "#f3f4f6" },
  { key: "Pending",        label: "قيد الانتظار",  color: "#92400e", bg: "#fef3c7" },
  { key: "AwaitingPayment",label: "بانتظار الدفع", color: "#0369a1", bg: "#e0f2fe" },
  { key: "ReceiptUploaded",label: "الإيصال مرفوع", color: "#1d4ed8", bg: "#dbeafe" },
  { key: "UnderReview",    label: "قيد المراجعة",  color: "#5b21b6", bg: "#f5f3ff" },
  { key: "Approved",       label: "موافق عليه",    color: "#166534", bg: "#dcfce7" },
  { key: "Activated",      label: "مُفعَّل",        color: "#065f46", bg: "#bbf7d0" },
  { key: "Rejected",       label: "مرفوض",         color: "#b91c1c", bg: "#fee2e2" },
  { key: "Cancelled",      label: "ملغى",          color: "#374151", bg: "#f3f4f6" },
];

function KpiCard({
  label, count, color, bg, active, onClick,
}: {
  label: string; count: number; color: string; bg: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        backgroundColor: active ? bg : "#fff",
        border: active ? `2px solid ${color}` : "1.5px solid #e2e8f0",
        borderRadius: 12,
        padding: "0.85rem 1rem",
        cursor: "pointer",
        textAlign: "center",
        minWidth: 0,
        flex: "1 1 100px",
      }}
    >
      <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color }}>
        {count}
      </p>
      <p style={{ margin: "0.15rem 0 0", fontSize: "0.72rem", fontWeight: 600, color: active ? color : "#64748b" }}>
        {label}
      </p>
    </button>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as PaymentRequestStatus];
  if (!meta) return <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{status}</span>;
  return (
    <span style={{
      display: "inline-block",
      padding: "0.2rem 0.65rem",
      borderRadius: 20,
      backgroundColor: meta.bg,
      color: meta.color,
      fontSize: "0.72rem",
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {meta.label}
    </span>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionBtn({
  label, color, bg, disabled, onClick,
}: {
  label: string; color: string; bg: string; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type="button"
      style={{
        padding: "0.55rem 1.1rem",
        borderRadius: 9,
        border: `1.5px solid ${color}`,
        backgroundColor: disabled ? "#f3f4f6" : bg,
        color: disabled ? "#94a3b8" : color,
        fontSize: "0.82rem",
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  body,
  confirmLabel,
  confirmColor,
  withNote,
  notePlaceholder,
  noteRequired,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  confirmColor: string;
  withNote?: boolean;
  notePlaceholder?: string;
  noteRequired?: boolean;
  onConfirm: (note?: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [note, setNote] = useState("");
  const disabled = loading || (noteRequired && !note.trim());

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }}>
      <div style={{
        backgroundColor: "#fff", borderRadius: 16, padding: "1.75rem",
        maxWidth: 420, width: "100%",
      }}>
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 800, color: "#1a2e1a" }}>
          {title}
        </h3>
        <p style={{ margin: "0 0 1.1rem", fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>
          {body}
        </p>
        {withNote && (
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
              ملاحظة {noteRequired ? <span style={{ color: "#b91c1c" }}>*</span> : "(اختياري)"}
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={notePlaceholder ?? "أدخل ملاحظة..."}
              rows={3}
              style={{
                width: "100%", padding: "0.6rem 0.8rem", borderRadius: 9,
                border: "1.5px solid #e2e8f0", fontSize: "0.85rem",
                resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          </div>
        )}
        <div style={{ display: "flex", gap: "0.65rem" }}>
          <button
            onClick={onCancel}
            type="button"
            disabled={loading}
            style={{
              flex: 1, padding: "0.7rem", borderRadius: 9,
              border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc",
              color: "#475569", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            تراجع
          </button>
          <button
            onClick={() => onConfirm(withNote ? note.trim() : undefined)}
            type="button"
            disabled={disabled}
            style={{
              flex: 1, padding: "0.7rem", borderRadius: 9, border: "none",
              backgroundColor: disabled ? "#94a3b8" : confirmColor,
              color: "#fff", fontSize: "0.88rem", fontWeight: 700,
              cursor: disabled ? "default" : "pointer",
            }}
          >
            {loading ? "جارٍ التنفيذ..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Timeline event ────────────────────────────────────────────────────────────

function TimelineRow({
  icon, label, date, note, color,
}: { icon: string; label: string; date: string | null | undefined; note?: string | null; color: string }) {
  if (!date) return null;
  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", backgroundColor: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.75rem", flexShrink: 0, color: "#fff",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, paddingBottom: "0.75rem", borderBottom: "1px dashed #f1f5f9" }}>
        <p style={{ margin: 0, fontSize: "0.83rem", fontWeight: 700, color: "#1e293b" }}>{label}</p>
        <p style={{ margin: "0.15rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>{fmtDate(date, true)}</p>
        {note && (
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5 }}>
            <em>{note}</em>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────────

type ActionType = "under-review" | "approve" | "reject" | "activate" | "cancel";

interface ModalState {
  action: ActionType;
  id: string;
}

function DetailPanel({
  req,
  onClose,
  onUpdated,
}: {
  req: PaymentRequestResponse;
  onClose: () => void;
  onUpdated: (updated: PaymentRequestResponse) => void;
}) {
  const [modal, setModal]     = useState<ModalState | null>(null);
  const [actLoading, setActLoading] = useState(false);
  const [actError, setActError]   = useState<string | null>(null);

  async function handleAction(action: ActionType, note?: string) {
    setActLoading(true);
    setActError(null);
    try {
      let updated: PaymentRequestResponse;
      switch (action) {
        case "under-review": updated = await adminApi.paymentMarkUnderReview(req.id); break;
        case "approve":      updated = await adminApi.paymentApprove(req.id, note); break;
        case "reject":       updated = await adminApi.paymentReject(req.id, note ?? ""); break;
        case "activate":     updated = await adminApi.paymentActivate(req.id); break;
        case "cancel":       updated = await adminApi.paymentAdminCancel(req.id, note); break;
      }
      onUpdated(updated);
      setModal(null);
    } catch (err) {
      setActError(normalizeError(err));
    } finally {
      setActLoading(false);
    }
  }

  const s = req.status;

  const MODAL_CONFIGS: Record<ActionType, {
    title: string; body: string; confirmLabel: string; confirmColor: string;
    withNote?: boolean; notePlaceholder?: string; noteRequired?: boolean;
  }> = {
    "under-review": {
      title: "تحويل للمراجعة",
      body: "هل تريد تحويل هذا الطلب إلى حالة 'قيد المراجعة'؟ سيتم إشعار العميل.",
      confirmLabel: "تأكيد", confirmColor: "#5b21b6",
    },
    approve: {
      title: "الموافقة على الطلب",
      body: "تأكيد استلام الدفع والموافقة على هذا الطلب. يمكن تفعيل الاشتراك بعد الموافقة.",
      confirmLabel: "موافقة", confirmColor: "#166534",
      withNote: true, notePlaceholder: "ملاحظة اختيارية للعميل...",
    },
    reject: {
      title: "رفض الطلب",
      body: "يرجى توضيح سبب الرفض. سيراه العميل في حالة طلبه.",
      confirmLabel: "رفض", confirmColor: "#b91c1c",
      withNote: true, notePlaceholder: "سبب الرفض...", noteRequired: true,
    },
    activate: {
      title: "تفعيل الاشتراك",
      body: "هل تريد تفعيل اشتراك هذا الطلب الآن؟ سيتم إلغاء أي اشتراك نشط سابق وإنشاء اشتراك جديد.",
      confirmLabel: "تفعيل", confirmColor: "#059669",
    },
    cancel: {
      title: "إلغاء الطلب إدارياً",
      body: "هل تريد إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا القرار.",
      confirmLabel: "إلغاء الطلب", confirmColor: "#b91c1c",
      withNote: true, notePlaceholder: "سبب الإلغاء (اختياري)...",
    },
  };

  return (
    <div style={{
      position: "fixed", top: 0, bottom: 0, right: 0,
      width: "min(480px, 100vw)",
      backgroundColor: "#fff",
      boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
      zIndex: 1000,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        padding: "1.1rem 1.25rem",
        borderBottom: "1px solid #f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
        backgroundColor: "#f8fafc",
      }}>
        <div>
          <p style={{ margin: 0, fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            طلب #{shortId(req.id)}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
            <StatusBadge status={s} />
          </div>
        </div>
        <button
          onClick={onClose}
          type="button"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem" }}
        >
          ✕
        </button>
      </div>

      <div style={{ flex: 1, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

        {/* Action error */}
        {actError && (
          <div style={{
            backgroundColor: "#fee2e2", border: "1px solid #fca5a5",
            borderRadius: 9, padding: "0.7rem", fontSize: "0.82rem", color: "#b91c1c",
          }}>
            ⚠️ {actError}
          </div>
        )}

        {/* Action buttons */}
        <div>
          <p style={{ margin: "0 0 0.6rem", fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            الإجراءات
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {canDo(s, "under-review") && (
              <ActionBtn
                label="🔍 قيد المراجعة"
                color="#5b21b6" bg="#f5f3ff"
                onClick={() => setModal({ action: "under-review", id: req.id })}
              />
            )}
            {canDo(s, "approve") && (
              <ActionBtn
                label="✓ موافقة"
                color="#166534" bg="#f0fdf4"
                onClick={() => setModal({ action: "approve", id: req.id })}
              />
            )}
            {canDo(s, "activate") && (
              <ActionBtn
                label="🚀 تفعيل الاشتراك"
                color="#059669" bg="#d1fae5"
                onClick={() => setModal({ action: "activate", id: req.id })}
              />
            )}
            {canDo(s, "reject") && (
              <ActionBtn
                label="✕ رفض"
                color="#b91c1c" bg="#fee2e2"
                onClick={() => setModal({ action: "reject", id: req.id })}
              />
            )}
            {canDo(s, "cancel") && (
              <ActionBtn
                label="إلغاء إداري"
                color="#64748b" bg="#f1f5f9"
                onClick={() => setModal({ action: "cancel", id: req.id })}
              />
            )}
            {ALLOWED_ACTIONS[s]?.length === 0 && (
              <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
                لا توجد إجراءات متاحة لهذه الحالة
              </p>
            )}
          </div>
        </div>

        {/* Plan + payment info */}
        <div style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: "1rem" }}>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            تفاصيل الطلب
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.83rem" }}>
            <Row label="الباقة"      value={req.planName} />
            <Row label="المبلغ"      value={fmtAmount(req.amount, req.currency)} bold />
            <Row label="دورة الفوترة" value={CYCLE_LABELS[req.billingCycle] ?? req.billingCycle} />
            <Row label="طريقة الدفع" value={`${PAYMENT_METHOD_ICON[req.paymentMethod]} ${PAYMENT_METHOD_LABELS[req.paymentMethod] ?? req.paymentMethod}`} />
            {req.salesRepresentativeName && (
              <Row label="المندوب" value={req.salesRepresentativeName} />
            )}
            {req.externalPaymentReference && (
              <Row label="مرجع الدفع" value={req.externalPaymentReference} />
            )}
          </div>
        </div>

        {/* Customer note */}
        {req.customerNote && (
          <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "0.85rem" }}>
            <p style={{ margin: "0 0 0.3rem", fontSize: "0.72rem", fontWeight: 700, color: "#92400e" }}>ملاحظة العميل</p>
            <p style={{ margin: 0, fontSize: "0.83rem", color: "#78350f", lineHeight: 1.6 }}>{req.customerNote}</p>
          </div>
        )}

        {/* Review note */}
        {req.reviewNote && (
          <div style={{ backgroundColor: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 10, padding: "0.85rem" }}>
            <p style={{ margin: "0 0 0.3rem", fontSize: "0.72rem", fontWeight: 700, color: "#92400e" }}>ملاحظة المراجع</p>
            <p style={{ margin: 0, fontSize: "0.83rem", color: "#78350f", lineHeight: 1.6 }}>{req.reviewNote}</p>
          </div>
        )}

        {/* Receipt */}
        {req.receiptImageUrl && (
          <div>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              إيصال الدفع
            </p>
            <a href={req.receiptImageUrl} target="_blank" rel="noopener noreferrer"
              style={{
                display: "block", borderRadius: 10, overflow: "hidden",
                border: "1.5px solid #e2e8f0", textDecoration: "none",
              }}
            >
              <img
                src={req.receiptImageUrl}
                alt="إيصال الدفع"
                style={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }}
                onError={e => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div style={{ padding: "0.5rem 0.75rem", backgroundColor: "#f8fafc", fontSize: "0.78rem", color: "#64748b" }}>
                📎 {req.receiptFileName ?? "عرض الإيصال"}
              </div>
            </a>
          </div>
        )}

        {/* Timeline */}
        <div>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            المحطات الزمنية
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <TimelineRow icon="📋" label="تم إنشاء الطلب"   date={req.createdAt}   color="#64748b" />
            <TimelineRow icon="🔍" label="بدأت المراجعة"    date={req.reviewedAt}  color="#5b21b6" />
            <TimelineRow icon="✓"  label="تمت الموافقة / الرفض" date={req.reviewedAt} note={req.reviewNote} color="#166534" />
            <TimelineRow icon="🚀" label="تم تفعيل الاشتراك" date={req.activatedAt} color="#059669" />
            <TimelineRow icon="✅" label="اكتمل الطلب"      date={req.completedAt} color="#065f46" />
          </div>
        </div>

        {/* IDs for reference */}
        <div style={{ backgroundColor: "#f8fafc", borderRadius: 10, padding: "0.85rem" }}>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            معرّفات
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.75rem" }}>
            <Row label="معرّف الطلب"   value={req.id} mono />
            <Row label="معرّف الحساب"  value={req.accountId} mono />
            <Row label="معرّف المستخدم" value={req.userId} mono />
          </div>
        </div>

      </div>

      {/* Confirm modal */}
      {modal && (() => {
        const cfg = MODAL_CONFIGS[modal.action];
        return (
          <ConfirmModal
            {...cfg}
            loading={actLoading}
            onConfirm={note => handleAction(modal.action, note)}
            onCancel={() => { setModal(null); setActError(null); }}
          />
        );
      })()}
    </div>
  );
}

function Row({
  label, value, bold, mono,
}: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
      <span style={{ color: "#94a3b8", flexShrink: 0 }}>{label}</span>
      <span style={{
        fontWeight: bold ? 700 : 500, color: "#1e293b", textAlign: "left",
        fontFamily: mono ? "monospace" : "inherit", fontSize: mono ? "0.72rem" : "inherit",
        wordBreak: "break-all",
      }}>
        {value}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

const STATUSES: { value: string; label: string }[] = [
  { value: "",               label: "جميع الحالات" },
  { value: "Pending",        label: "قيد الانتظار" },
  { value: "AwaitingPayment",label: "بانتظار الدفع" },
  { value: "ReceiptUploaded",label: "الإيصال مرفوع" },
  { value: "UnderReview",    label: "قيد المراجعة" },
  { value: "Approved",       label: "موافق عليه" },
  { value: "Activated",      label: "مُفعَّل" },
  { value: "Rejected",       label: "مرفوض" },
  { value: "Cancelled",      label: "ملغى" },
];

const METHODS = [
  { value: "",                  label: "جميع طرق الدفع" },
  { value: "bank_transfer",     label: "تحويل بنكي" },
  { value: "cash_to_sales_rep", label: "دفع نقدي" },
  { value: "receipt_upload",    label: "رفع إيصال" },
  { value: "other_manual",      label: "أخرى" },
];

const selectSt = {
  padding: "0.45rem 0.7rem",
  borderRadius: 8,
  border: "1.5px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  fontSize: "0.82rem",
  fontFamily: "inherit",
  color: "#0f172a",
  cursor: "pointer",
};

export default function AdminPaymentRequestsPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "billing.manage" });

  const [items, setItems]           = useState<PaymentRequestResponse[]>([]);
  const [paged, setPaged]           = useState<PagedResult<PaymentRequestResponse> | null>(null);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [page, setPage]             = useState(1);

  const [filterStatus, setFilterStatus]   = useState("");
  const [filterMethod, setFilterMethod]   = useState("");
  const [filterFrom,   setFilterFrom]     = useState("");
  const [filterTo,     setFilterTo]       = useState("");
  const [activeKpi,    setActiveKpi]      = useState("all");

  const [selected, setSelected] = useState<PaymentRequestResponse | null>(null);

  // KPI counts (derived from a "fetch-all" pass or from paged summary)
  const [kpiCounts, setKpiCounts] = useState<Record<string, number>>({});

  const filtersRef = useRef({ status: "", method: "", from: "", to: "" });

  // fetch main list
  const load = useCallback(async (p: number, params: {
    status?: string; paymentMethod?: string; fromDate?: string; toDate?: string;
  } = {}) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await adminApi.getPaymentRequests({ ...params, page: p, pageSize: PAGE_SIZE });
      setItems(result.items as PaymentRequestResponse[]);
      setPaged(result as unknown as PagedResult<PaymentRequestResponse>);
      setPage(p);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  // fetch KPI counts (all statuses, unfiltered)
  const loadKpis = useCallback(async () => {
    const counts: Record<string, number> = { all: 0 };
    await Promise.allSettled(
      ["Pending","AwaitingPayment","ReceiptUploaded","UnderReview","Approved","Activated","Rejected","Cancelled"].map(async s => {
        const r = await adminApi.getPaymentRequests({ status: s, pageSize: 1, page: 1 });
        const total = (r as unknown as PagedResult<PaymentRequestResponse>).totalCount;
        counts[s] = total;
        counts["all"] = (counts["all"] ?? 0) + total;
      })
    );
    setKpiCounts(counts);
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      load(1);
      loadKpis();
    }
  }, [isLoading, user, load, loadKpis]);

  function applyFilters() {
    const params = {
      status:        filterStatus || undefined,
      paymentMethod: filterMethod || undefined,
      fromDate:      filterFrom   || undefined,
      toDate:        filterTo     || undefined,
    };
    filtersRef.current = { status: filterStatus, method: filterMethod, from: filterFrom, to: filterTo };
    setActiveKpi("all");
    setSelected(null);
    load(1, params);
  }

  function applyKpi(key: string) {
    setActiveKpi(key);
    setFilterStatus(key === "all" ? "" : key);
    setSelected(null);
    load(1, {
      status:        key === "all" ? undefined : key,
      paymentMethod: filterMethod || undefined,
      fromDate:      filterFrom   || undefined,
      toDate:        filterTo     || undefined,
    });
  }

  function resetFilters() {
    setFilterStatus(""); setFilterMethod(""); setFilterFrom(""); setFilterTo("");
    setActiveKpi("all");
    setSelected(null);
    load(1);
  }

  function onUpdated(updated: PaymentRequestResponse) {
    setItems(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelected(updated);
    loadKpis();
  }

  if (isLoading || !user) return null;

  const totalCount = paged?.totalCount ?? 0;
  const totalPages = paged?.totalPages ?? 1;

  return (
    <div style={{ padding: "1.5rem", minHeight: "100vh", backgroundColor: "#f8fafc" }}>

      {/* Back link */}
      <DashboardBackLink href="/dashboard/admin" label="العودة للوحة الإدارة" />

      {/* Title */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "#1a2e1a" }}>
          طلبات الاشتراك
        </h1>
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
          مراجعة طلبات الدفع وتفعيل الاشتراكات
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1.5rem" }}>
        {KPI_STATUSES.map(k => (
          <KpiCard
            key={k.key}
            label={k.label}
            count={kpiCounts[k.key] ?? 0}
            color={k.color}
            bg={k.bg}
            active={activeKpi === k.key}
            onClick={() => applyKpi(k.key)}
          />
        ))}
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: "#fff", borderRadius: 12, padding: "1rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)", marginBottom: "1.25rem",
        display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "flex-end",
      }}>
        <div style={{ flex: "1 1 140px" }}>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "0.3rem" }}>
            الحالة
          </label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectSt}>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "0.3rem" }}>
            طريقة الدفع
          </label>
          <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} style={selectSt}>
            {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 130px" }}>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "0.3rem" }}>
            من تاريخ
          </label>
          <input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            style={{ ...selectSt, width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ flex: "1 1 130px" }}>
          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "0.3rem" }}>
            إلى تاريخ
          </label>
          <input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            style={{ ...selectSt, width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <button
          onClick={applyFilters}
          type="button"
          style={{
            padding: "0.5rem 1.1rem", borderRadius: 8, border: "none",
            backgroundColor: "#1a2e1a", color: "#fff",
            fontSize: "0.82rem", fontWeight: 700, cursor: "pointer",
            height: 36, alignSelf: "flex-end",
          }}
        >
          بحث
        </button>
        <button
          onClick={resetFilters}
          type="button"
          style={{
            padding: "0.5rem 0.9rem", borderRadius: 8, border: "1.5px solid #e2e8f0",
            backgroundColor: "transparent", color: "#64748b",
            fontSize: "0.82rem", cursor: "pointer",
            height: 36, alignSelf: "flex-end",
          }}
        >
          إعادة ضبط
        </button>
      </div>

      {/* Results count */}
      <div style={{ marginBottom: "0.75rem", fontSize: "0.8rem", color: "#94a3b8" }}>
        {fetching ? "جارٍ التحميل..." : `${totalCount.toLocaleString("ar-SY")} طلب`}
      </div>

      {/* Error */}
      {fetchError && (
        <div style={{
          backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 10,
          padding: "0.85rem", color: "#b91c1c", fontSize: "0.85rem", marginBottom: "1rem",
        }}>
          {fetchError}
          <button onClick={() => load(page)} type="button"
            style={{ marginRight: "0.75rem", color: "#b91c1c", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {fetching && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{
              height: 64, borderRadius: 10,
              background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s infinite",
            }} />
          ))}
        </div>
      )}

      {/* Table */}
      {!fetching && !fetchError && (
        <div style={{
          backgroundColor: "#fff", borderRadius: 14,
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}>
          {items.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📭</div>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.88rem" }}>لا توجد طلبات تطابق الفلترة الحالية</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                    {["المعرّف","الباقة","المبلغ","طريقة الدفع","الحالة","التاريخ",""].map((h, i) => (
                      <th key={i} style={{
                        padding: "0.75rem 0.85rem", textAlign: "right",
                        fontWeight: 700, color: "#64748b", fontSize: "0.75rem",
                        textTransform: "uppercase", letterSpacing: "0.04em",
                        whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((req, idx) => {
                    const isSelected = selected?.id === req.id;
                    return (
                      <tr
                        key={req.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          backgroundColor: isSelected ? "#f0fdf4" : idx % 2 === 0 ? "#fff" : "#fafafa",
                          cursor: "pointer",
                          transition: "background-color 0.1s",
                        }}
                        onClick={() => setSelected(isSelected ? null : req)}
                      >
                        <td style={{ padding: "0.75rem 0.85rem", fontFamily: "monospace", color: "#64748b", fontSize: "0.72rem" }}>
                          #{shortId(req.id)}
                        </td>
                        <td style={{ padding: "0.75rem 0.85rem", fontWeight: 600, color: "#1e293b" }}>
                          {req.planName}
                        </td>
                        <td style={{ padding: "0.75rem 0.85rem", color: "#059669", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {fmtAmount(req.amount, req.currency)}
                        </td>
                        <td style={{ padding: "0.75rem 0.85rem", color: "#374151", whiteSpace: "nowrap" }}>
                          {PAYMENT_METHOD_ICON[req.paymentMethod]} {PAYMENT_METHOD_LABELS[req.paymentMethod] ?? req.paymentMethod}
                        </td>
                        <td style={{ padding: "0.75rem 0.85rem" }}>
                          <StatusBadge status={req.status} />
                        </td>
                        <td style={{ padding: "0.75rem 0.85rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
                          {fmtDate(req.createdAt)}
                        </td>
                        <td style={{ padding: "0.75rem 0.85rem", textAlign: "center" }}>
                          <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                            {isSelected ? "◀" : "▶"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!fetching && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
          <button
            onClick={() => load(page - 1, filtersRef.current)}
            disabled={page <= 1}
            type="button"
            style={{
              padding: "0.5rem 1rem", borderRadius: 8, border: "1.5px solid #e2e8f0",
              backgroundColor: page <= 1 ? "#f3f4f6" : "#fff",
              color: page <= 1 ? "#94a3b8" : "#1e293b",
              fontSize: "0.82rem", cursor: page <= 1 ? "default" : "pointer",
            }}
          >
            السابق
          </button>
          <span style={{ padding: "0.5rem 0.75rem", fontSize: "0.82rem", color: "#64748b" }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => load(page + 1, filtersRef.current)}
            disabled={page >= totalPages}
            type="button"
            style={{
              padding: "0.5rem 1rem", borderRadius: 8, border: "1.5px solid #e2e8f0",
              backgroundColor: page >= totalPages ? "#f3f4f6" : "#fff",
              color: page >= totalPages ? "#94a3b8" : "#1e293b",
              fontSize: "0.82rem", cursor: page >= totalPages ? "default" : "pointer",
            }}
          >
            التالي
          </button>
        </div>
      )}

      {/* Detail panel overlay background */}
      {selected && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 999,
            backgroundColor: "rgba(0,0,0,0.25)",
          }}
          onClick={() => setSelected(null)}
        />
      )}

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          req={selected}
          onClose={() => setSelected(null)}
          onUpdated={onUpdated}
        />
      )}

    </div>
  );
}
