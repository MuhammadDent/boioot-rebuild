"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { api, normalizeError } from "@/lib/api";
import { useOwnershipTypes } from "@/features/properties/ownershipTypes";
import { tokenStorage } from "@/lib/token";
import { imagesService } from "@/services/images.service";
import PostAdWizard from "@/components/post-ad/PostAdWizard";
import type { CreatePropertyRequest, PropertyResponse, ListingTypeConfig, PropertyTypeConfig } from "@/types";
import Spinner from "@/components/ui/Spinner";

const ROLE_LABELS: Record<string, string> = {
  User:         "مستخدم عادي",
  Owner:        "مالك عقار",
  Broker:       "وسيط عقاري",
  CompanyOwner: "مالك شركة",
  Admin:        "مشرف",
};

// ── All upgrade paths (shown when limit is reached) ────────────────────────
// Each entry declares which user roles should see it.
// null = show to all roles (Admin, unknown).
const ALL_UPGRADE_PATHS = [
  {
    label: "🏠 مالك عقار",
    href: "/pricing?upgrade=Owner",
    bg: "var(--color-primary)",
    roles: ["User", "Owner"],          // Owner can upgrade to a higher Owner plan
  },
  {
    label: "🤝 وسيط / سمسار",
    href: "/pricing?upgrade=Broker",
    bg: "#1e293b",
    roles: ["User", "Broker"],
  },
  {
    label: "🏢 مكتب عقاري",
    href: "/pricing?upgrade=RealEstateOffice",
    bg: "#0369a1",
    roles: ["User", "CompanyOwner", "Agent"],
  },
  {
    label: "🏗️ شركة تطوير",
    href: "/pricing?upgrade=DeveloperCompany",
    bg: "#7c3aed",
    roles: ["User", "CompanyOwner"],
  },
] as const;

/**
 * Returns the upgrade paths relevant for the given user role.
 * - User role  → all paths (they're choosing which account type to become)
 * - Admin      → all paths
 * - Any other  → only the paths that include that role
 */
function getUpgradePathsForRole(role: string | null | undefined) {
  if (!role || role === "Admin") return ALL_UPGRADE_PATHS;
  if (role === "User") return ALL_UPGRADE_PATHS;
  return ALL_UPGRADE_PATHS.filter(p => p.roles.includes(role as never));
}

type StatsResponse = { used: number; limit: number; isFreeTrial?: boolean };

export default function PostAdPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { openAuthModal } = useAuthGate();
  const router = useRouter();

  const [stats, setStats]               = useState<StatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [listingTypes, setListingTypes]     = useState<ListingTypeConfig[]>([]);
  const [propertyTypes, setPropertyTypes]   = useState<PropertyTypeConfig[]>([]);
  // Shared ownership-types source (same hook as the dashboard edit form and details page)
  const { options: ownershipTypes } = useOwnershipTypes();
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
      .get<{ used: number; limit: number; isFreeTrial?: boolean }>("/properties/my-listings/stats")
      .then((data) => {
        setStats(data);
        console.log("════════ [PostAdPage] Quota Debug (source: /properties/my-listings/stats) ════════");
        console.log("  used        :", data.used);
        console.log("  limit       :", data.limit, data.limit === -1 ? "(unlimited)" : "");
        console.log("  remaining   :", data.limit === -1 ? "unlimited" : Math.max(0, data.limit - data.used));
        console.log("  isFreeTrial :", data.isFreeTrial);
        console.log("═══════════════════════════════════════════════════════════════════════════════════");
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    api.get<ListingTypeConfig[]>("/listing-types").then(setListingTypes).catch(() => {});
    api.get<PropertyTypeConfig[]>("/property-types").then(setPropertyTypes).catch(() => {});
  }, [user]);

  async function handleWizardSubmit(wizardData: {
    propertyType: string; listingType: string; ownershipType: string; floor: string;
    title: string; area: string; bedrooms: string; bathrooms: string;
    hallsCount: string; propertyAge: string; description: string;
    price: string; currency: "SYP" | "USD"; paymentType: "OneTime" | "Installments";
    installmentsCount: string; hasCommission: boolean; commissionType: "Percentage" | "Fixed";
    commissionValue: string; province: string; city: string; neighborhood: string;
    address: string; latitude: number | null; longitude: number | null;
    features: string[];
    uploadedImages: { imageId: string; url: string }[];
    videoUrl: string;
  }) {
    setIsSubmitting(true);
    setServerError("");
    try {
      // ── Step 1: create the property (without images — handled separately) ──
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
        // images NOT included here — attached via finalizeCreate after creation
        videoUrl:         wizardData.videoUrl.trim() || undefined,
      };

      // ─── Payload diagnostics ──────────────────────────────────────────────
      console.log("════════════════════════════════════════════════════════");
      console.log("[PostAdPage] ▶ Sending POST /properties/post");
      console.log("[PostAdPage] Payload summary:");
      console.log("  type        :", payload.type);
      console.log("  listingType :", payload.listingType);
      console.log("  title       :", JSON.stringify(payload.title));
      console.log("  description :", JSON.stringify(payload.description));
      console.log("  price       :", payload.price, " currency:", payload.currency);
      console.log("  area        :", payload.area);
      console.log("  bedrooms    :", payload.bedrooms);
      console.log("  bathrooms   :", payload.bathrooms);
      console.log("  city        :", JSON.stringify(payload.city));
      console.log("  province    :", JSON.stringify(payload.province));
      console.log("  latitude    :", payload.latitude, " longitude:", payload.longitude);
      console.log("  uploadedImages:", wizardData.uploadedImages.length, "images (will attach after create)");
      wizardData.uploadedImages.forEach((img, i) => {
        console.log(`  image[${i}]   : imageId=${img.imageId} url=${img.url}`);
      });
      console.log("  videoUrl    :", JSON.stringify(payload.videoUrl));
      console.log("  features    :", payload.features);
      console.log("  hasCommission:", payload.hasCommission);
      console.log("  paymentType  :", payload.paymentType);
      console.log("════════════════════════════════════════════════════════");

      const property = await api.post<PropertyResponse>("/properties/post", payload);
      console.log("[PostAdPage] ✓ Property created — id:", property.id);

      // ── Step 2: attach uploaded images (all already in R2 as UserImages) ─
      // Filter out any entries still uploading (imageId === "") before submitting
      const readyImages = wizardData.uploadedImages.filter((img) => img.imageId !== "");
      if (readyImages.length > 0) {
        const token = tokenStorage.getToken() ?? "";
        // coverImageIndex may point to a slot; find the nearest valid index
        const coverIdx = Math.min(wizardData.coverImageIndex, readyImages.length - 1);
        const uploads = readyImages.map((img, i) => ({
          imageId:   img.imageId,
          isCover:   i === coverIdx,
          sortOrder: i,
        }));
        console.log("[PostAdPage] Attaching", uploads.length, "images via finalizeCreate…");
        try {
          await imagesService.finalizeCreate(property.id, "property", uploads, token);
          console.log("[PostAdPage] ✓ Images attached successfully");
        } catch (imgErr) {
          // Property was created — don't block the redirect, just log the image error
          console.error("[PostAdPage] ✗ Image attachment failed (property still created):", imgErr);
        }
      }

      router.push("/dashboard/listings?success=1");
    } catch (e) {
      console.error("[PostAdPage] ✗ API call FAILED. Raw error object:", e);
      console.error("[PostAdPage] normalizeError result:", normalizeError(e));
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
            {(() => {
              const upgradePaths = getUpgradePathsForRole(user?.role);
              console.log("[UpgradePlans] currentUserRole :", user?.role);
              console.log("[UpgradePlans] allPaths        :", ALL_UPGRADE_PATHS.map(p => p.label).join(", "));
              console.log("[UpgradePlans] filteredPaths   :", upgradePaths.map(p => p.label).join(", "));
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem", maxWidth: 480, margin: "0 auto 1rem" }}>
                  {upgradePaths.map(path => (
                    <Link
                      key={path.href}
                      href={path.href}
                      style={{ padding: "0.75rem 1rem", borderRadius: 10, background: path.bg, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: "0.85rem", textAlign: "center" }}
                    >
                      {path.label}
                    </Link>
                  ))}
                </div>
              );
            })()}
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
