"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { dashboardPropertiesApi } from "@/features/dashboard/properties/api";
import PropertyForm from "@/components/dashboard/properties/PropertyForm";
import { normalizeError } from "@/lib/api";
import type { PropertyResponse, CreatePropertyRequest, UpdatePropertyRequest } from "@/types";

export default function EditPropertyPage() {
  const { user, isLoading } = useProtectedRoute({
    allowedRoles: ["Admin", "CompanyOwner", "Agent"],
  });

  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [property, setProperty] = useState<PropertyResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (isLoading || !user || !id) return;

    async function loadProperty() {
      setIsLoadingProperty(true);
      setLoadError("");
      try {
        const data = await dashboardPropertiesApi.getById(id);
        setProperty(data);
      } catch (e) {
        setLoadError(normalizeError(e));
      } finally {
        setIsLoadingProperty(false);
      }
    }

    loadProperty();
  }, [isLoading, user, id]);

  async function handleSubmit(data: CreatePropertyRequest | UpdatePropertyRequest) {
    setIsSubmitting(true);
    setServerError("");
    try {
      await dashboardPropertiesApi.update(id, data as UpdatePropertyRequest);
      router.push("/dashboard/properties");
    } catch (e) {
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
          <DashboardBackLink href="/dashboard/properties" label="← العقارات" />
          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              margin: 0,
              color: "var(--color-text-primary)",
            }}
          >
            تعديل العقار
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
