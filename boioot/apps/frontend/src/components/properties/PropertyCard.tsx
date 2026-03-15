import Link from "next/link";
import type { PropertyResponse } from "@/types";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  formatPrice,
} from "@/features/properties/constants";

interface PropertyCardProps {
  property: PropertyResponse;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const mainImage =
    property.images.find((img) => img.isPrimary) ?? property.images[0];

  return (
    <Link href={`/properties/${property.id}`} style={{ textDecoration: "none" }}>
      <article className="card property-card">
        {mainImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainImage.imageUrl}
            alt={property.title}
            className="property-card__img"
          />
        ) : (
          <div className="property-card__img-placeholder">🏠</div>
        )}

        <div className="property-card__body">
          <h3 className="property-card__title">{property.title}</h3>
          <p className="property-card__price">{formatPrice(property.price)}</p>
          <p className="property-card__city">📍 {property.city}</p>

          <div className="property-card__tags">
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
            {property.area > 0 && (
              <span className="badge badge-blue">{property.area} م²</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
