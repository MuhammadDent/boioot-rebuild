"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PropertyResponse } from "@/types";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  formatPrice,
} from "@/features/properties/constants";
import { favoritesApi } from "@/features/favorites/api";
import { useAuth } from "@/context/AuthContext";

interface PropertyCardProps {
  property: PropertyResponse;
  initialIsFavorited?: boolean;
}

export default function PropertyCard({ property, initialIsFavorited = false }: PropertyCardProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const mainImage = property.images.find((img) => img.isPrimary) ?? property.images[0];

  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [toggling, setToggling] = useState(false);

  async function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (toggling) return;
    setToggling(true);
    try {
      const { added } = await favoritesApi.toggle(property.id);
      setIsFavorited(added);
    } catch {
      /* silent */
    } finally {
      setToggling(false);
    }
  }

  return (
    <Link href={`/properties/${property.id}`} style={{ textDecoration: "none" }}>
      <article className="card property-card">
        <div style={{ position: "relative" }}>
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

          {/* Heart button */}
          <button
            onClick={handleFavorite}
            title={isFavorited ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
            style={{
              position: "absolute",
              top: "0.55rem",
              left: "0.55rem",
              width: 34,
              height: 34,
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.92)",
              border: "none",
              cursor: toggling ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
              transition: "transform 0.15s",
              zIndex: 1,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill={isFavorited ? "#ef4444" : "none"}
              stroke={isFavorited ? "#ef4444" : "#94a3b8"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        <div className="property-card__body">
          <h3 className="property-card__title">{property.title}</h3>
          <p className="property-card__price">{formatPrice(property.price, property.currency)}</p>
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
