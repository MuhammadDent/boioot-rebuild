"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { paymentRequestsApi } from "@/features/subscriptionPayments/api";
import {
  STATUS_META,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICON,
  CYCLE_LABELS,
} from "@/features/subscriptionPayments/constants";
import { normalizeError } from "@/lib/api";
import type { PaymentRequestResponse } from "@/features/subscriptionPayments/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-SY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAmount(amount: number, currency: string): string {
  if (amount === 0) return "مجاني";
  return `${amount.toLocaleString("ar-SY")} ${currency}`;
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as keyof typeof STATUS_META];
  if (!meta) return <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{status}</span>;

  return (
    <span style={{
      display: "inline-block",
      padding: "0.25rem 0.75rem",
      borderRadius: 20,
      backgroundColor: meta.bg,
      color: meta.color,
      fontSize: "0.75rem",
      fontWeight: 700,
    }}>
      {meta.label}
    </span>
  );
}

// ── RequestCard ───────────────────────────────────────────────────────────────

function RequestCard({
  req,
  onCancel,
}: {
  req: PaymentRequestResponse;
  onCancel: (id: string) => void;
}) {
  const meta = STATUS_META[req.status];
  const canCancel = ["Pending", "AwaitingPayment", "ReceiptUploaded"].includes(req.status);
  const isTerminal = ["Activated", "Cancelled", "Rejected"].includes(req.status);

  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: 14,
      padding: "1.25rem",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      border: req.status === "Activated"
        ? "1.5px solid #bbf7d0"
        : req.status === "Rejected"
          ? "1.5px solid #fca5a5"
          : "1.5px solid #e2e8f0",
    }}>
      {/* Top row: plan name + status */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.85rem" }}>
        <div>
          <p style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#1a2e1a" }}>
            {req.planName}
          </p>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>
            {formatAmount(req.amount, req.currency)}
            {" · "}
            {CYCLE_LABELS[req.billingCycle] ?? req.billingCycle}
          </p>
        </div>
        <StatusBadge status={req.status} />
      </div>

      {/* Details grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.5rem 1rem",
        fontSize: "0.8rem",
        color: "#64748b",
        marginBottom: "0.85rem",
      }}>
        <div>
          <span style={{ color: "#94a3b8" }}>طريقة الدفع: </span>
          <span style={{ fontWeight: 600, color: "#374151" }}>
            {PAYMENT_METHOD_ICON[req.paymentMethod]} {PAYMENT_METHOD_LABELS[req.paymentMethod] ?? req.paymentMethod}
          </span>
        </div>
        <div>
          <span style={{ color: "#94a3b8" }}>تاريخ الإنشاء: </span>
          <span style={{ fontWeight: 600, color: "#374151" }}>{formatDate(req.createdAt)}</span>
        </div>
        {req.salesRepresentativeName && (
          <div>
            <span style={{ color: "#94a3b8" }}>المندوب: </span>
            <span style={{ fontWeight: 600, color: "#374151" }}>{req.salesRepresentativeName}</span>
          </div>
        )}
        {req.reviewedAt && (
          <div>
            <span style={{ color: "#94a3b8" }}>تاريخ المراجعة: </span>
            <span style={{ fontWeight: 600, color: "#374151" }}>{formatDate(req.reviewedAt)}</span>
          </div>
        )}
        {req.activatedAt && (
          <div>
            <span style={{ color: "#94a3b8" }}>تاريخ التفعيل: </span>
            <span style={{ fontWeight: 600, color: "#374151" }}>{formatDate(req.activatedAt)}</span>
          </div>
        )}
      </div>

      {/* Status note */}
      {meta && !isTerminal && (
        <div style={{
          backgroundColor: meta.bg,
          borderRadius: 8,
          padding: "0.6rem 0.85rem",
          marginBottom: "0.85rem",
          fontSize: "0.8rem",
          color: meta.color,
        }}>
          {meta.note}
        </div>
      )}

      {/* Rejection note */}
      {req.status === "Rejected" && req.reviewNote && (
        <div style={{
          backgroundColor: "#fee2e2",
          border: "1px solid #fca5a5",
          borderRadius: 8,
          padding: "0.7rem 0.85rem",
          marginBottom: "0.85rem",
          fontSize: "0.82rem",
          color: "#b91c1c",
        }}>
          <strong>سبب الرفض: </strong>{req.reviewNote}
        </div>
      )}

      {/* Rejection: create new request CTA */}
      {req.status === "Rejected" && (
        <Link
          href="/dashboard/subscription/plans"
          style={{
            display: "inline-block",
            padding: "0.55rem 1.25rem",
            borderRadius: 8,
            backgroundColor: "#1a2e1a",
            color: "#fff",
            fontSize: "0.82rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          إنشاء طلب جديد
        </Link>
      )}

      {/* Activated: link to dashboard */}
      {req.status === "Activated" && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>
            🎉 اشتراكك نشط — استمتع بجميع مزايا الباقة
          </span>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              padding: "0.45rem 1rem",
              borderRadius: 8,
              backgroundColor: "#059669",
              color: "#fff",
              fontSize: "0.8rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            لوحة التحكم
          </Link>
        </div>
      )}

      {/* Cancel button */}
      {canCancel && (
        <div style={{ marginTop: req.status === "Rejected" ? 0 : "0.25rem", display: "flex", justifyContent: "flex-start" }}>
          <button
            onClick={() => onCancel(req.id)}
            type="button"
            style={{
              padding: "0.45rem 1rem",
              borderRadius: 8,
              border: "1.5px solid #fca5a5",
              backgroundColor: "transparent",
              color: "#b91c1c",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            إلغاء الطلب
          </button>
        </div>
      )}
    </div>
  );
}

// ── CancelConfirmModal ────────────────────────────────────────────────────────

function CancelConfirmModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      backgroundColor: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: "1.75rem",
        maxWidth: 380,
        width: "100%",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>⚠️</div>
        <h3 style={{ margin: "0 0 0.6rem", fontSize: "1rem", fontWeight: 800, color: "#1a2e1a" }}>
          إلغاء الطلب
        </h3>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#64748b", lineHeight: 1.6 }}>
          هل أنت متأكد من إلغاء طلب الاشتراك هذا؟ لا يمكن التراجع عن هذا القرار.
        </p>
        <div style={{ display: "flex", gap: "0.65rem" }}>
          <button
            onClick={onCancel}
            type="button"
            disabled={loading}
            style={{
              flex: 1,
              padding: "0.7rem",
              borderRadius: 10,
              border: "1.5px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              color: "#475569",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            تراجع
          </button>
          <button
            onClick={onConfirm}
            type="button"
            disabled={loading}
            style={{
              flex: 1,
              padding: "0.7rem",
              borderRadius: 10,
              border: "none",
              backgroundColor: loading ? "#94a3b8" : "#b91c1c",
              color: "#fff",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
            }}
          >
            {loading ? "جارٍ الإلغاء..." : "تأكيد الإلغاء"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MyRequestsPage() {
  const { user, isLoading } = useProtectedRoute();

  const [requests, setRequests]   = useState<PaymentRequestResponse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [cancelId, setCancelId]   = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentRequestsApi.getMyRequests();
      setRequests(data);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadRequests();
  }, [user, loadRequests]);

  async function confirmCancel() {
    if (!cancelId) return;
    setCancelling(true);
    try {
      const updated = await paymentRequestsApi.cancel(cancelId);
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
      setCancelId(null);
    } catch (err) {
      alert(normalizeError(err));
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading || !user) return null;

  // Sort: active ones first, then by date
  const sortedRequests = [...requests].sort((a, b) => {
    const activeStatuses = ["Pending", "AwaitingPayment", "ReceiptUploaded", "UnderReview", "Approved"];
    const aIsActive = activeStatuses.includes(a.status);
    const bIsActive = activeStatuses.includes(b.status);
    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 0 3rem" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.65rem", fontWeight: 800, color: "#1a2e1a" }}>
            طلبات الاشتراك
          </h1>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            تابع حالة طلباتك واشتراكاتك
          </p>
        </div>
        <Link
          href="/dashboard/subscription/plans"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.6rem 1.1rem",
            borderRadius: 9,
            backgroundColor: "#1a2e1a",
            color: "#fff",
            fontSize: "0.85rem",
            fontWeight: 700,
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          + طلب جديد
        </Link>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                height: 160,
                borderRadius: 14,
                background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
              }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{
          backgroundColor: "#fee2e2",
          border: "1px solid #fca5a5",
          borderRadius: 12,
          padding: "1rem",
          color: "#b91c1c",
          fontSize: "0.88rem",
          textAlign: "center",
        }}>
          {error}
          <button
            onClick={loadRequests}
            type="button"
            style={{ marginRight: "0.75rem", color: "#b91c1c", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: "0.88rem" }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && sortedRequests.length === 0 && (
        <div style={{
          backgroundColor: "#fff",
          borderRadius: 14,
          padding: "3rem 1.5rem",
          textAlign: "center",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>📭</div>
          <h3 style={{ margin: "0 0 0.4rem", fontSize: "1rem", fontWeight: 700, color: "#374151" }}>
            لا توجد طلبات بعد
          </h3>
          <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", color: "#94a3b8" }}>
            لم تقم بأي طلب اشتراك حتى الآن
          </p>
          <Link
            href="/dashboard/subscription/plans"
            style={{
              display: "inline-block",
              padding: "0.7rem 1.5rem",
              borderRadius: 9,
              backgroundColor: "#059669",
              color: "#fff",
              fontSize: "0.88rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            تصفح الباقات
          </Link>
        </div>
      )}

      {/* Requests list */}
      {!loading && !error && sortedRequests.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {sortedRequests.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              onCancel={id => setCancelId(id)}
            />
          ))}
        </div>
      )}

      {/* Cancel confirmation modal */}
      {cancelId && (
        <CancelConfirmModal
          onConfirm={confirmCancel}
          onCancel={() => setCancelId(null)}
          loading={cancelling}
        />
      )}

    </div>
  );
}
