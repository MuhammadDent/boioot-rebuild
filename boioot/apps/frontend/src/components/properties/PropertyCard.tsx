import Link from "next/link";
import type { PropertyResponse } from "@/types";

const LISTING_TYPE_LABEL: Record<string, string> = {
  Sale: "للبيع",
  Rent: "للإيجار",
  Investment: "للاستثمار",
};

const TYPE_LABEL: Record<string, string> = {
  Apartment: "شقة",
  Villa: "فيلا",
  Land: "أرض",
  Office: "مكتب",
  Shop: "محل",
  Warehouse: "مستودع",
  Building: "بناء",
  Other: "أخرى",
};

function formatPrice(price: number): string {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)} م`;
  if (price >= 1_000) return `${Math.round(price / 1_000)} ألف`;
  return price.toLocaleString("ar-SY");
}

export default function PropertyCard({ property }: { property: PropertyResponse }) {
  const mainImage = property.images.find((i) => i.isMain) ?? property.images[0];

  return (
    <Link href={`/properties/${property.id}`} className="card property-card" style={{ textDecoration: "none" }}>
      {mainImage ? (
        <img
          src={mainImage.url}
          alt={property.title}
          className="property-card__img"
        />
      ) : (
        <div className="property-card__img-placeholder">🏠</div>
      )}

      <div className="property-card__body">
        <h3 className="property-card__title">{property.title}</h3>

        <p className="property-card__price">
          {formatPrice(property.price)} ل.س
        </p>

        <div className="property-card__meta">
          <span>📍 {property.city}</span>
          {property.area && <span>📐 {property.area} م²</span>}
          {property.bedrooms != null && <span>🛏 {property.bedrooms}</span>}
          {property.bathrooms != null && <span>🚿 {property.bathrooms}</span>}
        </div>

        <div className="property-card__tags">
          <span className="badge badge-green">
            {LISTING_TYPE_LABEL[property.listingType] ?? property.listingType}
          </span>
          <span className="badge badge-blue">
            {TYPE_LABEL[property.type] ?? property.type}
          </span>
          <span style={{ color: "var(--color-text-muted)", fontSize: "0.78rem", marginRight: "auto" }}>
            {property.companyName}
          </span>
        </div>
      </div>
    </Link>
  );
}
