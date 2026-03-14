"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";
import { propertiesService } from "@/services/properties.service";
import type { PropertyResponse } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  Apartment: "شقة",
  Villa: "فيلا",
  Land: "أرض",
  Office: "مكتب",
  Shop: "محل",
  House: "منزل",
};

const LISTING_LABELS: Record<string, string> = {
  ForSale: "للبيع",
  ForRent: "للإيجار",
};

const STATUS_LABELS: Record<string, string> = {
  Available: "متاح",
  Sold: "مباع",
  Rented: "مؤجر",
};

function formatPrice(price: number) {
  return price.toLocaleString("ar-SY") + " ل.س";
}

export default function PropertyDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [property, setProperty] = useState<PropertyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    propertiesService
      .getById(id)
      .then(setProperty)
      .catch(() => {
        setError("تعذّر تحميل بيانات العقار. ربما لم يعد متاحاً.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <div className="error-banner">{error}</div>
        <Link href="/properties" className="btn btn-outline" style={{ marginTop: "1rem" }}>
          ← العودة إلى العقارات
        </Link>
      </div>
    );
  }

  if (!property) return null;

  const mainImage =
    property.images.find((img) => img.isPrimary) ?? property.images[0];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)", padding: "2rem 0" }}>
      <div className="container">
        <Link
          href="/properties"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--color-text-secondary)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          ← العودة إلى العقارات
        </Link>

        {mainImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainImage.imageUrl}
            alt={property.title}
            className="detail-hero"
          />
        ) : (
          <div className="detail-hero-placeholder">🏠</div>
        )}

        <div className="detail-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>
                {property.title}
              </h1>
              {property.listingType && (
                <span className="badge badge-green">
                  {LISTING_LABELS[property.listingType] ?? property.listingType}
                </span>
              )}
              {property.type && (
                <span className="badge badge-gray">
                  {TYPE_LABELS[property.type] ?? property.type}
                </span>
              )}
            </div>

            <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: "1rem" }}>
              {formatPrice(property.price)}
            </p>

            <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
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
                <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>الوصف</h2>
                <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.8, margin: 0 }}>
                  {property.description}
                </p>
              </div>
            )}
          </div>

          <div className="detail-info-card">
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>تفاصيل العقار</h2>

            <div className="detail-info-row">
              <span className="detail-info-label">الحالة</span>
              <span className="detail-info-value">
                {STATUS_LABELS[property.status] ?? property.status}
              </span>
            </div>

            <div className="detail-info-row">
              <span className="detail-info-label">المساحة</span>
              <span className="detail-info-value">{property.area} م²</span>
            </div>

            {property.bedrooms != null && (
              <div className="detail-info-row">
                <span className="detail-info-label">غرف النوم</span>
                <span className="detail-info-value">{property.bedrooms}</span>
              </div>
            )}

            {property.bathrooms != null && (
              <div className="detail-info-row">
                <span className="detail-info-label">دورات المياه</span>
                <span className="detail-info-value">{property.bathrooms}</span>
              </div>
            )}

            <div className="detail-info-row">
              <span className="detail-info-label">الشركة</span>
              <span className="detail-info-value">{property.companyName}</span>
            </div>

            <div className="detail-info-row">
              <span className="detail-info-label">المدينة</span>
              <span className="detail-info-value">{property.city}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
