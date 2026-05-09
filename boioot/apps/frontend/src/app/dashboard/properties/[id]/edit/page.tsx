"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { dashboardPropertiesApi } from "@/features/dashboard/properties/api";
import PropertyForm from "@/components/dashboard/properties/PropertyForm";
import { ApiError, normalizeError } from "@/lib/api";
import type { PropertyResponse, CreatePropertyRequest, UpdatePropertyRequest } from "@/types";

// "User" is included because users with that role can post via /post-ad
// and must be able to edit their own listings. Backend authorization is
// enforced at the service level via EnsureCanManagePropertyAsync (OwnerId check).
const OWNER_ROLES = ["Admin", "CompanyOwner", "Agent", "Broker", "Owner", "User"];

export default function EditPropertyPage() {
  const { user, isLoading } = useProtectedRoute({
    allowedRoles: OWNER_ROLES,
  });

  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [property, setProperty] = useState<PropertyResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const listingsHref =
    user?.role === "Owner" ? "/dashboard/my-listings" : "/dashboard/listings";

  useEffect(() => {
    if (isLoading || !user || !id) return;

    async function loadProperty() {
      setIsLoadingProperty(true);
      setLoadError("");
      try {
        const data = await dashboardPropertiesApi.getById(id);
        setProperty(data);
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) {
          toast.error("لا تملك صلاحية تعديل هذا الإعلان");
          router.replace(listingsHref);
          return;
        }
        const msg = normalizeError(e);
        console.error("[EditPropertyPage] load failed:", msg, e);
        setLoadError(msg);
      } finally {
        setIsLoadingProperty(false);
      }
    }

    loadProperty();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, id]);

  async function handleSubmit(data: CreatePropertyRequest | UpdatePropertyRequest, _pendingUploads?: unknown) {
    setIsSubmitting(true);
    setServerError("");
    try {
      await dashboardPropertiesApi.update(id, data as UpdatePropertyRequest);
      toast.success("تم حفظ الإعلان بنجاح");
      router.push(`${listingsHref}?success=1`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        toast.error("لا تملك صلاحية تعديل هذا الإعلان");
        return;
      }
      setServerError(normalizeError(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || !user) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink href={listingsHref} label="← إعلاناتي" />
          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              margin: 0,
              color: "var(--color-text-primary)",
            }}
          >
            تعديل الإعلان
          </h1>
        </div>

        {/* ── Loading property ── */}
        {isLoadingProperty && <LoadingRow message="جارٍ تحميل بيانات العقار..." />}

        {/* ── Load error ── */}
        <InlineBanner message={loadError} />

        {/* ── Form (shown after property loaded) ── */}
        {!isLoadingProperty && property && (
          <div className="form-card">
            <PropertyForm
              mode="edit"
              initialData={property}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              serverError={serverError}
            />
          </div>
        )}
      </div>
    </div>
  );
}
