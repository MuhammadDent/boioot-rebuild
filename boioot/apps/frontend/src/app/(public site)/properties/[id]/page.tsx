"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { propertiesService } from "@/services/properties.service";
import Spinner from "@/components/ui/Spinner";
import type { PropertyResponse } from "@/types";

const LISTING_TYPE_LABEL: Record<string, string> = {
  Sale: "للبيع", Rent: "للإيجار", Investment: "للاستثمار",
};
const TYPE_LABEL: Record<string, string> = {
  Apartment: "شقة", Villa: "فيلا", Land: "أرض", Office: "مكتب",
  Shop: "محل", Warehouse: "مستودع", Building: "بناء", Other: "أخرى",
};
const STATUS_LABEL: Record<string, string> = {
  Available: "متاح", Sold: "مباع", Rented: "مؤجر", Reserved: "محجوز",
};

function formatPrice(price: number): string {
  return price.toLocaleString("ar-SY") + " ل.س";
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<PropertyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    propertiesService
      .getPublicById(id)
      .then(setProperty)
      .catch(() => setError("تعذّر تحميل بيانات العقار."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;

  if (error || !property) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <div className="error-banner">{error || "العقار غير موجود."}</div>
        <Link href="/properties" className="btn btn-outline btn-sm" style={{ marginTop: "1rem" }}>
          العودة للقائمة
        </Link>
      </div>
    );
  }

  const mainImage = property.images.find((i) => i.isMain) ?? property.images[0];

  return (
    <div style={{ padding: "2rem 1.5rem" }}>
      <div className="container">
        <Link href="/properties" className="btn btn-ghost btn-sm" style={{ marginBottom: "1.5rem", display: "inline-flex" }}>
          ← العودة للعقارات
        </Link>

        {mainImage ? (
          <img src={mainImage.url} alt={property.title} className="detail-hero" />
        ) : (
          <div className="detail-hero-placeholder">🏠</div>
        )}

        <div className="detail-grid">
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.75rem" }}>
              {property.title}
            </h1>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <span className="badge badge-green">{LISTING_TYPE_LABEL[property.listingType] ?? property.listingType}</span>
              <span className="badge badge-blue">{TYPE_LABEL[property.type] ?? property.type}</span>
              <span className="badge badge-gray">{STATUS_LABEL[property.status] ?? property.status}</span>
            </div>

            {property.description && (
              <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.8, marginBottom: "1.5rem" }}>
                {property.description}
              </p>
            )}

            {property.images.length > 1 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
                {property.images.map((img) => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt=""
                    style={{ width: 100, height: 70, objectFit: "cover", borderRadius: "var(--radius-md)" }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="detail-info-card">
            <div style={{ textAlign: "center", padding: "0.75rem 0" }}>
              <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-primary)" }}>
                {formatPrice(property.price)}
              </p>
            </div>

            {(
              [
                ["المدينة", property.city],
                ...(property.address ? [["العنوان", property.address] as [string, string]] : []),
                ["المساحة", `${property.area} م²`],
                ...(property.bedrooms != null ? [["غرف النوم", String(property.bedrooms)] as [string, string]] : []),
                ...(property.bathrooms != null ? [["الحمامات", String(property.bathrooms)] as [string, string]] : []),
                ["الشركة", property.companyName],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="detail-info-row">
                <span className="detail-info-label">{label}</span>
                <span className="detail-info-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
