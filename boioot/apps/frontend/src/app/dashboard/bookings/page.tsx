"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { bookingsApi } from "@/features/bookings/api";
import { reviewsApi } from "@/features/reviews/api";
import { getBookingStatusConfig, normalizeBookingStatus } from "@/features/bookings/bookingStatusConfig";
import { normalizeError } from "@/lib/api";
import { api } from "@/lib/api";
import type { BookingResponse, BookingStatus, BookingReviewStatus, TenantReviewData, OwnerReviewData } from "@/types";
import Spinner from "@/components/ui/Spinner";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";

const OWNER_TABS: Array<{ status: BookingStatus; label: string }> = [
  { status: "PendingApproval",              label: "طلبات جديدة" },
  { status: "ApprovedAwaitingPaymentProof", label: "بانتظار الدفع" },
  { status: "PaymentProofSubmitted",        label: "مراجعة الدفع" },
  { status: "RevisionRequested",            label: "طلبات تعديل" },
  { status: "Confirmed",                    label: "مؤكدة" },
  { status: "Rejected",                     label: "مرفوضة" },
  { status: "CancelledByTenant",            label: "ملغاة" },
  { status: "Completed",                    label: "مكتملة" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" });
}

function formatMoney(value: number, currency?: string): string {
  const cur = (currency ?? "SYP").toUpperCase().trim();
  if (cur === "USD") {
    return "$" + value.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
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

function UploadSpinner() {
  return (
    <svg
      className="animate-spin h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

function fileIcon(mimeType: string): string {
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.startsWith("image/")) return "🖼️";
  return "📎";
}

type FileEntry = {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  url?: string;
  errorMsg?: string;
};

function FileRow({
  entry,
  onRemove,
}: {
  entry: FileEntry;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-all">
      <span className="text-xl shrink-0" aria-hidden="true">
        {fileIcon(entry.file.type)}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700 truncate">{entry.file.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{formatFileSize(entry.file.size)}</p>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {entry.status === "uploading" && (
          <span className="text-blue-500 flex items-center gap-1 text-xs font-medium">
            <UploadSpinner />
            جاري الرفع
          </span>
        )}
        {entry.status === "done" && (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
            مرفوع
          </span>
        )}
        {entry.status === "error" && (
          <span className="text-red-500 text-xs font-medium max-w-[120px] truncate" title={entry.errorMsg}>
            {entry.errorMsg ?? "خطأ"}
          </span>
        )}

        <button
          type="button"
          onClick={onRemove}
          aria-label="حذف الملف"
          disabled={entry.status === "uploading"}
          className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </li>
  );
}

function ProofUploadSection({
  bookingId,
  onSuccess,
  headerText,
}: {
  bookingId: string;
  onSuccess: () => void;
  headerText?: string;
}) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function uid(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  async function uploadEntry(entry: FileEntry) {
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, status: "uploading" } : e))
    );
    try {
      const form = new FormData();
      form.append("file", entry.file);
      const { url } = await api.upload<{ url: string; fileName: string }>("/upload/proof", form);
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: "done", url } : e))
      );
    } catch (err) {
      const msg = normalizeError(err) || "تعذّر رفع الملف";
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, status: "error", errorMsg: msg } : e))
      );
      toast.error(msg);
    }
  }

  function addFiles(incoming: File[]) {
    if (incoming.length === 0) return;
    const newEntries: FileEntry[] = incoming.map((file) => ({
      id: uid(),
      file,
      status: "uploading" as const,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
    newEntries.forEach((e) => { void uploadEntry(e); });
  }

  function handleInputChange(ev: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(ev.target.files ?? []));
    ev.target.value = "";
  }

  function handleDrop(ev: React.DragEvent<HTMLDivElement>) {
    ev.preventDefault();
    setIsDragOver(false);
    addFiles(Array.from(ev.dataTransfer.files));
  }

  function handleDragOver(ev: React.DragEvent<HTMLDivElement>) {
    ev.preventDefault();
    setIsDragOver(true);
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const uploadedUrls = entries.filter((e) => e.status === "done").map((e) => e.url!);
  const anyUploading = entries.some((e) => e.status === "uploading");
  const canSubmit = uploadedUrls.length > 0 && !submitting && !anyUploading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await bookingsApi.submitProof(bookingId, { proofUrls: uploadedUrls, note: note.trim() || undefined });
      toast.success("تم إرسال إثبات الدفع بنجاح");
      onSuccess();
    } catch (err) {
      toast.error(normalizeError(err) || "تعذّر إرسال إثبات الدفع");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
      <p className="text-sm font-bold text-blue-700">
        {headerText ?? "💳 تمت الموافقة المبدئية — يرجى رفع إثبات التحويل لإكمال الحجز"}
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="منطقة رفع ملف إثبات الدفع"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        className={[
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer",
          "py-8 px-4 text-center select-none transition-all duration-200",
          isDragOver
            ? "border-blue-500 bg-blue-100 scale-[1.01]"
            : "border-blue-300 bg-white hover:border-blue-400 hover:bg-blue-50",
        ].join(" ")}
      >
        <svg
          className="h-9 w-9 text-blue-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm font-semibold text-slate-600">
          اضغط لرفع الملف أو اسحبه هنا
        </p>
        <p className="text-xs text-slate-400">JPG · PNG · PDF — حد 5 ميغابايت</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        multiple
        className="hidden"
        onChange={handleInputChange}
        aria-label="اختر ملف إثبات الدفع"
      />

      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <FileRow
              key={entry.id}
              entry={entry}
              onRemove={() => removeEntry(entry.id)}
            />
          ))}
        </ul>
      )}

      <textarea
        placeholder="ملاحظة للمالك (اختياري)"
        value={note}
        onChange={(ev) => setNote(ev.target.value)}
        rows={2}
        maxLength={500}
        className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm resize-y transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent placeholder:text-slate-400"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={[
          "w-full flex items-center justify-center gap-2 rounded-xl py-3 px-5",
          "text-sm font-bold text-white transition-all duration-200",
          canSubmit
            ? "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-sm"
            : "bg-slate-300 cursor-not-allowed",
        ].join(" ")}
      >
        {submitting ? (
          <>
            <UploadSpinner />
            جاري الإرسال...
          </>
        ) : anyUploading ? (
          <>
            <UploadSpinner />
            جاري رفع الملفات...
          </>
        ) : (
          "إرسال إثبات الدفع"
        )}
      </button>
    </div>
  );
}

// ─── Star rating input (1-5 clickable dots) ────────────────────────────────

function StarInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.55rem" }}>
      <span style={{ minWidth: 160, fontSize: "0.84rem", color: "#475569", flexShrink: 0 }}>{label}</span>
      <div style={{ display: "flex", gap: "0.3rem" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${n} نجمة`}
            style={{
              width: 28, height: 28, border: "none", borderRadius: "50%", cursor: "pointer",
              background: n <= value ? "#f59e0b" : "#e2e8f0",
              color: n <= value ? "#fff" : "#94a3b8",
              fontWeight: 800, fontSize: "0.78rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
          >
            {n <= value ? "★" : "☆"}
          </button>
        ))}
      </div>
      {value > 0 && (
        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>{value}/5</span>
      )}
    </div>
  );
}

// ─── Display a submitted review (criteria + overall) ────────────────────────

function TenantReviewDisplay({ review }: { review: TenantReviewData }) {
  const criteria: Array<[string, number | null | undefined]> = [
    ["النظافة", review.cleanliness],
    ["دقة الوصف", review.accuracy],
    ["جودة المرافق", review.facilities],
    ["التواصل مع المالك", review.communication],
    ["الالتزام بالاتفاق", review.contractCommitment],
    ["القيمة مقابل السعر", review.valueForMoney],
  ];
  return (
    <div style={{ marginTop: "0.85rem", border: "1px solid #bbf7d0", borderRadius: 10, padding: "0.85rem", background: "#f0fdf4" }}>
      <p style={{ margin: "0 0 0.5rem", fontWeight: 800, color: "#166534", fontSize: "0.9rem" }}>⭐ تقييمك للإقامة</p>
      <p style={{ margin: "0 0 0.6rem", color: "#15803d", fontSize: "0.95rem", fontWeight: 800 }}>
        التقييم العام: {Number(review.overallRating).toFixed(1)} / 5
      </p>
      <div>
        {criteria.map(([lbl, val]) =>
          val != null ? (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", fontSize: "0.83rem", color: "#475569" }}>
              <span style={{ minWidth: 150 }}>{lbl}:</span>
              <span>{"★".repeat(val)}{"☆".repeat(5 - val)}</span>
              <span>{val}/5</span>
            </div>
          ) : null
        )}
      </div>
      {review.comment && (
        <p style={{ margin: "0.6rem 0 0", fontSize: "0.84rem", color: "#64748b", fontStyle: "italic" }}>"{review.comment}"</p>
      )}
    </div>
  );
}

function OwnerReviewDisplay({ review }: { review: OwnerReviewData }) {
  const criteria: Array<[string, number | null | undefined]> = [
    ["التواصل", review.communication],
    ["الالتزام بالشروط", review.contractCommitment],
    ["احترام العقار", review.respectProperty],
    ["الالتزام بالمواعيد", review.timeliness],
  ];
  return (
    <div style={{ marginTop: "0.85rem", border: "1px solid #ddd6fe", borderRadius: 10, padding: "0.85rem", background: "#faf5ff" }}>
      <p style={{ margin: "0 0 0.5rem", fontWeight: 800, color: "#6d28d9", fontSize: "0.9rem" }}>⭐ تقييمك للمستأجر</p>
      <p style={{ margin: "0 0 0.6rem", color: "#7c3aed", fontSize: "0.95rem", fontWeight: 800 }}>
        التقييم العام: {Number(review.overallRating).toFixed(1)} / 5
      </p>
      <div>
        {criteria.map(([lbl, val]) =>
          val != null ? (
            <div key={lbl} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", fontSize: "0.83rem", color: "#475569" }}>
              <span style={{ minWidth: 150 }}>{lbl}:</span>
              <span>{"★".repeat(val)}{"☆".repeat(5 - val)}</span>
              <span>{val}/5</span>
            </div>
          ) : null
        )}
      </div>
      {review.comment && (
        <p style={{ margin: "0.6rem 0 0", fontSize: "0.84rem", color: "#64748b", fontStyle: "italic" }}>"{review.comment}"</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  mode,
  busy,
  onApprove,
  onReject,
  onConfirm,
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
  onCancel?: (id: string) => void;
  onCancelOwner?: (id: string) => void;
  onRefresh?: () => void;
}) {
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionBusy, setRevisionBusy] = useState(false);

  const [reviewStatus, setReviewStatus]     = useState<BookingReviewStatus | null>(null);
  const [reviewOpen, setReviewOpen]         = useState(false);
  const [reviewComment, setReviewComment]   = useState("");
  const [reviewBusy, setReviewBusy]         = useState(false);
  const [tenantScores, setTenantScores]     = useState({ cleanliness: 0, accuracy: 0, facilities: 0, communication: 0, contractCommitment: 0, valueForMoney: 0 });
  const [ownerScores, setOwnerScores]       = useState({ communication: 0, contractCommitment: 0, respectProperty: 0, timeliness: 0 });

  const normalizedStatus = normalizeBookingStatus(booking.status);
  const nights = getNightCount(booking.startDate, booking.endDate);
  const finalTotal = booking.totalAmount + booking.commissionAmount;
  const proofUrls = parseProofUrls(booking.paymentProofUrls);

  const isPending           = normalizedStatus === "PendingApproval";
  const isAwaitProof        = normalizedStatus === "ApprovedAwaitingPaymentProof" || normalizedStatus === "Approved";
  const isProofSub          = normalizedStatus === "PaymentProofSubmitted";
  const isRevisionRequested = normalizedStatus === "RevisionRequested";
  const isConfirmed         = normalizedStatus === "Confirmed";
  const isCompleted         = normalizedStatus === "Completed";
  const isReviewable        = isConfirmed || isCompleted;
  const isCancellable       = isPending || isAwaitProof || isProofSub || isRevisionRequested;

  async function handleRevisionSubmit() {
    if (!revisionNote.trim() || revisionBusy) return;
    setRevisionBusy(true);
    try {
      await bookingsApi.requestRevision(booking.id, revisionNote.trim());
      toast.success("تم إرسال طلب التعديل للمستأجر");
      setRevisionOpen(false);
      setRevisionNote("");
      onRefresh?.();
    } catch (err) {
      toast.error(normalizeError(err) || "تعذّر إرسال طلب التعديل");
    } finally {
      setRevisionBusy(false);
    }
  }

  useEffect(() => {
    if (!isReviewable) return;
    reviewsApi.getBookingReviews(booking.id)
      .then(setReviewStatus)
      .catch(() => {});
  }, [booking.id, isReviewable]);

  async function handleTenantReviewSubmit() {
    const scores = tenantScores;
    if (Object.values(scores).some((v) => v < 1)) {
      toast.error("يرجى تقييم جميع المحاور");
      return;
    }
    setReviewBusy(true);
    try {
      await reviewsApi.submitTenantReview(booking.id, { ...scores, comment: reviewComment.trim() || undefined });
      toast.success("تم حفظ تقييمك بنجاح ✨");
      const updated = await reviewsApi.getBookingReviews(booking.id);
      setReviewStatus(updated);
      setReviewOpen(false);
    } catch (err) {
      toast.error(normalizeError(err) || "تعذّر إرسال التقييم");
    } finally {
      setReviewBusy(false);
    }
  }

  async function handleOwnerReviewSubmit() {
    const scores = ownerScores;
    if (Object.values(scores).some((v) => v < 1)) {
      toast.error("يرجى تقييم جميع المحاور");
      return;
    }
    setReviewBusy(true);
    try {
      await reviewsApi.submitOwnerReview(booking.id, { ...scores, comment: reviewComment.trim() || undefined });
      toast.success("تم حفظ تقييمك للمستأجر ✨");
      const updated = await reviewsApi.getBookingReviews(booking.id);
      setReviewStatus(updated);
      setReviewOpen(false);
    } catch (err) {
      toast.error(normalizeError(err) || "تعذّر إرسال التقييم");
    } finally {
      setReviewBusy(false);
    }
  }

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
        <span>السعر: {(nights || 1).toLocaleString("en")} ليلة × {formatMoney(booking.pricePerNight, booking.currency)}</span>
        <strong style={{ color: "#0f172a" }}>الإجمالي: {formatMoney(booking.totalAmount, booking.currency)}</strong>
        <span>عمولة المنصة ({booking.commissionPercent}%): {formatMoney(booking.commissionAmount, booking.currency)}</span>
        <strong style={{ color: "#0f172a" }}>الإجمالي النهائي: {formatMoney(finalTotal, booking.currency)}</strong>
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

      {mode === "owner" && isProofSub && !revisionOpen && (
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={() => onConfirm?.(booking.id)} disabled={busy}
            style={{ border: "none", borderRadius: 9, padding: "0.55rem 1rem", background: "#166534", color: "#fff", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
            ✅ تأكيد الحجز
          </button>
          <button onClick={() => setRevisionOpen(true)} disabled={busy}
            style={{ border: "1px solid #fcd34d", borderRadius: 9, padding: "0.55rem 1rem", background: "#fffbeb", color: "#92400e", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
            ✏️ طلب تعديل
          </button>
          <button onClick={() => onReject?.(booking.id)} disabled={busy}
            style={{ border: "1px solid #fecaca", borderRadius: 9, padding: "0.55rem 1rem", background: "#fff", color: "#b91c1c", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
            رفض
          </button>
        </div>
      )}

      {mode === "owner" && isProofSub && revisionOpen && (
        <div style={{ marginTop: "1rem", borderRadius: 12, border: "1px solid #fcd34d", background: "#fffbeb", padding: "0.9rem" }}>
          <p style={{ margin: "0 0 0.6rem", fontSize: "0.88rem", fontWeight: 800, color: "#92400e" }}>
            ✏️ طلب تعديل إثبات الدفع — اكتب ملاحظتك للمستأجر
          </p>
          <textarea
            value={revisionNote}
            onChange={(ev) => setRevisionNote(ev.target.value)}
            placeholder="مثال: الصورة غير واضحة، يرجى إرسال صورة أوضح تظهر اسم المستفيد والمبلغ والتاريخ..."
            rows={3}
            maxLength={1000}
            style={{ width: "100%", borderRadius: 9, border: "1px solid #fcd34d", background: "#fff", padding: "0.55rem 0.75rem", fontSize: "0.86rem", resize: "vertical", outline: "none", boxSizing: "border-box" }}
          />
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleRevisionSubmit}
              disabled={!revisionNote.trim() || revisionBusy}
              style={{ border: "none", borderRadius: 9, padding: "0.55rem 1.1rem", background: !revisionNote.trim() || revisionBusy ? "#d1d5db" : "#d97706", color: "#fff", fontWeight: 800, cursor: !revisionNote.trim() || revisionBusy ? "not-allowed" : "pointer" }}>
              {revisionBusy ? "جاري الإرسال..." : "إرسال طلب التعديل"}
            </button>
            <button
              onClick={() => { setRevisionOpen(false); setRevisionNote(""); }}
              disabled={revisionBusy}
              style={{ border: "1px solid #e2e8f0", borderRadius: 9, padding: "0.55rem 1rem", background: "#fff", color: "#475569", fontWeight: 800, cursor: "pointer" }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {mode === "owner" && isRevisionRequested && (
        <div style={{ marginTop: "0.85rem" }}>
          <div style={{ border: "1px solid #fcd34d", borderRadius: 10, padding: "0.65rem 0.85rem", background: "#fffbeb", color: "#92400e", fontSize: "0.86rem" }}>
            <p style={{ margin: "0 0 0.25rem", fontWeight: 800 }}>✏️ في انتظار إعادة رفع الإثبات من المستأجر</p>
            {booking.ownerNotes && (
              <p style={{ margin: 0, color: "#78350f" }}>ملاحظتك: {booking.ownerNotes}</p>
            )}
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
            <button onClick={() => onReject?.(booking.id)} disabled={busy}
              style={{ border: "1px solid #fecaca", borderRadius: 9, padding: "0.55rem 1rem", background: "#fff", color: "#b91c1c", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}>
              رفض الطلب
            </button>
          </div>
        </div>
      )}

      {mode === "owner" && isReviewable && reviewStatus && !reviewStatus.hasOwnerReview && !reviewOpen && (
        <div style={{ marginTop: "0.85rem" }}>
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            style={{ border: "1px solid #ddd6fe", borderRadius: 9, padding: "0.55rem 1.1rem", background: "#faf5ff", color: "#6d28d9", fontWeight: 800, cursor: "pointer", fontSize: "0.86rem" }}>
            ⭐ قيّم المستأجر
          </button>
        </div>
      )}

      {mode === "owner" && isReviewable && reviewStatus?.hasOwnerReview && reviewStatus.ownerReview && (
        <OwnerReviewDisplay review={reviewStatus.ownerReview} />
      )}

      {mode === "owner" && isReviewable && reviewOpen && !reviewStatus?.hasOwnerReview && (
        <div style={{ marginTop: "0.85rem", border: "1px solid #ddd6fe", borderRadius: 12, padding: "0.9rem", background: "#faf5ff" }}>
          <p style={{ margin: "0 0 0.75rem", fontWeight: 800, color: "#6d28d9", fontSize: "0.9rem" }}>⭐ قيّم المستأجر</p>
          <StarInput label="التواصل" value={ownerScores.communication} onChange={(v) => setOwnerScores((s) => ({ ...s, communication: v }))} />
          <StarInput label="الالتزام بالشروط" value={ownerScores.contractCommitment} onChange={(v) => setOwnerScores((s) => ({ ...s, contractCommitment: v }))} />
          <StarInput label="احترام العقار" value={ownerScores.respectProperty} onChange={(v) => setOwnerScores((s) => ({ ...s, respectProperty: v }))} />
          <StarInput label="الالتزام بالمواعيد" value={ownerScores.timeliness} onChange={(v) => setOwnerScores((s) => ({ ...s, timeliness: v }))} />
          <textarea
            placeholder="تعليق إضافي (اختياري)"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={2}
            maxLength={500}
            style={{ width: "100%", borderRadius: 9, border: "1px solid #ddd6fe", background: "#fff", padding: "0.55rem 0.75rem", fontSize: "0.84rem", resize: "vertical", outline: "none", boxSizing: "border-box", marginTop: "0.5rem" }}
          />
          <div style={{ marginTop: "0.65rem", display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleOwnerReviewSubmit}
              disabled={reviewBusy || Object.values(ownerScores).some((v) => v < 1)}
              style={{ border: "none", borderRadius: 9, padding: "0.55rem 1.2rem", background: reviewBusy || Object.values(ownerScores).some((v) => v < 1) ? "#d1d5db" : "#6d28d9", color: "#fff", fontWeight: 800, cursor: reviewBusy ? "not-allowed" : "pointer" }}>
              {reviewBusy ? "جاري الإرسال..." : "إرسال التقييم"}
            </button>
            <button type="button" onClick={() => setReviewOpen(false)} disabled={reviewBusy}
              style={{ border: "1px solid #e2e8f0", borderRadius: 9, padding: "0.55rem 1rem", background: "#fff", color: "#475569", fontWeight: 800, cursor: "pointer" }}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {mode === "renter" && isReviewable && reviewStatus && !reviewStatus.hasTenantReview && !reviewOpen && (
        <div style={{ marginTop: "0.85rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ border: "1px solid #bbf7d0", borderRadius: 10, padding: "0.65rem 0.85rem", background: "#f0fdf4", color: "#166534", fontWeight: 800, fontSize: "0.86rem", flex: 1 }}>
            ✅ تم تأكيد الحجز
          </div>
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            style={{ border: "1px solid #fbbf24", borderRadius: 9, padding: "0.55rem 1.1rem", background: "#fffbeb", color: "#92400e", fontWeight: 800, cursor: "pointer", fontSize: "0.86rem", whiteSpace: "nowrap" }}>
            ⭐ قيّم إقامتك
          </button>
        </div>
      )}

      {mode === "renter" && isReviewable && !reviewStatus && (
        <div style={{ marginTop: "0.85rem", border: "1px solid #bbf7d0", borderRadius: 10, padding: "0.65rem 0.85rem", background: "#f0fdf4", color: "#166534", fontWeight: 800, fontSize: "0.86rem" }}>
          ✅ تم تأكيد الحجز
        </div>
      )}

      {mode === "renter" && isReviewable && reviewStatus?.hasTenantReview && reviewStatus.tenantReview && (
        <TenantReviewDisplay review={reviewStatus.tenantReview} />
      )}

      {mode === "renter" && isReviewable && reviewOpen && !reviewStatus?.hasTenantReview && (
        <div style={{ marginTop: "0.85rem", border: "1px solid #fbbf24", borderRadius: 12, padding: "0.9rem", background: "#fffbeb" }}>
          <p style={{ margin: "0 0 0.75rem", fontWeight: 800, color: "#92400e", fontSize: "0.9rem" }}>⭐ قيّم تجربة إقامتك</p>
          <StarInput label="النظافة" value={tenantScores.cleanliness} onChange={(v) => setTenantScores((s) => ({ ...s, cleanliness: v }))} />
          <StarInput label="دقة الوصف" value={tenantScores.accuracy} onChange={(v) => setTenantScores((s) => ({ ...s, accuracy: v }))} />
          <StarInput label="جودة المرافق" value={tenantScores.facilities} onChange={(v) => setTenantScores((s) => ({ ...s, facilities: v }))} />
          <StarInput label="التواصل مع المالك" value={tenantScores.communication} onChange={(v) => setTenantScores((s) => ({ ...s, communication: v }))} />
          <StarInput label="الالتزام بالاتفاق" value={tenantScores.contractCommitment} onChange={(v) => setTenantScores((s) => ({ ...s, contractCommitment: v }))} />
          <StarInput label="القيمة مقابل السعر" value={tenantScores.valueForMoney} onChange={(v) => setTenantScores((s) => ({ ...s, valueForMoney: v }))} />
          <textarea
            placeholder="تعليق إضافي (اختياري)"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={2}
            maxLength={500}
            style={{ width: "100%", borderRadius: 9, border: "1px solid #fbbf24", background: "#fff", padding: "0.55rem 0.75rem", fontSize: "0.84rem", resize: "vertical", outline: "none", boxSizing: "border-box", marginTop: "0.5rem" }}
          />
          <div style={{ marginTop: "0.65rem", display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleTenantReviewSubmit}
              disabled={reviewBusy || Object.values(tenantScores).some((v) => v < 1)}
              style={{ border: "none", borderRadius: 9, padding: "0.55rem 1.2rem", background: reviewBusy || Object.values(tenantScores).some((v) => v < 1) ? "#d1d5db" : "#d97706", color: "#fff", fontWeight: 800, cursor: reviewBusy ? "not-allowed" : "pointer" }}>
              {reviewBusy ? "جاري الإرسال..." : "إرسال التقييم"}
            </button>
            <button type="button" onClick={() => setReviewOpen(false)} disabled={reviewBusy}
              style={{ border: "1px solid #e2e8f0", borderRadius: 9, padding: "0.55rem 1rem", background: "#fff", color: "#475569", fontWeight: 800, cursor: "pointer" }}>
              إلغاء
            </button>
          </div>
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

      {mode === "renter" && isRevisionRequested && onRefresh && (
        <div style={{ marginTop: "0.85rem" }}>
          <div style={{ border: "1px solid #fcd34d", borderRadius: 10, padding: "0.65rem 0.85rem", background: "#fffbeb", color: "#92400e", fontSize: "0.86rem", marginBottom: "0.75rem" }}>
            <p style={{ margin: "0 0 0.3rem", fontWeight: 800 }}>✏️ يطلب المالك تعديل إثبات الدفع</p>
            {booking.ownerNotes && (
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>ملاحظة المالك: {booking.ownerNotes}</p>
            )}
          </div>
          <ProofUploadSection
            bookingId={booking.id}
            onSuccess={onRefresh}
            headerText="📎 يرجى إعادة رفع إثبات الدفع مع مراعاة ملاحظة المالك"
          />
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

  async function updateBooking(id: string, action: "approve" | "reject" | "confirm" | "cancel" | "cancelOwner") {
    setBusyId(id);
    setError("");
    try {
      if (action === "approve")      await bookingsApi.approve(id);
      if (action === "reject")       await bookingsApi.reject(id);
      if (action === "confirm")      await bookingsApi.confirmPayment(id);
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
                onCancelOwner={(id) => updateBooking(id, "cancelOwner")}
                onRefresh={load}
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
