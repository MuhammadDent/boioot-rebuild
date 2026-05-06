"use client";

import Link from "next/link";
import Image from "next/image";
import { memo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { PropertyResponse } from "@/types";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  formatPrice,
} from "@/features/properties/constants";
import { normalizeImageUrl } from "@/lib/imageUrl";
import VerificationBadge from "@/components/properties/VerificationBadge";
import { favoritesApi } from "@/features/favorites/api";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";

interface PropertyCardProps {
  property: PropertyResponse;
  initialIsFavorited?: boolean;
  priority?: boolean;
}

function PropertyCardInner({ property, initialIsFavorited = false, priority = false }: PropertyCardProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthGate();
  const mainImage = property.images.find((img) => img.isPrimary) ?? property.images[0];

  // ── Optimistic favorite state ──────────────────────────────────────────────
  // Toggle state immediately on click; roll back on API failure.
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [toggling, setToggling] = useState(false);

  const doToggle = useCallback(async () => {
    if (toggling) return;
    // Optimistic update — instant feedback before the network round-trip
    const optimisticValue = !isFavorited;
    setIsFavorited(optimisticValue);
    setToggling(true);
    try {
      const { added } = await favoritesApi.toggle(property.id);
      // Reconcile with server response in case it differs
      if (added !== optimisticValue) setIsFavorited(added);
    } catch {
      // Rollback on failure
      setIsFavorited(!optimisticValue);
    } finally {
      setToggling(false);
    }
  }, [isFavorited, toggling, property.id]);

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) { openAuthModal(() => { void doToggle(); }); return; }
    void doToggle();
  }, [isAuthenticated, openAuthModal, doToggle]);

  // ── Phase 3: Prefetch property detail on hover ─────────────────────────────
  const handleMouseEnter = useCallback(() => {
    router.prefetch(`/properties/${property.id}`);
  }, [router, property.id]);

  return (
    <div style={{ position: "relative", height: "100%" }} onMouseEnter={handleMouseEnter}>
      <Link
        href={`/properties/${property.id}`}
        style={{ textDecoration: "none", display: "block", height: "100%" }}
      >
        <article className="card property-card">
          <div style={{ position: "relative", overflow: "hidden" }}>
            {mainImage ? (
              <Image
                src={normalizeImageUrl(mainImage.thumbnailUrl ?? mainImage.imageUrl)!}
                alt={property.title}
                className="property-card__img"
                width={400}
                height={200}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={priority}
                loading={priority ? undefined : "lazy"}
                fetchPriority={priority ? "high" : "auto"}
                decoding={priority ? "sync" : "async"}
              />
            ) : (
              <div className="property-card__img-placeholder">🏠</div>
            )}
          </div>

          <div className="property-card__body">
            <h3 className="property-card__title">{property.title}</h3>
            <p className="property-card__price">{formatPrice(property.price, property.currency)}</p>
            <p className="property-card__city">📍 {property.city}</p>

            {/* Rating row — always reserves the same vertical space via min-height */}
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#92400e", display: "flex", alignItems: "center", gap: "0.2rem", minHeight: "1.2em" }}>
              {property.ratingsCount != null && property.ratingsCount > 0 && (
                <>
                  <span style={{ color: "#f59e0b" }}>★</span>
                  <span style={{ fontWeight: 600 }}>{property.averageRating?.toFixed(1)}</span>
                  <span style={{ color: "#6b7280" }}>({property.ratingsCount})</span>
                </>
              )}
            </p>

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
              <VerificationBadge
                level={property.ownerVerificationLevel}
                isVerified={property.ownerIsVerified}
                size="sm"
              />
            </div>
          </div>
        </article>
      </Link>

      {/* Heart button — outside <Link> to satisfy HTML5 interactive-content rule */}
      <button
        type="button"
        onClick={handleFavorite}
        title={isFavorited ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
        aria-pressed={isFavorited}
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
          zIndex: 2,
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
          style={{ transition: "fill 0.15s, stroke 0.15s" }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
    </div>
  );
}

// Phase 6: Memoize — prevents re-render when parent re-renders with same props
export default memo(PropertyCardInner);
