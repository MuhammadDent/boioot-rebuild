"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";
import { propertiesApi } from "@/features/properties/api";
import { favoritesApi } from "@/features/favorites/api";
import { messagingApi } from "@/features/dashboard/messages/api";
import { useAuth } from "@/context/AuthContext";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  FEATURE_LABEL,
  formatPrice,
} from "@/features/properties/constants";
import type { PropertyResponse } from "@/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function shortRef(id: string) {
  return id.replace(/-/g, "").slice(-8).toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric", month: "numeric", day: "numeric",
  });
}

function waLink(phone: string, text = "") {
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

// ─── Share helpers ─────────────────────────────────────────────────────────────

function shareUrls(url: string, title: string) {
  const enc = encodeURIComponent;
  return {
    whatsapp: `https://wa.me/?text=${enc(title + "\n" + url)}`,
    telegram:  `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`,
    facebook:  `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    messenger: `https://www.facebook.com/dialog/send?link=${enc(url)}&app_id=291494419107518&redirect_uri=${enc(url)}`,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;

  const [property, setProperty] = useState<PropertyResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const [isFav, setIsFav]           = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError]     = useState("");

  const [pageUrl, setPageUrl]       = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    setSelectedImageIdx(0);

    propertiesApi
      .getById(id)
      .then(setProperty)
      .catch(() => setError("تعذّر تحميل بيانات العقار. ربما لم يعد متاحاً."))
      .finally(() => setLoading(false));
  }, [id]);

  // Load favorite status when user is logged in
  useEffect(() => {
    if (!user || !id) return;
    favoritesApi.ids()
      .then((ids) => setIsFav(ids.includes(id)))
      .catch(() => {});
  }, [user, id]);

  const toggleFav = useCallback(async () => {
    if (!user) { router.push(`/login?redirect=/properties/${id}`); return; }
    setFavLoading(true);
    try {
      const { added } = await favoritesApi.toggle(id);
      setIsFav(added);
    } catch { /* silent */ } finally { setFavLoading(false); }
  }, [user, id, router]);

  const openChat = useCallback(async () => {
    if (!user) { router.push(`/login?redirect=/properties/${id}`); return; }
    if (!property) return;
    const recipientId = property.ownerId ?? property.agentId?.toString();
    if (!recipientId) return;
    if (recipientId === user.id) return; // can't message yourself
    setMsgLoading(true);
    setMsgError("");
    try {
      const conv = await messagingApi.getOrCreateConversation({
        recipientId,
        propertyId: id,
      });
      router.push(`/dashboard/messages/${conv.id}`);
    } catch {
      setMsgError("تعذّر فتح المحادثة، حاول مجدداً.");
    } finally { setMsgLoading(false); }
  }, [user, property, id, router]);

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-background)", padding: "2rem 0" }}>
        <div className="container" style={{ paddingTop: "3rem" }}>
          <div className="error-banner">{error}</div>
          <Link href="/" className="btn btn-outline" style={{ marginTop: "1rem", display: "inline-block" }}>
            ← العودة إلى الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  if (!property) return null;

  const sortedImages = property.images;
  const activeImage  = sortedImages[selectedImageIdx] ?? sortedImages[0];
  const shares       = shareUrls(pageUrl, property.title);
  const hasRecipient = !!(property.ownerId ?? property.agentId);
  const isOwn = user && (user.id === property.ownerId || user.id === property.agentId?.toString());

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)", padding: "2rem 0" }}>
      <div className="container">

        {/* Back link */}
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          color: "var(--color-text-secondary)", fontSize: "0.9rem",
          marginBottom: "1.5rem", textDecoration: "none",
        }}>
          ← العودة إلى الرئيسية
        </Link>

        {/* ── Hero image ── */}
        {activeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={activeImage.imageUrl} alt={property.title} className="detail-hero" />
        ) : (
          <div className="detail-hero-placeholder">🏠</div>
        )}

        {/* Thumbnails */}
        {sortedImages.length > 1 && (
          <div className="gallery-thumbs">
            {sortedImages.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img.id} src={img.imageUrl} alt={`صورة ${i + 1}`}
                className={`gallery-thumb${i === selectedImageIdx ? " gallery-thumb--active" : ""}`}
                onClick={() => setSelectedImageIdx(i)}
              />
            ))}
          </div>
        )}

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
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              📍 {property.province && `${property.province} — `}{property.city}
              {property.neighborhood && ` — ${property.neighborhood}`}
              {property.address && ` — ${property.address}`}
            </p>

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
            <div style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "1.25rem", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.85rem" }}>المعلن</h2>

              {/* Photo + name row */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
                {property.ownerPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={property.ownerPhoto} alt={property.ownerName ?? "المعلن"}
                    style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--color-border)", flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
                    👤
                  </div>
                )}
                <div>
                  {property.ownerName && (
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem" }}>{property.ownerName}</p>
                  )}
                  {property.ownerPhone && (
                    <p style={{ margin: "0.15rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.85rem", direction: "ltr", textAlign: "right" }}>
                      {property.ownerPhone}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>

                {/* WhatsApp button */}
                {property.ownerPhone && (
                  <a
                    href={waLink(property.ownerPhone, `مرحباً، أودّ الاستفسار عن إعلانكم: ${property.title}`)}
                    target="_blank" rel="noreferrer"
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      background: "#25d366", color: "#fff", padding: "0.65rem 1rem",
                      borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.9rem",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    تواصل عبر واتساب
                  </a>
                )}

                {/* Message via system */}
                {hasRecipient && !isOwn && (
                  <button
                    type="button"
                    onClick={openChat}
                    disabled={msgLoading}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.5rem",
                      background: "var(--color-primary)", color: "#fff", padding: "0.65rem 1rem",
                      borderRadius: 10, fontWeight: 700, fontSize: "0.9rem",
                      border: "none", cursor: msgLoading ? "not-allowed" : "pointer", opacity: msgLoading ? 0.7 : 1,
                    }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {msgLoading ? "جاري الفتح..." : "إرسال رسالة"}
                  </button>
                )}

                {msgError && <p style={{ margin: 0, color: "#dc2626", fontSize: "0.82rem" }}>{msgError}</p>}

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
              {property.floor && <DetailRow label="الطابق"       value={property.floor} />}
              {property.propertyAge != null && <DetailRow label="عمر العقار" value={`${property.propertyAge} سنة`} />}
              {property.ownershipType && <DetailRow label="نوع الملكية" value={property.ownershipType} />}
              <DetailRow label="المدينة"  value={`${property.province ? property.province + " — " : ""}${property.city}`} />
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
