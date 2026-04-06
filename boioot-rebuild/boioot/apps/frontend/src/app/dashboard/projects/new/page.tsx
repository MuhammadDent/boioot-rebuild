"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { canAccessProjects } from "@/features/sidebar/sidebar.config";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { dashboardProjectsApi } from "@/features/dashboard/projects/api";
import ProjectForm from "@/components/dashboard/projects/ProjectForm";
import { normalizeError } from "@/lib/api";
import type { CreateProjectRequest, UpdateProjectRequest } from "@/types";

export default function NewProjectPage() {
  const { user, isLoading } = useProtectedRoute({
    allowedRoles: ["Admin", "CompanyOwner"],
  });

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // ── Access guard ── Office accounts must not reach this page.
  useEffect(() => {
    if (!isLoading && user && user.role === "CompanyOwner" && !canAccessProjects(user.accountType)) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  async function handleSubmit(
    data: CreateProjectRequest | UpdateProjectRequest
  ) {
    setIsSubmitting(true);
    setServerError("");
    try {
      await dashboardProjectsApi.create(data as CreateProjectRequest);
      router.push("/dashboard/projects");
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
          <DashboardBackLink href="/dashboard/projects" label="← المشاريع" />
          <h1
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              margin: 0,
              color: "var(--color-text-primary)",
            }}
          >
            إضافة مشروع جديد
          </h1>
        </div>

        {/* ── Form ── */}
        <div className="form-card">
          <ProjectForm
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
