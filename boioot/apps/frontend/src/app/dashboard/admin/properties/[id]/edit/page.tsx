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

export default function AdminEditPropertyPage() {
  const { isLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });

  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [property, setProperty]             = useState<PropertyResponse | null>(null);
  const [loadError, setLoadError]           = useState("");
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);

  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [serverError, setServerError]       = useState("");

  useEffect(() => {
    if (isLoading || !id) return;

    async function load() {
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

    load();
  }, [isLoading, id]);

  async function handleSubmit(data: CreatePropertyRequest | UpdatePropertyRequest) {
    setIsSubmitting(true);
    setServerError("");
    try {
      await dashboardPropertiesApi.update(id, data as UpdatePropertyRequest);
      router.push("/dashboard/admin/properties");
    } catch (e) {
      setServerError(normalizeError(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-bg, #f8fafc)",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto" }}>

        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink
            href="/dashboard/admin/properties"
            label="← العودة إلى إدارة العقارات"
          />
          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              margin: "0.5rem 0 0",
              color: "#0f172a",
            }}
          >
            تعديل العقار
          </h1>
          {property && (
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
              {property.title}
            </p>
          )}
        </div>

        {isLoadingProperty && (
          <LoadingRow message="جارٍ تحميل بيانات العقار..." />
        )}

        <InlineBanner message={loadError} />

        {!isLoadingProperty && property && (
          <div className="form-card">
            <PropertyForm
              mode="edit"
              initialData={property}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              serverError={serverError}
              submitLabel="حفظ التعديلات"
            />
          </div>
        )}
      </div>
    </div>
  );
}
