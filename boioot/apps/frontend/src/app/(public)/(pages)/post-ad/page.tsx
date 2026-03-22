"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { api, normalizeError } from "@/lib/api";
import PostAdWizard from "@/components/post-ad/PostAdWizard";
import type { CreatePropertyRequest, ListingTypeConfig, PropertyTypeConfig, OwnershipTypeConfig } from "@/types";
import Spinner from "@/components/ui/Spinner";

const ROLE_LABELS: Record<string, string> = {
  User:         "مستخدم عادي",
  Owner:        "مالك عقار",
  Broker:       "وسيط عقاري",
  CompanyOwner: "مالك شركة",
  Admin:        "مشرف",
};

type StatsResponse = { used: number; limit: number; isFreeTrial?: boolean };

export default function PostAdPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { openAuthModal } = useAuthGate();
  const router = useRouter();

  const [stats, setStats]               = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [listingTypes, setListingTypes]   = useState<ListingTypeConfig[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyTypeConfig[]>([]);
  const [ownershipTypes, setOwnershipTypes] = useState<OwnershipTypeConfig[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError]   = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      openAuthModal(() => router.push("/post-ad"));
      router.replace("/");
    }
  }, [user, authLoading, router, openAuthModal]);

  useEffect(() => {
    if (!user) return;

    api
      .get<{ used: number; limit: number }>("/properties/my-listings/stats")
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    api.get<ListingTypeConfig[]>("/listing-types").then(setListingTypes).catch(() => {});
    api.get<PropertyTypeConfig[]>("/property-types").then(setPropertyTypes).catch(() => {});
    api.get<OwnershipTypeConfig[]>("/ownership-types").then(setOwnershipTypes).catch(() => {});
  }, [user]);

  async function handleWizardSubmit(wizardData: {
    propertyType: string; listingType: string; ownershipType: string; floor: string;
    title: string; area: string; bedrooms: string; bathrooms: string;
    hallsCount: string; propertyAge: string; description: string;
    price: string; currency: "SYP" | "USD"; paymentType: "OneTime" | "Installments";
    installmentsCount: string; hasCommission: boolean; commissionType: "Percentage" | "Fixed";
    commissionValue: string; province: string; city: string; neighborhood: string;
    address: string; latitude: number | null; longitude: number | null;
    features: string[]; images: string[]; videoUrl: string;
  }) {
    setIsSubmitting(true);
    setServerError("");
    try {
      const payload: CreatePropertyRequest = {
        type:             wizardData.propertyType,
        listingType:      wizardData.listingType,
        ownershipType:    wizardData.ownershipType || undefined,
        floor:            wizardData.floor || undefined,
        title:            wizardData.title.trim(),
        area:             Number(wizardData.area),
        bedrooms:         wizardData.bedrooms         ? Number(wizardData.bedrooms)         : undefined,
        bathrooms:        wizardData.bathrooms        ? Number(wizardData.bathrooms)        : undefined,
        hallsCount:       wizardData.hallsCount       ? Number(wizardData.hallsCount)       : undefined,
        propertyAge:      wizardData.propertyAge      ? Number(wizardData.propertyAge)      : undefined,
        description:      wizardData.description.trim() || undefined,
        price:            Number(wizardData.price),
        currency:         wizardData.currency,
        paymentType:      wizardData.paymentType,
        installmentsCount: wizardData.paymentType === "Installments" && wizardData.installmentsCount
                              ? Number(wizardData.installmentsCount) : undefined,
        hasCommission:    wizardData.hasCommission,
        commissionType:   wizardData.hasCommission ? wizardData.commissionType : undefined,
        commissionValue:  wizardData.hasCommission && wizardData.commissionValue
                              ? Number(wizardData.commissionValue) : undefined,
        province:         wizardData.province    || undefined,
        city:             wizardData.city,
        neighborhood:     wizardData.neighborhood || undefined,
        address:          wizardData.address      || undefined,
        latitude:         wizardData.latitude     ?? undefined,
        longitude:        wizardData.longitude    ?? undefined,
        features:         wizardData.features.length > 0 ? wizardData.features : undefined,
        images:           wizardData.images.length > 0 ? wizardData.images : undefined,
        videoUrl:         wizardData.videoUrl.trim() || undefined,
      };

      await api.post("/properties/post", payload);
      router.push("/dashboard/listings?success=1");
    } catch (e) {
      setServerError(normalizeError(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || (!user && !authLoading)) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  const isFreeTrial  = stats?.isFreeTrial === true;
  const limitReached = stats !== null && stats.used >= stats.limit;
  const isLastTrial  = isFreeTrial && stats !== null && stats.used === stats.limit - 1;

  return (
    <div style={{ backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <Link
            href="/dashboard/listings"
            style={{ fontSize: "0.85rem", color: "var(--color-primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.75rem" }}
          >
            ← إعلاناتي
          </Link>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.4rem", color: "var(--color-text-primary)" }}>
            أضف إعلانك العقاري
          </h1>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#64748b" }}>
            انشر إعلانك مجاناً وتواصل مع المهتمين مباشرة
          </p>
        </div>

        {/* ── Quota banner ── */}
        {!statsLoading && stats !== null && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: limitReached
              ? "#fff1f2"
              : isLastTrial
                ? "#fffbeb"
                : isFreeTrial
                  ? "#f0f9ff"
                  : "#f0fdf4",
            border: `1px solid ${
              limitReached ? "#fecaca" : isLastTrial ? "#fde68a" : isFreeTrial ? "#bae6fd" : "#bbf7d0"
            }`,
            borderRadius: 12, padding: "0.9rem 1.2rem", marginBottom: "1.5rem",
            gap: "1rem",
          }}>
            <div>
              <p style={{
                margin: "0 0 0.2rem", fontWeight: 700, fontSize: "0.92rem",
                color: limitReached ? "#dc2626" : isLastTrial ? "#92400e" : isFreeTrial ? "#0369a1" : "#166534",
              }}>
                {isFreeTrial
                  ? limitReached
                    ? "انتهت إعلاناتك التجريبية المجانية"
                    : isLastTrial
                      ? "هذا آخر إعلان تجريبي مجاني لك"
                      : `استخدمت ${stats.used} من ${stats.limit} إعلانات تجريبية مجانية`
                  : limitReached
                    ? "وصلت إلى الحد الأقصى من الإعلانات هذا الشهر"
                    : `متبقٍّ لك ${stats.limit - stats.used} إعلان هذا الشهر`}
              </p>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b7280" }}>
                {isFreeTrial
                  ? "الإعلانات التجريبية صالحة للأبد · لا تنتهي شهرياً"
                  : <>
                    استخدمت {stats.used} من أصل {stats.limit} إعلان شهرياً
                    {" · "}عضويتك الحالية: <strong>{ROLE_LABELS[user?.role ?? ""] ?? user?.role}</strong>
                  </>}
              </p>
            </div>
            <div style={{
              background: limitReached ? "#dc2626" : isLastTrial ? "#f59e0b" : isFreeTrial ? "#0ea5e9" : "#16a34a",
              color: "#fff", borderRadius: 99, padding: "0.3rem 0.85rem",
              fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap",
            }}>
              {stats.used} / {stats.limit}
            </div>
          </div>
        )}

        {/* ── Limit reached — upgrade prompt ── */}
        {limitReached ? (
          <div style={{
            background: "#fff",
            border: "1.5px solid #fecaca",
            borderRadius: 14,
            padding: "2.5rem 2rem",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🔒</div>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
              {isFreeTrial ? "انتهت إعلاناتك التجريبية المجانية" : "الحد الشهري مكتمل"}
            </h2>
            <p style={{ margin: "0 0 1.5rem", color: "#64748b", lineHeight: 1.7 }}>
              {isFreeTrial
                ? <>
                    لقد استخدمت {stats!.used} من {stats!.limit} إعلانات تجريبية مجانية.
                    اختر نوع الحساب الذي يناسبك للمتابعة ونشر المزيد.
                  </>
                : <>
                    لقد استخدمت إعلاناتك الشهرية كاملةً. قم بترقية عضويتك للمتابعة.
                  </>}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", maxWidth: 480, margin: "0 auto 1rem" }}>
              <Link
                href="/pricing?upgrade=Owner"
                style={{ padding: "0.75rem 1rem", borderRadius: 10, background: "var(--color-primary)", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "0.85rem", textAlign: "center" }}
              >
                🏠 مالك عقار
              </Link>
              <Link
                href="/pricing?upgrade=Broker"
                style={{ padding: "0.75rem 1rem", borderRadius: 10, background: "#1e293b", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "0.85rem", textAlign: "center" }}
              >
                🤝 وسيط / سمسار
              </Link>
              <Link
                href="/pricing?upgrade=RealEstateOffice"
                style={{ padding: "0.75rem 1rem", borderRadius: 10, background: "#0369a1", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "0.85rem", textAlign: "center" }}
              >
                🏢 مكتب عقاري
              </Link>
              <Link
                href="/pricing?upgrade=DeveloperCompany"
                style={{ padding: "0.75rem 1rem", borderRadius: 10, background: "#7c3aed", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "0.85rem", textAlign: "center" }}
              >
                🏗️ شركة تطوير
              </Link>
            </div>
            <Link
              href="/dashboard/listings"
              style={{ display: "inline-block", padding: "0.55rem 1.25rem", borderRadius: 9, border: "1.5px solid #e2e8f0", color: "#374151", textDecoration: "none", fontWeight: 600, fontSize: "0.85rem" }}
            >
              إعلاناتي الحالية
            </Link>
          </div>
        ) : (
          <div className="form-card">
            <PostAdWizard
              listingTypes={listingTypes}
              propertyTypes={propertyTypes}
              ownershipTypes={ownershipTypes}
              onSubmit={handleWizardSubmit}
              isSubmitting={isSubmitting}
              serverError={serverError}
            />
          </div>
        )}
      </div>
    </div>
  );
}
