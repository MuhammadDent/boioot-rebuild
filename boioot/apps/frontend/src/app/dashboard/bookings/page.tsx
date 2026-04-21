"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { bookingsApi } from "@/features/bookings/api";
import { getBookingStatusConfig } from "@/features/bookings/bookingStatusConfig";
import { normalizeError } from "@/lib/api";
import type { BookingResponse, BookingStatus } from "@/types";
import Spinner from "@/components/ui/Spinner";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";

const OWNER_TABS: Array<{ status: BookingStatus; label: string }> = [
  { status: "Pending", label: "معلّقة" },
  { status: "Confirmed", label: "مؤكدة" },
  { status: "Rejected", label: "مرفوضة" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = getBookingStatusConfig(status);
  return (
    <span style={{ borderRadius: 999, padding: "0.25rem 0.7rem", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: "0.78rem", fontWeight: 800 }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function BookingCard({
  booking,
  mode,
  busy,
  onConfirm,
  onReject,
  onCancel,
}: {
  booking: BookingResponse;
  mode: "owner" | "renter";
  busy: boolean;
  onConfirm?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
}) {
  const isPending = booking.status === "Pending";
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
        <StatusBadge status={booking.status} />
      </div>

      <div style={{ marginTop: "0.85rem", display: "grid", gap: "0.35rem", color: "#334155", fontSize: "0.86rem" }}>
        <span>الضيف: {booking.guestName}</span>
        {booking.phone && <span dir="ltr" style={{ textAlign: "right" }}>الهاتف: {booking.phone}</span>}
        {booking.notes && <span>ملاحظات: {booking.notes}</span>}
      </div>

      {mode === "owner" && isPending && (
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => onConfirm?.(booking.id)}
            disabled={busy}
            style={{ border: "none", borderRadius: 9, padding: "0.55rem 1rem", background: "var(--color-primary)", color: "#fff", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}
          >
            تأكيد
          </button>
          <button
            onClick={() => onReject?.(booking.id)}
            disabled={busy}
            style={{ border: "1px solid #fecaca", borderRadius: 9, padding: "0.55rem 1rem", background: "#fff", color: "#b91c1c", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}
          >
            رفض
          </button>
        </div>
      )}

      {mode === "renter" && (booking.status === "Pending" || booking.status === "Confirmed") && (
        <div style={{ marginTop: "1rem" }}>
          <button
            onClick={() => onCancel?.(booking.id)}
            disabled={busy}
            style={{ border: "1px solid #cbd5e1", borderRadius: 9, padding: "0.55rem 1rem", background: "#fff", color: "#475569", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer" }}
          >
            إلغاء الطلب
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardBookingsPage() {
  const [incoming, setIncoming] = useState<BookingResponse[]>([]);
  const [mine, setMine] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ownerTab, setOwnerTab] = useState<BookingStatus>("Pending");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ownerBookings, renterBookings] = await Promise.all([
        bookingsApi.forMyProperties(),
        bookingsApi.mine(),
      ]);
      setIncoming(ownerBookings);
      setMine(renterBookings);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateBooking(id: string, action: "confirm" | "reject" | "cancel") {
    setBusyId(id);
    setError("");
    try {
      if (action === "confirm") await bookingsApi.confirm(id);
      if (action === "reject") await bookingsApi.reject(id);
      if (action === "cancel") await bookingsApi.cancel(id);
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

  const visibleIncoming = incoming.filter((booking) => booking.status === ownerTab);

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
            const count = incoming.filter((booking) => booking.status === tab.status).length;
            const active = ownerTab === tab.status;
            return (
              <button
                key={tab.status}
                type="button"
                onClick={() => setOwnerTab(tab.status)}
                style={{
                  border: `1px solid ${active ? cfg.border : "#e2e8f0"}`,
                  borderRadius: 999,
                  padding: "0.45rem 0.85rem",
                  background: active ? cfg.bg : "#fff",
                  color: active ? cfg.color : "#475569",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {cfg.icon} {tab.label} ({count})
              </button>
            );
          })}
        </div>
        {visibleIncoming.length === 0 ? (
          <div style={{ background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 14, padding: "1rem", color: "#64748b" }}>
            لا توجد طلبات {OWNER_TABS.find((tab) => tab.status === ownerTab)?.label ?? ""} حالياً.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {visibleIncoming.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                mode="owner"
                busy={busyId === booking.id}
                onConfirm={(id) => updateBooking(id, "confirm")}
                onReject={(id) => updateBooking(id, "reject")}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ margin: "0 0 0.85rem", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>حجوزاتي - My Bookings</h2>
        {mine.length === 0 ? (
          <div style={{ background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 14, padding: "1rem", color: "#64748b" }}>
            لم ترسل أي طلب حجز بعد.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {mine.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                mode="renter"
                busy={busyId === booking.id}
                onCancel={(id) => updateBooking(id, "cancel")}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}