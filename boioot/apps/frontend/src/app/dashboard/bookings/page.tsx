"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { bookingsApi } from "@/features/bookings/api";
import { getBookingStatusConfig, normalizeBookingStatus } from "@/features/bookings/bookingStatusConfig";
import { normalizeError } from "@/lib/api";
import { api } from "@/lib/api";
import type { BookingResponse, BookingStatus } from "@/types";
import Spinner from "@/components/ui/Spinner";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";

const OWNER_TABS: Array<{ status: BookingStatus; label: string }> = [
  { status: "PendingApproval",              label: "طلبات جديدة" },
  { status: "ApprovedAwaitingPaymentProof", label: "بانتظار الدفع" },
  { status: "PaymentProofSubmitted",        label: "مراجعة الدفع" },
  { status: "Confirmed",                    label: "مؤكدة" },
  { status: "Rejected",                     label: "مرفوضة" },
  { status: "CancelledByTenant",            label: "ملغاة" },
  { status: "Completed",                    label: "مكتملة" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(value: number) {
  return value.toLocaleString("en") + " ل.س";
}

function getNightCount(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.round(diff / 86_400_000);
}

function parseProofUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

function StatusBadge({ status }: { status: string }) {
  const cfg = getBookingStatusConfig(normalizeBookingStatus(status));
  return (
    <span style={{ borderRadius: 999, padding: "0.25rem 0.7rem", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: "0.78rem", fontWeight: 800 }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ProofUploadSection({
  bookingId,
  onSuccess,
}: {
  bookingId: string;
  onSuccess: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUploadFiles() {
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const newUrls: string[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const { url } = await api.upload<{ url: string; fileName: string }>("/upload/proof", form);
        newUrls.push(url);
      }
      setUploadedUrls((prev) => [...prev, ...newUrls]);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(normalizeError(err) || "تعذّر رفع الملف");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    if (uploadedUrls.length === 0) {
      setError("يرجى رفع صورة إثبات الدفع أولاً");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await bookingsApi.submitProof(bookingId, { proofUrls: uploadedUrls, note: note || undefined });
      onSuccess();
    } catch (err) {
      setError(normalizeError(err) || "تعذّر إرسال إثبات الدفع");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: "1rem", border: "1px solid #bfdbfe", borderRadius: 12, padding: "1rem", background: "#eff6ff" }}>
      <p style={{ margin: "0 0 0.75rem", fontWeight: 800, color: "#1d4ed8", fontSize: "0.9rem" }}>
        💳 تمت الموافقة المبدئية — يرجى رفع إثبات التحويل لإكمال الحجز
      </p>

      {uploadedUrls.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <p style={{ margin: "0 0 0.4rem", fontSize: "0.82rem", color: "#1d4ed8", fontWeight: 700 }}>الصور المرفوعة:</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {uploadedUrls.map((url, i) => (
              <div key={i} style={{ position: "relative", width: 72, height: 72, borderRadius: 8, overflow: "hidden", border: "1px solid #bfdbfe" }}>
                <Image src={url} alt={`إثبات ${i + 1}`} fill style={{ objectFit: "cover" }} sizes="72px" unoptimized />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: "0.6rem" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          style={{ fontSize: "0.82rem", marginBottom: "0.4rem", display: "block" }}
        />
        {files.length > 0 && (
          <button
            type="button"
            onClick={handleUploadFiles}
            disabled={uploading}
            style={{ border: "1px solid #93c5fd", borderRadius: 8, padding: "0.4rem 0.85rem", background: "#fff", color: "#1d4ed8", fontWeight: 800, cursor: uploading ? "not-allowed" : "pointer", fontSize: "0.82rem" }}
          >
            {uploading ? "جاري الرفع..." : `رفع ${files.length} ملف`}
          </button>
        )}
      </div>

      <textarea
        placeholder="ملاحظة للمالك (اختياري)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        maxLength={500}
        style={{ width: "100%", padding: "0.55rem 0.7rem", border: "1px solid #bfdbfe", borderRadius: 8, fontSize: "0.82rem", marginBottom: "0.6rem", resize: "vertical" }}
      />

      {error && <p style={{ margin: "0 0 0.6rem", color: "#b91c1c", fontSize: "0.82rem" }}>{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || uploadedUrls.length === 0}
        style={{ border: "none", borderRadius: 9, padding: "0.55rem 1.1rem", background: uploadedUrls.length === 0 ? "#94a3b8" : "var(--color-primary)", color: "#fff", fontWeight: 800, cursor: (submitting || uploadedUrls.length === 0) ? "not-allowed" : "pointer", fontSize: "0.85rem" }}
      >
        {submitting ? "جاري الإرسال..." : "إرسال إثبات الدفع"}
      </button>
    </div>
  );
}

function BookingCard({
  booking,
  mode,
  busy,
  onApprove,
  onReject,
  onConfirm,
  onRejectProof,
  onCancel,
  onCancelOwner,
  onRefresh,
}: {
  booking: BookingResponse;
  mode: "owner" | "renter";
  busy: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onConfirm?: (id: string) => void;
  onRejectProof?: (id: string) => void;
  onCancel?: (id: string) => void;
  onCancelOwner?: (id: string) => void;
  onRefresh?: () => void;
}) {
  const normalizedStatus = normalizeBookingStatus(booking.status);
  const nights = getNightCount(booking.startDate, booking.endDate);
  const finalTotal = booking.totalAmount + booking.commissionAmount;
  const proofUrls = parseProofUrls(booking.paymentProofUrls);

  const isPending     = normalizedStatus === "PendingApproval";
  const isAwaitProof  = normalizedStatus === "ApprovedAwaitingPaymentProof" || normalizedStatus === "Approved";
  const isProofSub    = normalizedStatus === "PaymentProofSubmitted";
  const isConfirmed   = normalizedStatus === "Confirmed";
  const isCancellable = isPending || isAwaitProof || isProofSub;

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "1rem", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <Link href={`/properties/${booking.propertyId}`} style={{ color: "#0f172a", fontWeight: 800, textDecoration: "none" }}>
            {booking.propertyTitle || "عقار"}
          </Link>
          <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.86rem" }}>
            من {formatDate(booking.startDate)} إلى {formatDate(booking.endDate)}
          </p>
        </div>
        <StatusBadge status={normalizedStatus} />
      </div>

      <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.35rem", color: "#334155", fontSize: "0.86rem" }}>
        <span>الضيف: {booking.guestName}</span>
        {(booking.guestCount ?? 1) > 1 && <span>عدد الضيوف: {booking.guestCount}</span>}
        {booking.phone && <span dir="ltr" style={{ textAlign: "right" }}>الهاتف: {booking.phone}</span>}
        {booking.notes && <span>ملاحظات: {booking.notes}</span>}
        <span>السعر: {(nights || 1).toLocaleString("en")} ليلة × {formatMoney(booking.pricePerNight)}</span>
        <strong style={{ color: "#0f172a" }}>الإجمالي: {formatMoney(booking.totalAmount)}</strong>
        <span>عمولة المنصة ({booking.commissionPercent}%): {formatMoney(booking.commissionAmount)}</span>
        <strong style={{ color: "#0f172a" }}>الإجمالي النهائي: {formatMoney(finalTotal)}</strong>
        <span>حالة الدفع: {booking.paymentStatus === "ReadyForPayment" ? "جاهز للدفع" : booking.paymentStatus === "Paid" ? "مدفوع" : booking.paymentStatus === "Refunded" ? "مسترد" : "غير مدفوع"}</span>
      </div>

      {mode === "owner" && isProofSub && proofUrls.length > 0 && (
        <div style={{ marginTop: "0.85rem", borderTop: "1px solid #e2e8f0", paddingTop: "0.75rem" }}>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", fontWeight: 800, color: "#334155" }}>📎 إثبات الدفع المرفوع:</p>
          {booking.paymentProofNote && (
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", color: "#475569" }}>ملاحظة المستأجر: {booking.paymentProofNote}</p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {proofUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0", position: "relative" }}>
                <Image src={url} alt={`إثبات ${i + 1}`} fill style={{ objectFit: "cover" }} sizes="80px" unoptimized />
              </a>
            ))}
          </div>
        </div>
      )}

      {mode === "owner" && isPending && (
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={() => onApprove?.(booking.id)} disabled={busy}
            style={{ border: "none", borderRadius: 9, padding: "0.55rem 1rem", background: "var(--color-primary)", color: "#fff", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
            موافقة مبدئية
          </button>
          <button onClick={() => onReject?.(booking.id)} disabled={busy}
            style={{ border: "1px solid #fecaca", borderRadius: 9, padding: "0.55rem 1rem", background: "#fff", color: "#b91c1c", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
            رفض
          </button>
        </div>
      )}

      {mode === "owner" && isAwaitProof && (
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={() => onReject?.(booking.id)} disabled={busy}
            style={{ border: "1px solid #fecaca", borderRadius: 9, padding: "0.55rem 1rem", background: "#fff", color: "#b91c1c", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
            رفض الطلب
          </button>
          <button onClick={() => onCancelOwner?.(booking.id)} disabled={busy}
            style={{ border: "1px solid #cbd5e1", borderRadius: 9, padding: "0.55rem 1rem", background: "#fff", color: "#475569", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
            إلغاء
          </button>
        </div>
      )}

      {mode === "owner" && isProofSub && (
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={() => onConfirm?.(booking.id)} disabled={busy}
            style={{ border: "none", borderRadius: 9, padding: "0.55rem 1rem", background: "#166534", color: "#fff", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
            ✅ تأكيد الحجز
          </button>
          <button onClick={() => onRejectProof?.(booking.id)} disabled={busy}
            style={{ border: "1px solid #fde68a", borderRadius: 9, padding: "0.55rem 1rem", background: "#fffbeb", color: "#b45309", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
            طلب مراجعة الدفع
          </button>
          <button onClick={() => onReject?.(booking.id)} disabled={busy}
            style={{ border: "1px solid #fecaca", borderRadius: 9, padding: "0.55rem 1rem", background: "#fff", color: "#b91c1c", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
            رفض
          </button>
        </div>
      )}

      {mode === "renter" && isConfirmed && (
        <div style={{ marginTop: "0.85rem", border: "1px solid #bbf7d0", borderRadius: 10, padding: "0.65rem 0.85rem", background: "#f0fdf4", color: "#166534", fontWeight: 800, fontSize: "0.86rem" }}>
          ✅ تم تأكيد الحجز
        </div>
      )}

      {mode === "renter" && isAwaitProof && onRefresh && (
        <ProofUploadSection bookingId={booking.id} onSuccess={onRefresh} />
      )}

      {mode === "renter" && isProofSub && (
        <div style={{ marginTop: "0.85rem", border: "1px solid #bfdbfe", borderRadius: 10, padding: "0.65rem 0.85rem", background: "#eff6ff", color: "#1d4ed8", fontWeight: 800, fontSize: "0.86rem" }}>
          📎 تم إرسال إثبات الدفع — في انتظار مراجعة المالك
        </div>
      )}

      {mode === "renter" && isCancellable && (
        <div style={{ marginTop: "1rem" }}>
          <button onClick={() => onCancel?.(booking.id)} disabled={busy}
            style={{ border: "1px solid #cbd5e1", borderRadius: 9, padding: "0.55rem 1rem", background: "#fff", color: "#475569", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
            إلغاء الطلب
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardBookingsPage() {
  const [incoming, setIncoming] = useState<BookingResponse[]>([]);
  const [mine, setMine]         = useState<BookingResponse[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [busyId, setBusyId]     = useState<string | null>(null);
  const [ownerTab, setOwnerTab] = useState<BookingStatus>("PendingApproval");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ownerBookings, renterBookings] = await Promise.all([
        bookingsApi.forMyProperties(),
        bookingsApi.mine(),
      ]);
      setIncoming(ownerBookings.map((b) => ({ ...b, status: normalizeBookingStatus(b.status) })));
      setMine(renterBookings.map((b) => ({ ...b, status: normalizeBookingStatus(b.status) })));
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateBooking(id: string, action: "approve" | "reject" | "confirm" | "rejectProof" | "cancel" | "cancelOwner") {
    setBusyId(id);
    setError("");
    try {
      if (action === "approve")      await bookingsApi.approve(id);
      if (action === "reject")       await bookingsApi.reject(id);
      if (action === "confirm")      await bookingsApi.confirmPayment(id);
      if (action === "rejectProof")  await bookingsApi.rejectProof(id);
      if (action === "cancel")       await bookingsApi.cancel(id);
      if (action === "cancelOwner")  await bookingsApi.cancelOwner(id);
      await load();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  const visibleIncoming = incoming.filter((b) => normalizeBookingStatus(b.status) === ownerTab);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 0 3rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
        <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#0f172a" }}>الحجوزات</h1>
        <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.9rem" }}>
          إدارة طلبات الحجز وحالة حجوزاتك.
        </p>
      </div>

      {error && (
        <div style={{ marginBottom: "1rem", border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", borderRadius: 12, padding: "0.8rem 1rem", fontWeight: 700 }}>
          {error}
        </div>
      )}

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ margin: "0 0 0.85rem", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>طلبات واردة لعقاراتي</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.9rem" }}>
          {OWNER_TABS.map((tab) => {
            const cfg = getBookingStatusConfig(tab.status);
            const count = incoming.filter((b) => normalizeBookingStatus(b.status) === tab.status).length;
            const active = ownerTab === tab.status;
            return (
              <button key={tab.status} type="button" onClick={() => setOwnerTab(tab.status)}
                style={{ border: `1px solid ${active ? cfg.border : "#e2e8f0"}`, borderRadius: 999, padding: "0.45rem 0.85rem", background: active ? cfg.bg : "#fff", color: active ? cfg.color : "#475569", fontWeight: 800, cursor: "pointer" }}>
                {cfg.icon} {tab.label} ({count})
              </button>
            );
          })}
        </div>
        {visibleIncoming.length === 0 ? (
          <div style={{ background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 14, padding: "1rem", color: "#64748b" }}>
            لا توجد طلبات {OWNER_TABS.find((t) => t.status === ownerTab)?.label ?? ""} حالياً.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {visibleIncoming.map((booking) => (
              <BookingCard key={booking.id} booking={booking} mode="owner" busy={busyId === booking.id}
                onApprove={(id) => updateBooking(id, "approve")}
                onReject={(id) => updateBooking(id, "reject")}
                onConfirm={(id) => updateBooking(id, "confirm")}
                onRejectProof={(id) => updateBooking(id, "rejectProof")}
                onCancelOwner={(id) => updateBooking(id, "cancelOwner")}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ margin: "0 0 0.85rem", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>حجوزاتي</h2>
        {mine.length === 0 ? (
          <div style={{ background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 14, padding: "1rem", color: "#64748b" }}>
            لم ترسل أي طلب حجز بعد.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {mine.map((booking) => (
              <BookingCard key={booking.id} booking={booking} mode="renter" busy={busyId === booking.id}
                onCancel={(id) => updateBooking(id, "cancel")}
                onRefresh={load}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
