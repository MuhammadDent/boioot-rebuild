"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { paymentRequestsApi } from "@/features/subscriptionPayments/api";
import {
  STATUS_META,
  CYCLE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/features/subscriptionPayments/constants";
import type { PaymentRequestResponse, SubscriptionRequestActionResponse } from "@/features/subscriptionPayments/types";

// ─── Decision meta ────────────────────────────────────────────────────────────

const DECISION_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  approved:     { icon: "🎉", label: "موافقة",          color: "#166534", bg: "#dcfce7" },
  rejected:     { icon: "❌", label: "رفض",             color: "#b91c1c", bg: "#fee2e2" },
  missing_info: { icon: "📋", label: "طلب استكمال",     color: "#92400e", bg: "#fef3c7" },
  notify:       { icon: "📢", label: "إشعار",           color: "#1d4ed8", bg: "#dbeafe" },
};

// ─── Date formatting ──────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("ar-SY", { dateStyle: "medium", timeStyle: "short" });
}

// ─── Single admin action card ─────────────────────────────────────────────────

function ActionCard({ action }: { action: SubscriptionRequestActionResponse }) {
  const dm = DECISION_META[action.decision] ?? DECISION_META["notify"];

  return (
    <div
      style={{
        background:   dm.bg,
        border:       `1px solid ${dm.color}33`,
        borderRadius: "10px",
        padding:      "14px 16px",
        marginBottom: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "18px" }}>{dm.icon}</span>
        <span
          style={{
            fontSize:     "12px",
            fontWeight:   700,
            color:        dm.color,
            background:   `${dm.color}18`,
            padding:      "2px 8px",
            borderRadius: "999px",
          }}
        >
          {dm.label}
        </span>
        <span style={{ fontSize: "11px", color: "#6b7280", marginRight: "auto" }}>
          {fmtDate(action.createdAt)}
        </span>
      </div>

      {action.title && (
        <p style={{ margin: "0 0 6px", fontSize: "13px", fontWeight: 700, color: "#111827" }}>
          {action.title}
        </p>
      )}
      {action.note && (
        <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
          {action.note}
        </p>
      )}
      {action.performedByName && (
        <p style={{ margin: "8px 0 0", fontSize: "11px", color: "#9ca3af" }}>
          بواسطة: {action.performedByName}
        </p>
      )}
    </div>
  );
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: "12px", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
      <span style={{ fontSize: "12px", color: "#6b7280", width: "120px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#111827", fontWeight: 500, flex: 1 }}>{value}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  requestId: string;
  onClose: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SubscriptionRequestDetailModal({ requestId, onClose }: Props) {
  const router = useRouter();
  const [data,    setData]    = useState<PaymentRequestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    paymentRequestsApi.getById(requestId)
      .then(setData)
      .catch(() => setError("تعذّر تحميل تفاصيل الطلب. يرجى المحاولة مرة أخرى."))
      .finally(() => setLoading(false));
  }, [requestId]);

  const statusMeta = data ? STATUS_META[data.status] : null;

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     "rgba(0,0,0,0.5)",
        zIndex:         99999,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "16px",
        overflowY:      "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background:   "#fff",
          borderRadius: "16px",
          boxShadow:    "0 16px 48px rgba(0,0,0,0.18)",
          width:        "100%",
          maxWidth:     "520px",
          direction:    "rtl",
          maxHeight:    "90vh",
          overflowY:    "auto",
          display:      "flex",
          flexDirection:"column",
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div
          style={{
            padding:      "20px 24px 16px",
            borderBottom: "1px solid #f3f4f6",
            position:     "sticky",
            top:          0,
            background:   "#fff",
            zIndex:       1,
            borderRadius: "16px 16px 0 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111827" }}>
              تفاصيل طلب الاشتراك
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none", border: "none",
                fontSize: "20px", cursor: "pointer",
                color: "#6b7280", lineHeight: 1, padding: "4px",
              }}
              aria-label="إغلاق"
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "20px 24px", flex: 1 }}>

          {/* Loading */}
          {loading && (
            <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>
              جاري التحميل...
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div
              style={{
                padding:      "20px",
                background:   "#fee2e2",
                borderRadius: "10px",
                textAlign:    "center",
                color:        "#b91c1c",
                fontSize:     "14px",
              }}
            >
              {error}
            </div>
          )}

          {/* Data */}
          {!loading && data && (
            <>
              {/* Status badge */}
              {statusMeta && (
                <div
                  style={{
                    display:      "inline-flex",
                    alignItems:   "center",
                    gap:          "6px",
                    background:   statusMeta.bg,
                    color:        statusMeta.color,
                    borderRadius: "999px",
                    padding:      "5px 14px",
                    fontSize:     "13px",
                    fontWeight:   700,
                    marginBottom: "16px",
                  }}
                >
                  {statusMeta.label}
                </div>
              )}

              {/* Request info */}
              <div style={{ marginBottom: "20px" }}>
                <Row
                  label="الباقة"
                  value={data.planDisplayNameAr || data.planName}
                />
                <Row
                  label="دورة الفوترة"
                  value={CYCLE_LABELS[data.billingCycle] ?? data.billingCycle}
                />
                <Row
                  label="المبلغ"
                  value={`${data.amount.toLocaleString("ar-SY")} ${data.currency}`}
                />
                <Row
                  label="طريقة الدفع"
                  value={PAYMENT_METHOD_LABELS[data.paymentMethod] ?? data.paymentMethod}
                />
                <Row
                  label="تاريخ الطلب"
                  value={fmtDate(data.createdAt)}
                />
                {data.reviewedAt && (
                  <Row label="تاريخ المراجعة" value={fmtDate(data.reviewedAt)} />
                )}
                {data.activatedAt && (
                  <Row label="تاريخ التفعيل" value={fmtDate(data.activatedAt)} />
                )}
                {data.reviewNote && (
                  <Row label="ملاحظة المراجعة" value={data.reviewNote} />
                )}
                {data.customerNote && (
                  <Row label="ملاحظتك" value={data.customerNote} />
                )}
              </div>

              {/* Admin replies (actions) */}
              {data.actions.length > 0 && (
                <div>
                  <p
                    style={{
                      margin:       "0 0 12px",
                      fontSize:     "13px",
                      fontWeight:   700,
                      color:        "#374151",
                    }}
                  >
                    ردود فريق بويوت ({data.actions.length})
                  </p>
                  {/* Show most recent first */}
                  {[...data.actions]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(action => (
                      <ActionCard key={action.id} action={action} />
                    ))
                  }
                </div>
              )}

              {data.actions.length === 0 && (
                <div
                  style={{
                    padding:      "20px",
                    background:   "#f9fafb",
                    borderRadius: "10px",
                    textAlign:    "center",
                    color:        "#9ca3af",
                    fontSize:     "13px",
                  }}
                >
                  لا توجد ردود من الفريق حتى الآن
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding:      "16px 24px",
            borderTop:    "1px solid #f3f4f6",
            display:      "flex",
            gap:          "8px",
            justifyContent: "flex-end",
            position:     "sticky",
            bottom:       0,
            background:   "#fff",
            borderRadius: "0 0 16px 16px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding:      "9px 18px",
              borderRadius: "8px",
              border:       "1px solid #e5e7eb",
              background:   "#fff",
              color:        "#374151",
              fontSize:     "13px",
              fontWeight:   600,
              cursor:       "pointer",
            }}
          >
            العودة للإشعارات
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/dashboard/subscription/requests");
            }}
            style={{
              padding:      "9px 18px",
              borderRadius: "8px",
              border:       "none",
              background:   "#16a34a",
              color:        "#fff",
              fontSize:     "13px",
              fontWeight:   600,
              cursor:       "pointer",
            }}
          >
            كل طلباتي
          </button>
        </div>
      </div>
    </div>
  );
}
