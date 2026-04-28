"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { favoritesApi } from "@/features/favorites/api";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import type { FavoriteResponse } from "@/types";

const LISTING_TYPE_LABELS: Record<string, string> = {
  Sale:       "للبيع",
  Rent:       "للإيجار",
  DailyRent:  "إيجار يومي",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Apartment: "شقة سكنية",
  Villa:     "فيلا",
  Office:    "مكتب",
  Shop:      "محل تجاري",
  Land:      "أرض",
  Building:  "بناء كامل",
};

function formatPrice(price: number, currency: string): string {
  const cur = (currency ?? "SYP").toUpperCase().trim();
  if (cur === "USD") return "$" + price.toLocaleString("en");
  return price.toLocaleString("en") + " ل.س";
}

export default function FavoritesPage() {
  useProtectedRoute();

  const [favorites, setFavorites] = useState<FavoriteResponse[]>([]);
  const [loading, setLoading]     = useState(true);
  const [removing, setRemoving]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await favoritesApi.list();
      setFavorites(data);
    } catch {
      toast.error("تعذّر تحميل المفضلة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRemove(propertyId: string) {
    setRemoving(propertyId);
    try {
      await favoritesApi.toggle(propertyId);
      setFavorites((prev) => prev.filter((f) => f.propertyId !== propertyId));
      toast.success("تمت الإزالة من المفضلة");
    } catch {
      toast.error("تعذّرت الإزالة");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 800, margin: "0 auto", direction: "rtl" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>
          المفضلة
        </h1>
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#6B7280" }}>
          العقارات التي أضفتها إلى قائمة المفضلة
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "3rem 0", color: "#6B7280" }}>
          <div style={{
            width: 32, height: 32, border: "3px solid #E5E7EB",
            borderTopColor: "#16A34A", borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 0.75rem",
          }} />
          جارٍ التحميل…
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Empty state */}
      {!loading && favorites.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "4rem 1.5rem",
          background: "#F9FAFB",
          borderRadius: 12,
          border: "1px dashed #D1FAE5",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🤍</div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "1rem", color: "#374151" }}>
            لا توجد عناصر مفضلة حتى الآن
          </p>
          <p style={{ margin: "0.4rem 0 1.25rem", fontSize: "0.875rem", color: "#6B7280" }}>
            تصفح العقارات وأضف ما يعجبك إلى المفضلة
          </p>
          <Link
            href="/properties"
            style={{
              display: "inline-block",
              padding: "0.5rem 1.25rem",
              backgroundColor: "#16A34A",
              color: "#fff",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            تصفح العقارات
          </Link>
        </div>
      )}

      {/* Favorites list */}
      {!loading && favorites.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {favorites.map((fav) => (
            <div
              key={fav.favoriteId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
                background: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                padding: "0.85rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: 72,
                height: 72,
                borderRadius: 8,
                overflow: "hidden",
                flexShrink: 0,
                background: "#F3F4F6",
              }}>
                {fav.thumbnailUrl ? (
                  <img
                    src={fav.thumbnailUrl}
                    alt={fav.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.5rem", color: "#9CA3AF",
                  }}>
                    🏠
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={`/properties/${fav.propertyId}`}
                  style={{ textDecoration: "none" }}
                >
                  <p style={{
                    margin: 0, fontSize: "0.95rem", fontWeight: 600,
                    color: "#111827", whiteSpace: "nowrap", overflow: "hidden",
                    textOverflow: "ellipsis",
                    transition: "color 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLParagraphElement).style.color = "#16A34A"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLParagraphElement).style.color = "#111827"; }}
                  >
                    {fav.title}
                  </p>
                </Link>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                  <span style={{
                    fontSize: "0.75rem", padding: "2px 7px",
                    background: "#DCFCE7", color: "#166534",
                    borderRadius: 4, fontWeight: 500,
                  }}>
                    {LISTING_TYPE_LABELS[fav.listingType] ?? fav.listingType}
                  </span>
                  <span style={{
                    fontSize: "0.75rem", padding: "2px 7px",
                    background: "#F3F4F6", color: "#374151",
                    borderRadius: 4,
                  }}>
                    {PROPERTY_TYPE_LABELS[fav.type] ?? fav.type}
                  </span>
                  {fav.city && (
                    <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                      📍 {fav.city}
                    </span>
                  )}
                </div>

                <p style={{ margin: "0.3rem 0 0", fontSize: "0.875rem", fontWeight: 600, color: "#16A34A" }}>
                  {formatPrice(fav.price, fav.currency)}
                </p>
              </div>

              {/* Remove button */}
              <button
                onClick={() => handleRemove(fav.propertyId)}
                disabled={removing === fav.propertyId}
                title="إزالة من المفضلة"
                style={{
                  flexShrink: 0,
                  width: 34, height: 34,
                  borderRadius: "50%",
                  border: "1px solid #FEE2E2",
                  background: removing === fav.propertyId ? "#F9FAFB" : "#FFF5F5",
                  color: removing === fav.propertyId ? "#9CA3AF" : "#EF4444",
                  cursor: removing === fav.propertyId ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1rem",
                  transition: "background 0.15s",
                }}
              >
                {removing === fav.propertyId ? "…" : "🗑"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
