"use client";

import { useEffect, useState } from "react";
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

function formatPrice(price: number) {
  return price.toLocaleString("ar-SY") + " ل.س";
}

function PropertyCard({ property }: { property: PropertyResponse }) {
  const mainImage = property.images.find((img) => img.isPrimary) ?? property.images[0];

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
                {LISTING_LABELS[property.listingType] ?? property.listingType}
              </span>
            )}
            {property.type && (
              <span className="badge badge-gray">
                {TYPE_LABELS[property.type] ?? property.type}
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

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    propertiesService
      .getList({ page, pageSize: 12 })
      .then((res) => {
        setProperties(res.items);
        setHasNext(res.hasNext);
        setHasPrev(res.hasPrevious);
        setTotalCount(res.totalCount);
      })
      .catch(() => {
        setError("تعذّر تحميل العقارات. يرجى المحاولة مجدداً.");
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)" }}>
      <div className="container" style={{ padding: "2.5rem 1.5rem" }}>
        <div className="page-header">
          <h1 className="page-header__title">العقارات المتاحة</h1>
          {!loading && !error && (
            <p className="page-header__subtitle">
              {totalCount > 0 ? `${totalCount} عقار` : "لا توجد عقارات حالياً"}
            </p>
          )}
        </div>

        {loading && <Spinner />}

        {!loading && error && (
          <div className="error-banner">{error}</div>
        )}

        {!loading && !error && properties.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">🏘️</div>
            <h2 className="empty-state__title">لا توجد عقارات متاحة</h2>
            <p className="empty-state__desc">لم يتم إضافة أي عقارات حتى الآن.</p>
          </div>
        )}

        {!loading && !error && properties.length > 0 && (
          <>
            <div className="grid-cards">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>

            {(hasPrev || hasNext) && (
              <div className="pagination">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={!hasPrev}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← السابق
                </button>
                <span className="pagination__info">صفحة {page}</span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={!hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  التالي →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
