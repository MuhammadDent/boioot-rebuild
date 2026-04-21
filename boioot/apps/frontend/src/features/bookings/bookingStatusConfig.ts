import type { BookingStatus } from "@/types";

export const bookingStatusConfig: Record<BookingStatus, { label: string; icon: string; bg: string; color: string; border: string }> = {
  Pending: { label: "معلّق", icon: "⏳", bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  Confirmed: { label: "مؤكد", icon: "✅", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  Rejected: { label: "مرفوض", icon: "❌", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  Cancelled: { label: "ملغى", icon: "⚪", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
};

export function getBookingStatusConfig(status: string) {
  return bookingStatusConfig[status as BookingStatus] ?? { label: status, icon: "•", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" };
}