"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";
import InquiryForm from "@/components/ui/InquiryForm";
import { propertiesApi } from "@/features/properties/api";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  formatPrice,
} from "@/features/properties/constants";
import type { PropertyResponse } from "@/types";

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [property, setProperty]         = useState<PropertyResponse | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

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

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-background)", padding: "2rem 0" }}>
        <div className="container" style={{ paddingTop: "3rem" }}>
          <div className="error-banner">{error}</div>
          <Link href="/properties" className="btn btn-outline" style={{ marginTop: "1rem", display: "inline-block" }}>
            ← العودة إلى العقارات
          </Link>
        </div>
      </div>
    );
  }

  if (!property) return null;

  const sortedImages = property.images;
  const activeImage  = sortedImages[selectedImageIdx] ?? sortedImages[0];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)", padding: "2rem 0" }}>
      <div className="container">

        {/* Back link */}
        <Link
          href="/properties"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--color-text-secondary)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
            textDecoration: "none",
          }}
        >
          ← العودة إلى العقارات
        </Link>

        {/* Main image */}
        {activeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeImage.imageUrl}
            alt={property.title}
            className="detail-hero"
          />
        ) : (
          <div className="detail-hero-placeholder">🏠</div>
        )}

        {/* Image gallery thumbnails — only shown when there are multiple images */}
        {sortedImages.length > 1 && (
          <div className="gallery-thumbs">
            {sortedImages.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.imageUrl}
                alt={`صورة ${i + 1}`}
                className={`gallery-thumb${i === selectedImageIdx ? " gallery-thumb--active" : ""}`}
                onClick={() => setSelectedImageIdx(i)}
              />
            ))}
          </div>
        )}

        {/* Content grid */}
        <div className="detail-grid">

          {/* Left column — title, price, description */}
          <div>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              flexWrap: "wrap", marginBottom: "1rem",
            }}>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>
                {property.title}
              </h1>
              {property.listingType && (
                <span className="badge badge-green">
                  {LISTING_TYPE_LABELS[property.listingType] ?? property.listingType}
                </span>
              )}
              {property.type && (
                <span className="badge badge-gray">
                  {PROPERTY_TYPE_LABELS[property.type] ?? property.type}
                </span>
              )}
            </div>

            <p style={{
              fontSize: "1.5rem", fontWeight: 700,
              color: "var(--color-primary)", marginBottom: "1rem",
            }}>
              {formatPrice(property.price)}
            </p>

            <p style={{
              color: "var(--color-text-secondary)", marginBottom: "1.5rem",
              display: "flex", alignItems: "center", gap: "0.3rem",
            }}>
              📍 {property.city}
              {property.address && ` — ${property.address}`}
            </p>

            {property.description && (
              <div style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "1.5rem",
                marginBottom: "1.5rem",
              }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                  الوصف
                </h2>
                <p style={{
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.8, margin: 0,
                }}>
                  {property.description}
                </p>
              </div>
            )}
          </div>

          {/* Right column — property details card */}
          <div className="detail-info-card">
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>تفاصيل العقار</h2>

            <DetailRow
              label="الحالة"
              value={PROPERTY_STATUS_LABELS[property.status] ?? property.status}
            />
            <DetailRow label="المساحة" value={`${property.area} م²`} />

            {property.bedrooms != null && (
              <DetailRow label="غرف النوم" value={String(property.bedrooms)} />
            )}
            {property.bathrooms != null && (
              <DetailRow label="دورات المياه" value={String(property.bathrooms)} />
            )}

            <DetailRow label="الشركة" value={property.companyName} />
            <DetailRow label="المدينة"  value={property.city} />
          </div>

        </div>

        {/* ── Inquiry form ── */}
        <div style={{ marginTop: "2.5rem", paddingTop: "2.5rem", borderTop: "1px solid var(--color-border)" }}>
          <InquiryForm
            propertyId={property.id}
            contextTitle={property.title}
          />
        </div>

      </div>
    </div>
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
