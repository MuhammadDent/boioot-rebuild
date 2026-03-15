"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { dashboardPropertiesApi } from "@/features/dashboard/properties/api";
import PropertyForm from "@/components/dashboard/properties/PropertyForm";
import { normalizeError } from "@/lib/api";
import type { CreatePropertyRequest, UpdatePropertyRequest } from "@/types";

export default function NewPropertyPage() {
  const { user, isLoading } = useProtectedRoute({
    allowedRoles: ["Admin", "CompanyOwner"],
  });

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  async function handleSubmit(data: CreatePropertyRequest | UpdatePropertyRequest) {
    setIsSubmitting(true);
    setServerError("");
    try {
      await dashboardPropertiesApi.create(data as CreatePropertyRequest);
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
            إضافة عقار جديد
          </h1>
        </div>

        {/* ── Form ── */}
        <div className="form-card">
          <PropertyForm
            mode="create"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            serverError={serverError}
          />
        </div>
      </div>
    </div>
  );
}
