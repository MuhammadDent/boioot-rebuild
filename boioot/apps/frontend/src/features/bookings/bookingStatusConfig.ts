import type { BookingStatus } from "@/types";

export const bookingStatusConfig: Record<BookingStatus, { label: string; icon: string; bg: string; color: string; border: string }> = {
  Pending:                      { label: "في انتظار الموافقة",      icon: "⏳", bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  PendingApproval:              { label: "في انتظار الموافقة",      icon: "⏳", bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  Approved:                     { label: "موافق عليه",               icon: "✅", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  ApprovedAwaitingPaymentProof: { label: "بانتظار إثبات الدفع",     icon: "💳", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  PaymentProofSubmitted:        { label: "تم رفع إثبات الدفع",      icon: "📎", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  RevisionRequested:            { label: "طلب تعديل",               icon: "✏️", bg: "#fffbeb", color: "#92400e", border: "#fcd34d" },
  Confirmed:                    { label: "مؤكد",                     icon: "✅", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
  Rejected:                     { label: "مرفوض",                   icon: "❌", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  Cancelled:                    { label: "ملغى",                    icon: "⚪", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  CancelledByTenant:            { label: "ملغى من المستأجر",        icon: "⚪", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  CancelledByOwner:             { label: "ملغى من المالك",          icon: "⚪", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
  Completed:                    { label: "مكتمل",                   icon: "✓",  bg: "#eef2ff", color: "#3730a3", border: "#c7d2fe" },
};

export function normalizeBookingStatus(status: string): BookingStatus {
  switch (status) {
    case "Pending":    return "PendingApproval";
    case "Approved":   return "ApprovedAwaitingPaymentProof";
    case "Cancelled":  return "CancelledByTenant";
    default:           return status as BookingStatus;
  }
}

export function getBookingStatusConfig(status: string) {
  const normalized = normalizeBookingStatus(status);
  return bookingStatusConfig[normalized] ?? { label: normalized, icon: "•", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };
}
