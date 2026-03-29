"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { paymentRequestsApi } from "@/features/subscriptionPayments/api";
import {
  STATUS_META,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_ICON,
  CYCLE_LABELS,
} from "@/features/subscriptionPayments/constants";
import { api, normalizeError } from "@/lib/api";
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

// ── ReceiptUploadSection ──────────────────────────────────────────────────────

const RECEIPT_METHODS = ["bank_transfer", "receipt_upload"];

function ReceiptUploadSection({
  requestId,
  onUpdate,
}: {
  requestId: string;
  onUpdate: (req: PaymentRequestResponse) => void;
}) {
  const fileInputRef                      = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile]   = useState<File | null>(null);
  const [preview, setPreview]             = useState<string | null>(null);
  const [uploading, setUploading]         = useState(false);
  const [uploadError, setUploadError]     = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("حجم الملف كبير جداً. الحد الأقصى 5 ميغابايت.");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setUploadError("نوع الملف غير مدعوم. يُقبل: JPG، PNG، PDF.");
      return;
    }

    setUploadError(null);
    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", selectedFile);
      const { url } = await api.postForm<{ url: string; fileName: string }>("/upload/proof", form);
      const updated = await paymentRequestsApi.uploadReceipt(requestId, {
        receiptImageUrl: url,
      });
      onUpdate(updated);
    } catch (err) {
      setUploadError(normalizeError(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{
      marginTop: "0.85rem",
      backgroundColor: "#fffbeb",
      border: "1.5px solid #fde68a",
      borderRadius: 10,
      padding: "0.9rem",
    }}>
      <p style={{ margin: "0 0 0.65rem", fontSize: "0.82rem", fontWeight: 700, color: "#92400e" }}>
        📎 يرجى رفع إيصال الدفع لإكمال الاشتراك
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {!selectedFile ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          type="button"
          style={{
            width: "100%",
            padding: "0.65rem",
            borderRadius: 8,
            border: "1.5px dashed #fbbf24",
            backgroundColor: "#fef9c3",
            color: "#92400e",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          اختر صورة الإيصال أو ملف PDF (حتى 5 ميغابايت)
        </button>
      ) : (
        <div>
          {preview && (
            <img
              src={preview}
              alt="معاينة الإيصال"
              style={{
                width: "100%",
                maxHeight: 180,
                objectFit: "contain",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                marginBottom: "0.6rem",
                backgroundColor: "#f8fafc",
              }}
            />
          )}
          {!preview && selectedFile && (
            <div style={{
              padding: "0.55rem 0.85rem",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: "0.8rem",
              color: "#374151",
              marginBottom: "0.6rem",
            }}>
              📄 {selectedFile.name}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              type="button"
              disabled={uploading}
              style={{
                flex: 1,
                padding: "0.6rem",
                borderRadius: 8,
                border: "1.5px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                color: "#64748b",
                fontSize: "0.8rem",
                cursor: uploading ? "default" : "pointer",
              }}
            >
              تغيير
            </button>
            <button
              onClick={handleUpload}
              type="button"
              disabled={uploading}
              style={{
                flex: 2,
                padding: "0.6rem",
                borderRadius: 8,
                border: "none",
                backgroundColor: uploading ? "#94a3b8" : "#059669",
                color: "#fff",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: uploading ? "default" : "pointer",
              }}
            >
              {uploading ? "جارٍ الرفع..." : "رفع الإيصال"}
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "#b91c1c" }}>
          {uploadError}
        </p>
      )}
    </div>
  );
}

// ── RequestCard ───────────────────────────────────────────────────────────────

function RequestCard({
  req,
  onCancel,
  onUpdate,
}: {
  req: PaymentRequestResponse;
  onCancel: (id: string) => void;
  onUpdate: (req: PaymentRequestResponse) => void;
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

      {/* Receipt upload section — Pending / AwaitingPayment with receipt methods */}
      {(req.status === "Pending" || req.status === "AwaitingPayment") &&
        RECEIPT_METHODS.includes(req.paymentMethod) && (
        <ReceiptUploadSection
          requestId={req.id}
          onUpdate={onUpdate}
        />
      )}

      {/* Uploaded receipt preview — ReceiptUploaded */}
      {req.status === "ReceiptUploaded" && req.receiptImageUrl && (
        <div style={{
          marginTop: "0.7rem",
          marginBottom: "0.85rem",
          backgroundColor: "#f0fdf4",
          border: "1.5px solid #bbf7d0",
          borderRadius: 10,
          padding: "0.8rem",
        }}>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", fontWeight: 700, color: "#166534" }}>
            ✅ تم رفع الإيصال — بانتظار المراجعة
          </p>
          {/\.(jpe?g|png|webp|gif)$/i.test(req.receiptImageUrl) || req.receiptImageUrl.startsWith("data:image") ? (
            <img
              src={req.receiptImageUrl}
              alt="الإيصال المرفوع"
              style={{
                width: "100%",
                maxHeight: 180,
                objectFit: "contain",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                backgroundColor: "#fff",
              }}
            />
          ) : (
            <a
              href={req.receiptImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "0.8rem", color: "#059669", textDecoration: "underline" }}
            >
              📄 {req.receiptFileName ?? "عرض الإيصال"}
            </a>
          )}
        </div>
      )}

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
      setError(normalizeError(err));
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
              onUpdate={updated =>
                setRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
              }
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
