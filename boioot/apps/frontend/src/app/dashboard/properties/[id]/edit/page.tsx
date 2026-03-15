"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { dashboardPropertiesApi } from "@/features/dashboard/properties/api";
import { propertiesApi } from "@/features/properties/api";
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

    async function fetch() {
      setIsLoadingProperty(true);
      setLoadError("");
      try {
        const data = await propertiesApi.getById(id);
        setProperty(data);
      } catch (e) {
        setLoadError(normalizeError(e));
      } finally {
        setIsLoadingProperty(false);
      }
    }

    fetch();
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
          <Link
            href="/dashboard/properties"
            style={{
              fontSize: "0.82rem",
              color: "var(--color-text-secondary)",
              marginBottom: "0.35rem",
              display: "block",
            }}
          >
            ← العقارات
          </Link>
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
        {isLoadingProperty && (
          <p
            style={{
              textAlign: "center",
              color: "var(--color-text-secondary)",
              padding: "3rem 0",
            }}
          >
            جارٍ تحميل بيانات العقار...
          </p>
        )}

        {/* ── Load error ── */}
        {loadError && (
          <div
            style={{
              background: "#ffebee",
              color: "#c62828",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1rem",
            }}
          >
            {loadError}
          </div>
        )}

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
