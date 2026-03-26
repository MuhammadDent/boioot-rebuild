"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { canAccessProjects } from "@/components/dashboard/DashboardSidebar";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { dashboardProjectsApi } from "@/features/dashboard/projects/api";
import ProjectForm from "@/components/dashboard/projects/ProjectForm";
import { normalizeError } from "@/lib/api";
import type {
  ProjectResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@/types";

export default function EditProjectPage() {
  const { user, isLoading } = useProtectedRoute({
    allowedRoles: ["Admin", "CompanyOwner"],
  });

  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoadingProject, setIsLoadingProject] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // ── Access guard ── Office accounts must not reach this page.
  useEffect(() => {
    if (!isLoading && user && user.role === "CompanyOwner" && !canAccessProjects(user.accountType)) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (isLoading || !user || !id) return;

    async function loadProject() {
      setIsLoadingProject(true);
      setLoadError("");
      try {
        const data = await dashboardProjectsApi.getById(id);
        setProject(data);
      } catch (e) {
        setLoadError(normalizeError(e));
      } finally {
        setIsLoadingProject(false);
      }
    }

    loadProject();
  }, [isLoading, user, id]);

  async function handleSubmit(
    data: CreateProjectRequest | UpdateProjectRequest
  ) {
    setIsSubmitting(true);
    setServerError("");
    try {
      await dashboardProjectsApi.update(id, data as UpdateProjectRequest);
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
            تعديل المشروع
          </h1>
        </div>

        {/* ── Loading project ── */}
        {isLoadingProject && <LoadingRow message="جارٍ تحميل بيانات المشروع..." />}

        {/* ── Load error ── */}
        <InlineBanner message={loadError} />

        {/* ── Form (shown after project loaded) ── */}
        {!isLoadingProject && project && (
          <div className="form-card">
            <ProjectForm
              mode="edit"
              initialData={project}
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
