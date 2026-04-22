"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import VerificationBadge from "@/components/properties/VerificationBadge";
import ListingRatings from "@/components/ratings/ListingRatings";
import ImageSlider from "@/components/properties/ImageSlider";
import { bookingsApi } from "@/features/bookings/api";
import { favoritesApi } from "@/features/favorites/api";
import { messagingApi } from "@/features/dashboard/messages/api";
import { ratingsApi } from "@/features/ratings/api";
import { normalizeError, PlanLimitError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  FEATURE_LABEL,
  FLOOR_LABELS,
  OWNERSHIP_TYPE_LABELS,
  formatPrice,
} from "@/features/properties/constants";
import type { PropertyResponse } from "@/types";

type AvailabilityState = "idle" | "checking" | "available" | "unavailable" | "error";

// ─── helpers ──────────────────────────────────────────────────────────────────

function shortRef(id: string) {
  return id.replace(/-/g, "").slice(-8).toUpperCase();
}

function formatDate(iso: string) {
  if (!iso) return "—";
  // Only append T00:00:00Z for date-only strings (YYYY-MM-DD).
  // Full ISO datetimes already contain "T", appending would produce an invalid date.
  const normalized = iso.includes("T") ? iso : `${iso}T00:00:00Z`;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { year: "numeric", month: "numeric", day: "numeric" });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getNightCount(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const diff = end.getTime() - start.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.round(diff / 86_400_000);
}

function waLink(phone: string, text = "") {
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

// ─── Share helpers ─────────────────────────────────────────────────────────────

function shareUrls(url: string, title: string) {
  const enc = encodeURIComponent;
  return {
    whatsapp:  `https://wa.me/?text=${enc(title + "\n" + url)}`,
    telegram:  `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`,
    facebook:  `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    messenger: `https://www.facebook.com/dialog/send?link=${enc(url)}&app_id=291494419107518&redirect_uri=${enc(url)}`,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhoneRevealButton({ phone }: { phone: string }) {
  const [revealed, setRevealed] = useState(false);

  const sharedStyle: React.CSSProperties = {
    width: "100%",
    height: "52px",
    border: "1px solid #D1D5DB",
    borderRadius: "12px",
    background: "#fff",
    color: "#111827",
    fontWeight: 700,
    fontSize: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    textDecoration: "none",
    transition: "background 0.15s",
  };

  if (revealed) {
    return (
      <a href={`tel:${phone}`} style={{ ...sharedStyle, direction: "ltr", letterSpacing: "0.04em" }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 5.61 5.61l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        {phone}
      </a>
    );
  }

  return (
    <button type="button" onClick={() => setRevealed(true)} style={sharedStyle}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 5.61 5.61l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
      إظهار رقم الهاتف
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-info-row">
      <span className="detail-info-label">{label}</span>
      <span className="detail-info-value">{value}</span>
    </div>
  );
}

function IconBtn({
  href, title, color, children, onClick,
}: {
  href?: string; title: string; color: string; children: React.ReactNode; onClick?: () => void;
}) {
  const style: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 42, height: 42, borderRadius: "50%", border: "none",
    background: color, color: "#fff", cursor: "pointer",
    fontSize: "1.05rem", textDecoration: "none", flexShrink: 0,
    transition: "opacity 0.15s",
  };
  if (href) return (
    <a href={href} target="_blank" rel="noreferrer" title={title} style={style}>{children}</a>
  );
  return <button type="button" title={title} style={style} onClick={onClick}>{children}</button>;
}

// ─── Main client component ─────────────────────────────────────────────────────
// Receives property data from the Server Component parent (page.tsx).
// Handles all interactive state: favorites, messaging, phone reveal, share.

export default function PropertyDetailClient({ property }: { property: PropertyResponse }) {
  const router = useRouter();
  const { user } = useAuth();
  const { openAuthModal } = useAuthGate();
  const id = property.id;

  const [isFav, setIsFav]           = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const [msgLoading, setMsgLoading]         = useState(false);
  const [msgError, setMsgError]             = useState("");
  const [msgIsConvLimit, setMsgIsConvLimit] = useState(false);
  const [bookingOpen, setBookingOpen]       = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError]     = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [availability, setAvailability] = useState<AvailabilityState>("idle");
  const [availabilityError, setAvailabilityError] = useState("");
  const [bookingForm, setBookingForm] = useState({
    startDate: "",
    endDate: "",
    guestName: user?.fullName ?? "",
    phone: "",
    notes: "",
    guestCount: 1,
  });

  const [pageUrl, setPageUrl] = useState("");
  const [topSummary, setTopSummary] = useState<{ average: number; count: number } | null>(null);
  const [ratingLoaded, setRatingLoaded] = useState(false);

  const reviewsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (property.listingType?.toLowerCase() !== "dailyrent") return;
    ratingsApi.getSummary(property.id)
      .then((s) => { setTopSummary(s); setRatingLoaded(true); })
      .catch(() => { setRatingLoaded(true); });
  }, [property.id, property.listingType]);

  useEffect(() => {
    if (!user || !id) return;
    favoritesApi.ids()
      .then((ids) => setIsFav(ids.includes(id)))
      .catch(() => {});
  }, [user, id]);

  useEffect(() => {
    if (!user?.fullName) return;
    setBookingForm((prev) => prev.guestName ? prev : { ...prev, guestName: user.fullName });
  }, [user?.fullName]);

  useEffect(() => {
    if (!bookingOpen || !bookingForm.startDate || !bookingForm.endDate) {
      setAvailability("idle");
      setAvailabilityError("");
      return;
    }

    // DEBUG — log selected dates and the payload that would be sent.
    console.log("[Booking dates DEBUG]", {
      rawStartDate: bookingForm.startDate,
      rawEndDate:   bookingForm.endDate,
      displayStart: formatDate(bookingForm.startDate),
      displayEnd:   formatDate(bookingForm.endDate),
      apiPayload:   `startDate=${bookingForm.startDate}&endDate=${bookingForm.endDate}`,
    });

    // Client-side order validation — avoids an ambiguous "unavailable" from API.
    if (bookingForm.endDate <= bookingForm.startDate) {
      setAvailability("error");
      setAvailabilityError("تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول");
      console.warn("[Booking dates DEBUG] Reversed range — endDate <= startDate");
      return;
    }

    let ignore = false;
    setAvailability("checking");
    setAvailabilityError("");

    const timeoutId = window.setTimeout(() => {
      console.log("[Booking availability DEBUG] Calling API with", bookingForm.startDate, "→", bookingForm.endDate);
      bookingsApi.availability(id, bookingForm.startDate, bookingForm.endDate)
        .then((result) => {
          if (ignore) return;
          console.log("[Booking availability DEBUG] API response:", result);
          setAvailability(result.available ? "available" : "unavailable");
          if (!result.available && result.reason) {
            setAvailabilityError(result.reason);
          }
        })
        .catch((err) => {
          if (ignore) return;
          console.error("[Booking availability DEBUG] API error:", err);
          setAvailability("error");
          setAvailabilityError(normalizeError(err) || "تعذر التحقق من توفر الفترة.");
        });
    }, 350);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [bookingForm.endDate, bookingForm.startDate, bookingOpen, id]);

  const doToggleFav = useCallback(async () => {
    setFavLoading(true);
    try {
      const { added } = await favoritesApi.toggle(id);
      setIsFav(added);
    } catch { /* silent */ } finally { setFavLoading(false); }
  }, [id]);

  const toggleFav = useCallback(() => {
    if (!user) { openAuthModal(() => { void doToggleFav(); }); return; }
    void doToggleFav();
  }, [user, openAuthModal, doToggleFav]);

  const propertyRef = useRef(property);
  propertyRef.current = property;
  const userRef = useRef(user);
  userRef.current = user;

  const doOpenChat = useCallback(async () => {
    const prop = propertyRef.current;
    const usr  = userRef.current;
    if (!prop || !usr) return;
    const recipientId = prop.recipientId ?? prop.ownerId ?? prop.agentId?.toString();
    if (!recipientId) {
      console.warn("[PropertyMessage] no recipientId on property", prop.id);
      return;
    }
    if (recipientId === usr.id) {
      setMsgError("لا يمكنك مراسلة نفسك");
      return;
    }
    console.log("[PropertyMessage] click", { propertyId: id, recipientId, currentUserId: usr.id });
    setMsgLoading(true);
    setMsgError("");
    setMsgIsConvLimit(false);
    try {
      const conv = await messagingApi.getOrCreateConversation({ recipientId, propertyId: id });
      console.log("[PropertyMessage] API response", conv);
      router.push(`/dashboard/messages/${conv.id}`);
    } catch (err) {
      console.error("[PropertyMessage] conversation error", err);
      if (err instanceof PlanLimitError && err.planPayload.limitKey === "max_conversations") {
        setMsgIsConvLimit(true);
        setMsgError("يمكنك فتح محادثة واحدة فقط ضمن باقتك الحالية. للتواصل مع المزيد من المعلنين، يرجى ترقية الباقة.");
      } else {
        setMsgIsConvLimit(false);
        setMsgError(normalizeError(err) || "تعذّر فتح المحادثة، حاول مجدداً.");
      }
    } finally { setMsgLoading(false); }
  }, [id, router]);

  const openChat = useCallback(() => {
    if (!user) { openAuthModal(() => { void doOpenChat(); }); return; }
    void doOpenChat();
  }, [user, openAuthModal, doOpenChat]);

  const openBooking = useCallback(() => {
    setBookingError("");
    setBookingSuccess("");
    if (!user) { openAuthModal(() => setBookingOpen(true)); return; }
    setBookingOpen(true);
  }, [user, openAuthModal]);

  const submitBooking = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) { openAuthModal(() => setBookingOpen(true)); return; }
    setBookingLoading(true);
    setBookingError("");
    setBookingSuccess("");
    try {
      await bookingsApi.create({
        propertyId: id,
        startDate: bookingForm.startDate,
        endDate: bookingForm.endDate,
        guestName: bookingForm.guestName.trim(),
        phone: bookingForm.phone.trim() || undefined,
        notes: bookingForm.notes.trim() || undefined,
        guestCount: bookingForm.guestCount,
      });
      setBookingSuccess("تم إرسال طلب الحجز بنجاح. سيتواصل معك المعلن لتأكيد التفاصيل.");
      setBookingForm((prev) => ({ ...prev, startDate: "", endDate: "", notes: "" }));
      setAvailability("idle");
    } catch (err) {
      setBookingError(normalizeError(err) || "تعذر إرسال طلب الحجز، حاول مجدداً.");
    } finally {
      setBookingLoading(false);
    }
  }, [bookingForm, id, openAuthModal, user]);

  const sortedImages = property.images;
  const shares       = shareUrls(pageUrl, property.title);

  const resolvedRecipient = property.recipientId ?? property.ownerId ?? property.agentId?.toString();
  const hasRecipient      = !!resolvedRecipient;
  const isOwn             = !!(user && resolvedRecipient && user.id === resolvedRecipient);
  const hasContactInfo    = !!(property.ownerPhone || (hasRecipient && !isOwn));
  const advertiserName    = property.ownerName ?? property.companyName ?? "المعلن";
  const advertiserPhoto   = property.ownerPhoto ?? property.companyLogoUrl ?? null;
  const isDailyRent       = property.listingType?.toLowerCase() === "dailyrent";
  const canBook           = isDailyRent && !isOwn;
  const showRatings       = isDailyRent;
  const hasSelectedDates  = !!bookingForm.startDate && !!bookingForm.endDate;

  // DEBUG — temporary console logs to diagnose live rendering. Remove after confirmation.
  useEffect(() => {
    console.log("LISTING TYPE DEBUG:", property.listingType);
    console.log("BOOKING DEBUG:", {
      listingType: property.listingType,
      isBookable: property.isBookable,
      isDailyRent,
      canBook,
    });
    console.log("[PropertyDetail DEBUG]", {
      id: property.id,
      listingType: property.listingType,
      isBookable: property.isBookable,
      isDailyRent,
      isOwn,
      canBook,
      showRatings,
      ratingLoaded,
      topSummary,
      resolvedRecipient,
      userId: user?.id ?? null,
    });
  }, [property.id, property.listingType, property.isBookable, isDailyRent, isOwn, canBook, showRatings, ratingLoaded, topSummary, resolvedRecipient, user?.id]);
  const canSubmitBooking  = !bookingLoading && (!hasSelectedDates || availability === "available");
  const bookingNights     = getNightCount(bookingForm.startDate, bookingForm.endDate);
  const bookingTotal      = property.price * bookingNights;
  const bookingCommissionPercent = 10;
  const bookingCommission = Math.round((bookingTotal * bookingCommissionPercent / 100) * 100) / 100;

  return (
    <div style={{ background: "var(--color-background)", padding: "2rem 0" }}>
      <div className="container">

        {/* Back link */}
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          color: "var(--color-text-secondary)", fontSize: "0.9rem",
          marginBottom: "1.5rem", textDecoration: "none",
        }}>
          ← العودة إلى الرئيسية
        </Link>

        {/* ── Image Slider — direct import, no ssr:false → first image in SSR HTML ── */}
        <ImageSlider images={sortedImages} />

        {/* ── Content grid ── */}
        <div className="detail-grid">

          {/* ── Left column ── */}
          <div>
            {/* Title row */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, flex: 1 }}>
                {property.title}
              </h1>
              {property.listingType && (
                <span className="badge badge-green">{LISTING_TYPE_LABELS[property.listingType] ?? property.listingType}</span>
              )}
              {property.type && (
                <span className="badge badge-gray">{PROPERTY_TYPE_LABELS[property.type] ?? property.type}</span>
              )}
            </div>

            {/* Reference + meta row */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", flexWrap: "wrap", marginBottom: "1rem", color: "var(--color-text-secondary)", fontSize: "0.83rem" }}>
              <span title="رقم الإعلان المرجعي" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                🔖 رقم الإعلان: <strong style={{ color: "var(--color-text-primary)", fontFamily: "monospace" }}>#{shortRef(property.id)}</strong>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                📅 {formatDate(property.createdAt)}
              </span>
              {property.viewCount != null && (
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  👁️ {property.viewCount.toLocaleString("en")} مشاهدة
                </span>
              )}
            </div>

            {/* Price */}
            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: "1rem" }}>
              {formatPrice(property.price, property.currency)}
            </p>

            {/* Location */}
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              📍 {property.province && `${property.province} — `}{property.city}
              {property.neighborhood && ` — ${property.neighborhood}`}
              {property.address && ` — ${property.address}`}
            </p>

            {/* ── Compact rating chip (DailyRent only) — shows immediately with fallback ── */}
            {showRatings && (
              topSummary && topSummary.count > 0 ? (
                <button
                  type="button"
                  onClick={() => reviewsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "20px",
                    padding: "0.3rem 0.9rem",
                    marginBottom: "1.25rem",
                    cursor: "pointer",
                    fontSize: "0.88rem",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ color: "#f59e0b", fontSize: "1.05rem", lineHeight: 1 }}>★</span>
                  <strong style={{ color: "#92400e" }}>{topSummary.average.toFixed(1)}</strong>
                  <span style={{ color: "#a16207" }}>·</span>
                  <span style={{ color: "#78350f", textDecoration: "underline", textUnderlineOffset: "3px" }}>
                    {topSummary.count} تقييم
                  </span>
                </button>
              ) : (
                <p style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "20px",
                  padding: "0.3rem 0.9rem",
                  marginBottom: "1.25rem",
                  fontSize: "0.85rem",
                  color: "#64748b",
                  margin: "0 0 1.25rem",
                }}>
                  لا توجد تقييمات بعد
                </p>
              )
            )}

            {/* Description */}
            {property.description && (
              <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>الوصف</h2>
                <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.8, margin: 0 }}>
                  {property.description}
                </p>
              </div>
            )}

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>المميزات</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {property.features.map((f) => (
                    <span key={f} style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 20, padding: "0.2rem 0.75rem", fontSize: "0.82rem", fontWeight: 600 }}>
                      {FEATURE_LABEL[f] ?? f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Video */}
            {property.videoUrl && (
              <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "1.5rem", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>فيديو العقار</h2>
                <video controls style={{ width: "100%", borderRadius: 8, maxHeight: 360 }} src={property.videoUrl} />
              </div>
            )}

            {/* ── Share bar ── */}
            <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
              <p style={{ margin: "0 0 0.75rem", fontWeight: 700, fontSize: "0.9rem" }}>مشاركة الإعلان</p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                <IconBtn href={shares.whatsapp} title="مشاركة عبر واتساب"  color="#25d366">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </IconBtn>
                <IconBtn href={shares.telegram} title="مشاركة عبر تلغرام" color="#2aabee">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </IconBtn>
                <IconBtn href={shares.facebook} title="مشاركة عبر فيسبوك"  color="#1877f2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </IconBtn>
                <IconBtn href={shares.messenger} title="مشاركة عبر ماسنجر"  color="#0084ff">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.975 12-11.111C24 4.975 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.1l3.131 3.26L19.752 8.1l-6.561 6.863z"/></svg>
                </IconBtn>
              </div>
            </div>

          </div>

          {/* ── Right column ── */}
          <div>

            {/* ── Advertiser card ── */}
            <div className="contact-section" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "1.25rem", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.85rem" }}>المعلن</h2>

              {/* Photo + name row */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                {advertiserPhoto ? (
                  <Image
                    src={advertiserPhoto}
                    alt={advertiserName}
                    width={52}
                    height={52}
                    loading="lazy"
                    style={{ borderRadius: "50%", objectFit: "cover", border: "2px solid var(--color-border)", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                    👤
                  </div>
                )}
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>{advertiserName}</p>
                  <VerificationBadge
                    level={property.ownerVerificationLevel}
                    isVerified={property.ownerIsVerified}
                    size="md"
                  />
                  {property.ownerPhone && (
                    <p style={{ margin: "0.15rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.85rem", direction: "ltr", textAlign: "right" }}>
                      {property.ownerPhone}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Primary CTA: Booking (DailyRent — always visible, disabled for owner) ── */}
              {isDailyRent && (
                <div style={{ marginBottom: "1rem" }}>
                  <button
                    type="button"
                    onClick={isOwn ? undefined : openBooking}
                    disabled={isOwn}
                    style={{
                      width: "100%",
                      height: "56px",
                      border: "none",
                      borderRadius: "12px",
                      background: isOwn ? "#94a3b8" : "var(--color-primary)",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "17px",
                      cursor: isOwn ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      boxShadow: isOwn ? "none" : "0 4px 14px rgba(37,99,235,0.28)",
                      opacity: isOwn ? 0.75 : 1,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {isOwn ? "هذا إعلانك" : "أرسل طلب حجز"}
                  </button>
                  <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)", textAlign: "center" }}>
                    {isOwn ? "لا يمكنك حجز إعلانك الخاص" : "يمكنك إرسال طلب حجز مباشر للمعلن"}
                  </p>
                </div>
              )}

              {/* ── Secondary contact methods ── */}
              <div style={{ marginBottom: "0.75rem" }}>
                <p style={{ margin: "0 0 0.65rem", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", letterSpacing: "0.02em" }}>
                  {canBook ? "وسائل التواصل الأخرى" : "التواصل مع المعلن"}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

                  {!isOwn && (
                    <button
                      type="button"
                      className="app-message-btn"
                      onClick={openChat}
                      disabled={msgLoading}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      {msgLoading ? "جاري الفتح..." : "المراسلة عبر التطبيق"}
                    </button>
                  )}

                  {property.ownerPhone && (
                    <a
                      href={waLink(
                        property.ownerPhone,
                        `مرحبًا، أنا مهتم بهذا الإعلان: ${property.title}`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="whatsapp-btn"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      التواصل عبر واتساب
                    </a>
                  )}

                  {property.ownerPhone && (
                    <PhoneRevealButton phone={property.ownerPhone} />
                  )}

                </div>
              </div>

              {msgError && (
                <div style={{ marginBottom: "0.5rem" }}>
                  <p style={{ margin: "0 0 0.4rem", color: "#dc2626", fontSize: "0.82rem" }}>
                    {msgError}
                  </p>
                  {msgIsConvLimit && (
                    <Link
                      href="/dashboard/subscription/plans"
                      style={{
                        display: "inline-block",
                        padding: "0.35rem 1rem",
                        background: "var(--color-primary)",
                        color: "#fff",
                        borderRadius: 7,
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        textDecoration: "none",
                      }}
                    >
                      ترقية الباقة
                    </Link>
                  )}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>

                {/* Add to favorites */}
                <button
                  type="button"
                  onClick={toggleFav}
                  disabled={favLoading}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    background: isFav ? "#fef2f2" : "#f8fafc",
                    color: isFav ? "#dc2626" : "var(--color-text-secondary)",
                    border: `1px solid ${isFav ? "#fecaca" : "var(--color-border)"}`,
                    padding: "0.65rem 1rem", borderRadius: 10, fontWeight: 600, fontSize: "0.9rem",
                    cursor: favLoading ? "not-allowed" : "pointer", opacity: favLoading ? 0.7 : 1,
                  }}
                >
                  {isFav ? "❤️ في المفضلة" : "🤍 أضف للمفضلة"}
                </button>

              </div>
            </div>

            {/* ── Reference card ── */}
            <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem", marginBottom: "1rem", fontSize: "0.83rem", color: "var(--color-text-secondary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <span>رقم الإعلان</span>
                <strong style={{ color: "var(--color-text-primary)", fontFamily: "monospace" }}>#{shortRef(property.id)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                <span>تاريخ النشر</span>
                <span>{formatDate(property.createdAt)}</span>
              </div>
              {property.viewCount != null && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>عدد المشاهدات</span>
                  <span>{property.viewCount.toLocaleString("en")}</span>
                </div>
              )}
            </div>

            {/* ── Property details card ── */}
            <div className="detail-info-card">
              <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>تفاصيل العقار</h2>

              <DetailRow label="الحالة"  value={PROPERTY_STATUS_LABELS[property.status] ?? property.status} />
              <DetailRow label="المساحة" value={`${property.area} م²`} />
              {property.bedrooms  != null && <DetailRow label="غرف النوم"    value={String(property.bedrooms)} />}
              {property.bathrooms != null && <DetailRow label="دورات المياه" value={String(property.bathrooms)} />}
              {property.hallsCount != null && <DetailRow label="صالات"       value={String(property.hallsCount)} />}
              {property.floor && <DetailRow label="الطابق"       value={FLOOR_LABELS[property.floor] ?? property.floor} />}
              {property.propertyAge != null && <DetailRow label="عمر العقار" value={`${property.propertyAge} سنة`} />}
              {property.ownershipType && <DetailRow label="نوع الملكية" value={OWNERSHIP_TYPE_LABELS[property.ownershipType] ?? property.ownershipType} />}
              <DetailRow label="المدينة"  value={`${property.province ? property.province + " — " : ""}${property.city}`} />
            </div>

          </div>
        </div>

      </div>
      {bookingOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.45)",
          zIndex: 80,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}>
          <form
            onSubmit={submitBooking}
            style={{
              width: "100%",
              maxWidth: 440,
              maxHeight: "90dvh",
              overflowY: "auto",
              background: "var(--color-bg-card)",
              borderRadius: "18px",
              border: "1px solid var(--color-border)",
              padding: "1.25rem",
              boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>طلب حجز</h2>
                <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>{property.title}</p>
              </div>
              <button type="button" onClick={() => setBookingOpen(false)} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700 }}>
                تاريخ الوصول
                <input
                  required
                  type="date"
                  value={bookingForm.startDate}
                  min={todayIso()}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setBookingForm((prev) => ({
                      ...prev,
                      startDate: newStart,
                      // Clear endDate if it's no longer after the new startDate
                      endDate: prev.endDate && prev.endDate > newStart ? prev.endDate : "",
                    }));
                  }}
                  style={{ width: "100%", marginTop: "0.35rem", padding: "0.7rem", border: "1px solid var(--color-border)", borderRadius: 10 }}
                />
              </label>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700 }}>
                تاريخ المغادرة
                <input
                  required
                  type="date"
                  value={bookingForm.endDate}
                  min={bookingForm.startDate
                    ? (() => {
                        // min for checkout = day after checkin
                        const d = new Date(`${bookingForm.startDate}T00:00:00Z`);
                        d.setUTCDate(d.getUTCDate() + 1);
                        return d.toISOString().slice(0, 10);
                      })()
                    : todayIso()}
                  onChange={(e) => setBookingForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  style={{ width: "100%", marginTop: "0.35rem", padding: "0.7rem", border: "1px solid var(--color-border)", borderRadius: 10 }}
                />
              </label>
            </div>

            {hasSelectedDates && (
              <div style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: "0.75rem", marginBottom: "0.75rem", background: "#f8fafc" }}>
                <p style={{ margin: "0 0 0.4rem", color: "#334155", fontSize: "0.85rem", fontWeight: 800 }}>
                  الفترة المختارة: {formatDate(bookingForm.startDate)} إلى {formatDate(bookingForm.endDate)}
                </p>
                {availability === "checking" && <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>جاري التحقق من التوفر...</p>}
                {availability === "available" && <p style={{ margin: 0, color: "#15803d", fontSize: "0.85rem", fontWeight: 800 }}>✅ متاح للحجز</p>}
                {availability === "unavailable" && <p style={{ margin: 0, color: "#b91c1c", fontSize: "0.85rem", fontWeight: 800 }}>❌ {availabilityError || "غير متاح لهذه الفترة"}</p>}
                {availability === "error" && <p style={{ margin: 0, color: "#b91c1c", fontSize: "0.85rem", fontWeight: 800 }}>{availabilityError}</p>}
                {bookingNights > 0 && (
                  <div style={{ marginTop: "0.65rem", paddingTop: "0.65rem", borderTop: "1px solid #e2e8f0", display: "grid", gap: "0.35rem", color: "#334155", fontSize: "0.85rem" }}>
                    <span>السعر: {bookingNights.toLocaleString("en")} ليلة × {formatPrice(property.price, property.currency)}</span>
                    <strong>الإجمالي: {formatPrice(bookingTotal, property.currency)}</strong>
                    <span>عمولة المنصة ({bookingCommissionPercent}%): {formatPrice(bookingCommission, property.currency)}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: "0.75rem" }}>
              <span style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>عدد الضيوف</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", border: "1px solid var(--color-border)", borderRadius: 10, padding: "0.5rem 0.75rem", width: "fit-content" }}>
                <button
                  type="button"
                  onClick={() => setBookingForm((prev) => ({ ...prev, guestCount: Math.max(1, prev.guestCount - 1) }))}
                  style={{ width: 32, height: 32, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", cursor: "pointer", fontWeight: 800, fontSize: "1.1rem" }}
                >
                  −
                </button>
                <span style={{ minWidth: 24, textAlign: "center", fontWeight: 800, fontSize: "1rem" }}>{bookingForm.guestCount}</span>
                <button
                  type="button"
                  onClick={() => setBookingForm((prev) => ({ ...prev, guestCount: Math.min(50, prev.guestCount + 1) }))}
                  style={{ width: 32, height: 32, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc", cursor: "pointer", fontWeight: 800, fontSize: "1.1rem" }}
                >
                  +
                </button>
              </div>
            </div>

            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              الاسم
              <input
                required
                maxLength={120}
                value={bookingForm.guestName}
                onChange={(e) => setBookingForm((prev) => ({ ...prev, guestName: e.target.value }))}
                style={{ width: "100%", marginTop: "0.35rem", padding: "0.7rem", border: "1px solid var(--color-border)", borderRadius: 10 }}
              />
            </label>

            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              رقم الهاتف (اختياري)
              <input
                maxLength={40}
                value={bookingForm.phone}
                onChange={(e) => setBookingForm((prev) => ({ ...prev, phone: e.target.value }))}
                style={{ width: "100%", marginTop: "0.35rem", padding: "0.7rem", border: "1px solid var(--color-border)", borderRadius: 10 }}
              />
            </label>

            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.75rem" }}>
              ملاحظات (اختياري)
              <textarea
                maxLength={1000}
                rows={3}
                value={bookingForm.notes}
                onChange={(e) => setBookingForm((prev) => ({ ...prev, notes: e.target.value }))}
                style={{ width: "100%", marginTop: "0.35rem", padding: "0.7rem", border: "1px solid var(--color-border)", borderRadius: 10, resize: "vertical" }}
              />
            </label>

            {bookingError && <p style={{ color: "#dc2626", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>{bookingError}</p>}
            {bookingSuccess && <p style={{ color: "#166534", fontSize: "0.85rem", margin: "0 0 0.75rem" }}>{bookingSuccess}</p>}

            <button
              type="submit"
              disabled={!canSubmitBooking}
              style={{
                width: "100%",
                height: 48,
                border: "none",
                borderRadius: 12,
                background: "var(--color-primary)",
                color: "#fff",
                fontWeight: 800,
                cursor: canSubmitBooking ? "pointer" : "not-allowed",
                opacity: canSubmitBooking ? 1 : 0.75,
              }}
            >
              {bookingLoading ? "جاري الإرسال..." : availability === "unavailable" ? "الفترة غير متاحة" : "إرسال طلب الحجز"}
            </button>
          </form>
        </div>
      )}

      {/* Ratings section — DailyRent listings only */}
      {showRatings && (
        <div ref={reviewsSectionRef} className="container">
          <ListingRatings listingId={property.id} />
        </div>
      )}
    </div>
  );
}
