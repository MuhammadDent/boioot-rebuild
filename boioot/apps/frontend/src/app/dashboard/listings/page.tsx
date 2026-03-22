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

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  Available: { label: "متاح",    color: "#16a34a", bg: "#f0fdf4" },
  Sold:      { label: "مباع",    color: "#2563eb", bg: "#eff6ff" },
  Rented:    { label: "مؤجَّر", color: "#d97706", bg: "#fffbeb" },
  Inactive:  { label: "معطَّل", color: "#6b7280", bg: "#f1f5f9" },
};

function formatPrice(price: number, currency: string) {
  if (currency === "USD") return `$${price.toLocaleString("en")}`;
  return `${price.toLocaleString("en")} ل.س`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" });
}

export default function ListingsPage() {
  const { user, isLoading: authLoading, hasPermission } = useAuth();
  const canCreate = hasPermission("properties.create");
  const router = useRouter();

  // ── Listings state (primary / critical) ───────────────────────────────────
  const [listings, setListings]           = useState<PropertyResponse[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState("");

  // ── Stats state (secondary / non-critical) ─────────────────────────────────
  const [stats, setStats]               = useState<{ used: number; limit: number; isFreeTrial?: boolean } | null>(null);
  const [statsError, setStatsError]     = useState("");

  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [successMsg, setSuccessMsg]     = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  // ── Load listings independently (listings failing ≠ stats failing) ─────────
  const load = useCallback(async () => {
    if (!user) return;

    // ── 1. PRIMARY: listings ─────────────────────────────────────────────────
    setListingsLoading(true);
    setListingsError("");
    try {
      const listRes = await api.get<{ items?: PropertyResponse[]; total?: number } | PropertyResponse[]>(
        "/properties/my-listings"
      );
      console.log("[listings] response:", listRes);
      const items = Array.isArray(listRes)
        ? listRes
        : (listRes as { items?: PropertyResponse[] })?.items ?? [];
      setListings(items);
    } catch (e) {
      console.warn("[listings] fetch error:", e);
      setListingsError(normalizeError(e));
    } finally {
      setListingsLoading(false);
    }

    // ── 2. SECONDARY: stats (failure never blocks the page) ──────────────────
    setStatsError("");
    try {
      const statsRes = await api.get<{ used: number; limit: number }>("/properties/my-listings/stats");
      console.log("[listings] stats:", statsRes);
      setStats(statsRes ?? null);
    } catch (e) {
      console.warn("[listings] stats endpoint failed:", e);
      setStatsError("تعذّر تحميل الإحصائيات");
      // Intentionally do NOT block page rendering
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

  const isUnlimited    = stats !== null && !stats.isFreeTrial && stats.limit >= 999;
  const limitReached   = stats !== null && !isUnlimited && stats.used >= stats.limit;
  const isFreeTrial    = stats?.isFreeTrial === true;
  const statsAvailable = stats !== null && !statsError;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "var(--color-text-primary)" }}>
                إعلاناتي
              </h1>
              {listings.length > 0 && (
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                  {listings.length} إعلان منشور
                </p>
              )}
            </div>
            {canCreate && !limitReached && (
              <Link
                href="/post-ad"
                style={{
                  padding: "0.55rem 1.3rem", borderRadius: 9,
                  background: "var(--color-primary)",
                  color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem",
                }}
              >
                + إضافة إعلان جديد
              </Link>
            )}
            {canCreate && limitReached && isFreeTrial && (
              <Link
                href="/pricing"
                style={{
                  padding: "0.55rem 1.3rem", borderRadius: 9,
                  background: "#0f172a",
                  color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem",
                }}
              >
                ترقية الحساب
              </Link>
            )}
          </div>
        </div>

        {/* ── Success ── */}
        {successMsg && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "0.85rem 1.1rem", marginBottom: "1.2rem", color: "#166534", fontWeight: 600, fontSize: "0.9rem" }}>
            ✓ {successMsg}
          </div>
        )}

        {/* ── Stats widget (secondary — gracefully degrades) ── */}
        {statsAvailable && !isUnlimited && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
            background: limitReached ? "#fff1f2" : isFreeTrial ? "#f0f9ff" : "#f8fafc",
            border: `1px solid ${limitReached ? "#fecaca" : isFreeTrial ? "#bae6fd" : "#e2e8f0"}`,
            borderRadius: 12, padding: "0.85rem 1.2rem", marginBottom: "1.5rem",
          }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: limitReached ? "#dc2626" : isFreeTrial ? "#0369a1" : "#374151" }}>
                {isFreeTrial
                  ? limitReached
                    ? "انتهت إعلاناتك التجريبية المجانية"
                    : `استخدمت ${stats!.used} من ${stats!.limit} إعلانات تجريبية مجانية`
                  : limitReached
                    ? "وصلت إلى الحد الأقصى هذا الشهر"
                    : `باقٍ لك ${stats!.limit - stats!.used} إعلان هذا الشهر`}
              </p>
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                {isFreeTrial
                  ? limitReached
                    ? "رُقّ حسابك لمواصلة النشر"
                    : "الإعلانات التجريبية صالحة للأبد · لا تنتهي شهرياً"
                  : `الاستخدام الشهري: ${stats!.used} / ${stats!.limit}${limitReached ? " · ترقية العضوية تمنحك حداً أعلى" : ""}`}
              </p>
            </div>
            <div style={{
              background: limitReached ? "#dc2626" : isFreeTrial ? "#0ea5e9" : "var(--color-primary)",
              color: "#fff", borderRadius: 99, padding: "0.3rem 0.9rem",
              fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap",
            }}>
              {stats!.used} / {stats!.limit}
            </div>
          </div>
        )}

        {/* ── Free-trial upgrade card (shown when trial limit is reached) ── */}
        {statsAvailable && isFreeTrial && limitReached && (
          <div style={{
            background: "#fff",
            border: "1.5px solid #fecaca",
            borderRadius: 14,
            padding: "1.75rem 1.5rem",
            marginBottom: "1.75rem",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "2.25rem", marginBottom: "0.6rem" }}>🔒</div>
            <h3 style={{ margin: "0 0 0.6rem", fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
              ترقية حسابك للمتابعة
            </h3>
            <p style={{ margin: "0 0 1.5rem", fontSize: "0.88rem", color: "#64748b", lineHeight: 1.7 }}>
              لقد استخدمت الإعلانات التجريبية المجانية. للمتابعة، يجب ترقية حسابك إلى <strong>مالك عقار</strong> أو <strong>وسيط عقاري</strong>.
            </p>
            <div style={{ display: "flex", gap: "0.65rem", justifyContent: "center", flexWrap: "wrap" }}>
              <a
                href="/pricing?upgrade=Owner"
                style={{
                  padding: "0.65rem 1.4rem", borderRadius: 9,
                  background: "var(--color-primary)", color: "#fff",
                  textDecoration: "none", fontWeight: 700, fontSize: "0.9rem",
                }}
              >
                ترقية إلى مالك عقار
              </a>
              <a
                href="/pricing?upgrade=Broker"
                style={{
                  padding: "0.65rem 1.4rem", borderRadius: 9,
                  background: "#0f172a", color: "#fff",
                  textDecoration: "none", fontWeight: 700, fontSize: "0.9rem",
                }}
              >
                ترقية إلى وسيط عقاري
              </a>
            </div>
          </div>
        )}

        {/* ── Subtle stats-error notice (non-blocking) ── */}
        {statsError && (
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 8, padding: "0.55rem 0.9rem", marginBottom: "1rem",
            fontSize: "0.78rem", color: "#92400e",
          }}>
            <span>ℹ️</span>
            <span>تعذّر تحميل الإحصائيات حاليًا</span>
          </div>
        )}

        {/* ── Listings: loading / error / empty / data ── */}
        {listingsLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "3rem 0" }}>
            <Spinner />
          </div>
        ) : listingsError ? (
          /* ── Listings failed: show error + retry ── */
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "3rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>⚠️</div>
            <p style={{ margin: "0 0 0.4rem", fontSize: "1rem", color: "#dc2626", fontWeight: 600 }}>
              تعذّر تحميل الإعلانات
            </p>
            <p style={{ margin: "0 0 1.5rem", fontSize: "0.83rem", color: "#94a3b8" }}>
              {listingsError}
            </p>
            <button
              onClick={load}
              style={{
                padding: "0.6rem 1.4rem", borderRadius: 9, cursor: "pointer",
                background: "var(--color-primary)", color: "#fff",
                border: "none", fontWeight: 700, fontSize: "0.9rem",
              }}
            >
              إعادة المحاولة
            </button>
          </div>
        ) : listings.length === 0 ? (
          /* ── True empty state: no error, no listings yet ── */
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "3.5rem 2rem", textAlign: "center" }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ opacity: 0.3, marginBottom: "0.85rem", color: "var(--color-text-secondary)" }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <p style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "#374151", fontWeight: 600 }}>لا توجد إعلانات بعد</p>
            {canCreate ? (
              <>
                <p style={{ margin: "0 0 1.5rem", fontSize: "0.85rem", color: "#94a3b8" }}>أضف إعلانك الأول الآن وابدأ في التواصل مع المشترين</p>
                <Link
                  href="/post-ad"
                  style={{ padding: "0.65rem 1.5rem", borderRadius: 9, background: "var(--color-primary)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}
                >
                  + إضافة إعلان جديد
                </Link>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
                لا توجد إعلانات مرتبطة بحسابك حالياً.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {listings.map((p) => {
              const status = STATUS_LABELS[p.status] ?? STATUS_LABELS.Available;
              return (
                <div
                  key={p.id}
                  style={{
                    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
                    padding: "1.1rem 1.3rem", display: "flex", gap: "1rem",
                    alignItems: "flex-start", flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.45rem" }}>
                      <span style={{ background: status.bg, color: status.color, borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: "0.72rem", fontWeight: 700 }}>
                        {status.label}
                      </span>
                      <span style={{ background: "#f0fdf4", color: "#16a34a", borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: "0.72rem", fontWeight: 700 }}>
                        {LISTING_TYPE_LABELS[p.listingType] ?? p.listingType}
                      </span>
                      <span style={{ background: "#f1f5f9", color: "#475569", borderRadius: 6, padding: "0.2rem 0.6rem", fontSize: "0.72rem", fontWeight: 600 }}>
                        {PROPERTY_TYPE_LABELS[p.type] ?? p.type}
                      </span>
                    </div>
                    <h3 style={{ margin: "0 0 0.3rem", fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                      {p.title}
                    </h3>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.82rem", color: "#64748b" }}>
                      <span>📍 {p.city}{p.neighborhood ? ` / ${p.neighborhood}` : ""}</span>
                      <span>💰 {formatPrice(p.price, p.currency)}</span>
                      {p.area > 0 && <span>📐 {p.area} م²</span>}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
