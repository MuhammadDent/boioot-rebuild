"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, normalizeError } from "@/lib/api";
import type { PropertyResponse } from "@/types";
import Spinner from "@/components/ui/Spinner";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";

const LISTING_TYPE_LABELS: Record<string, string> = {
  Sale: "للبيع",
  Rent: "للإيجار",
  DailyRent: "إيجار يومي",
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Apartment: "شقة",
  Villa: "فيلا",
  Office: "مكتب",
  Shop: "محل",
  Land: "أرض",
  Building: "بناء",
};

function formatPrice(price: number, currency: string) {
  if (currency === "USD") return `$${price.toLocaleString("en")}`;
  return `${price.toLocaleString("en")} ل.س`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "numeric", day: "numeric" });
}

export default function MyListingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [listings, setListings] = useState<PropertyResponse[]>([]);
  const [stats, setStats] = useState<{ used: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get<{ items: PropertyResponse[]; total: number }>("/properties/my-listings"),
        api.get<{ used: number; limit: number }>("/properties/my-listings/stats"),
      ]);
      setListings(listRes.items ?? []);
      setStats(statsRes);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("success") === "1") {
        setSuccessMsg("تم نشر إعلانك بنجاح!");
        window.history.replaceState({}, "", window.location.pathname);
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    }
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("هل تريد حذف هذا الإعلان نهائياً؟")) return;
    setDeletingId(id);
    try {
      await api.delete(`/properties/my-listings/${id}`);
      setListings((prev) => prev.filter((p) => p.id !== id));
      setStats((prev) => prev ? { ...prev, used: Math.max(0, prev.used - 1) } : prev);
    } catch (e) {
      alert(normalizeError(e));
    } finally {
      setDeletingId(null);
    }
  }

  if (authLoading || !user) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  const isUnlimited  = stats !== null && stats.limit >= 999;
  const limitReached = stats !== null && !isUnlimited && stats.used >= stats.limit;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "var(--color-text-primary)" }}>
              إعلاناتي العقارية
            </h1>
            <Link
              href="/dashboard/properties/new"
              style={{
                padding: "0.55rem 1.3rem", borderRadius: 9,
                background: limitReached ? "#9ca3af" : "var(--color-primary)",
                color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem",
                pointerEvents: limitReached ? "none" : "auto",
                opacity: limitReached ? 0.65 : 1,
              }}
            >
              + إعلان جديد
            </Link>
          </div>
        </div>

        {/* ── Success ── */}
        {successMsg && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "0.85rem 1.1rem", marginBottom: "1.2rem", color: "#166534", fontWeight: 600, fontSize: "0.9rem" }}>
            ✓ {successMsg}
          </div>
        )}

        {/* ── Monthly stats (only for limited plans) ── */}
        {stats !== null && !isUnlimited && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
            background: limitReached ? "#fff1f2" : "#f8fafc",
            border: `1px solid ${limitReached ? "#fecaca" : "#e2e8f0"}`,
            borderRadius: 12, padding: "0.85rem 1.2rem", marginBottom: "1.5rem",
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: limitReached ? "#dc2626" : "#374151" }}>
                {limitReached ? "وصلت إلى الحد الأقصى هذا الشهر" : `باقٍ لك ${stats.limit - stats.used} إعلان هذا الشهر`}
              </p>
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                الاستخدام الشهري: {stats.used} / {stats.limit} · {limitReached && "ترقية العضوية تمنحك حداً أعلى"}
              </p>
            </div>
            <div style={{
              background: limitReached ? "#dc2626" : "var(--color-primary)",
              color: "#fff", borderRadius: 99, padding: "0.3rem 0.9rem",
              fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap",
            }}>
              {stats.used} / {stats.limit}
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ background: "#fff1f2", border: "1px solid #fecaca", borderRadius: 10, padding: "0.85rem 1.1rem", marginBottom: "1.2rem", color: "#dc2626", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <Spinner />
          </div>
        ) : listings.length === 0 ? (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "3rem 2rem", textAlign: "center" }}>
            <p style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "#374151", fontWeight: 600 }}>لا توجد إعلانات بعد</p>
            <p style={{ margin: "0 0 1.5rem", fontSize: "0.85rem", color: "#94a3b8" }}>أضف إعلانك الأول الآن وابدأ في التواصل مع المشترين</p>
            <Link
              href="/dashboard/properties/new"
              style={{ padding: "0.65rem 1.5rem", borderRadius: 9, background: "var(--color-primary)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}
            >
              + أضف إعلانك الأول
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {listings.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
                  padding: "1.1rem 1.3rem", display: "flex", gap: "1rem",
                  alignItems: "flex-start", flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.45rem" }}>
                    <span style={{ background: "#f0fdf4", color: "#16a34a", borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: "0.75rem", fontWeight: 700 }}>
                      {LISTING_TYPE_LABELS[p.listingType] ?? p.listingType}
                    </span>
                    <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: "0.75rem", fontWeight: 600 }}>
                      {PROPERTY_TYPE_LABELS[p.type] ?? p.type}
                    </span>
                  </div>
                  <h3 style={{ margin: "0 0 0.3rem", fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                    {p.title}
                  </h3>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.82rem", color: "#64748b" }}>
                    <span>📍 {p.city}{p.neighborhood ? ` / ${p.neighborhood}` : ""}</span>
                    <span>💰 {formatPrice(p.price, p.currency)}</span>
                    <span>📐 {p.area} م²</span>
                  </div>
                  <p style={{ margin: "0.4rem 0 0", fontSize: "0.77rem", color: "#94a3b8" }}>
                    {formatDate(p.createdAt)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0, alignItems: "center" }}>
                  <Link
                    href={`/properties/${p.id}`}
                    style={{ padding: "0.45rem 0.9rem", borderRadius: 7, border: "1.5px solid #e2e8f0", color: "#374151", textDecoration: "none", fontWeight: 600, fontSize: "0.82rem" }}
                  >
                    عرض
                  </Link>
                  <Link
                    href={`/dashboard/properties/${p.id}/edit`}
                    style={{ padding: "0.45rem 0.9rem", borderRadius: 7, border: "1.5px solid #bbf7d0", color: "#16a34a", textDecoration: "none", fontWeight: 600, fontSize: "0.82rem" }}
                  >
                    تعديل
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    style={{
                      padding: "0.45rem 0.9rem", borderRadius: 7,
                      border: "1.5px solid #fee2e2", color: "#dc2626",
                      background: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem",
                      opacity: deletingId === p.id ? 0.6 : 1,
                    }}
                  >
                    {deletingId === p.id ? "جاري الحذف..." : "حذف"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
