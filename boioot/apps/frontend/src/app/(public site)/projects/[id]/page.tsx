"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { projectsService } from "@/services/projects.service";
import Spinner from "@/components/ui/Spinner";
import type { ProjectResponse } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  UnderConstruction: "قيد الإنشاء", Completed: "مكتمل",
  Planning: "تخطيط", OnHold: "متوقف",
};

function formatPrice(price: number): string {
  return price.toLocaleString("ar-SY") + " ل.س";
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    projectsService
      .getPublicById(id)
      .then(setProject)
      .catch(() => setError("تعذّر تحميل بيانات المشروع."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;

  if (error || !project) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <div className="error-banner">{error || "المشروع غير موجود."}</div>
        <Link href="/projects" className="btn btn-outline btn-sm" style={{ marginTop: "1rem" }}>
          العودة للقائمة
        </Link>
      </div>
    );
  }

  const mainImage = project.images.find((i) => i.isPrimary) ?? project.images[0];

  return (
    <div style={{ padding: "2rem 1.5rem" }}>
      <div className="container">
        <Link href="/projects" className="btn btn-ghost btn-sm" style={{ marginBottom: "1.5rem", display: "inline-flex" }}>
          ← العودة للمشاريع
        </Link>

        {mainImage ? (
          <img src={mainImage.imageUrl} alt={project.title} className="detail-hero" />
        ) : (
          <div className="detail-hero-placeholder">🏗️</div>
        )}

        <div className="detail-grid">
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: "0.75rem" }}>
              {project.title}
            </h1>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <span className="badge badge-yellow">{STATUS_LABEL[project.status] ?? project.status}</span>
            </div>

            {project.description && (
              <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.8, marginBottom: "1.5rem" }}>
                {project.description}
              </p>
            )}

            {project.images.length > 1 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {project.images.map((img) => (
                  <img
                    key={img.id}
                    src={img.imageUrl}
                    alt=""
                    style={{ width: 100, height: 70, objectFit: "cover", borderRadius: "var(--radius-md)" }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="detail-info-card">
            {project.startingPrice != null && (
              <div style={{ textAlign: "center", padding: "0.75rem 0" }}>
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>يبدأ من</p>
                <p style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-primary)" }}>
                  {formatPrice(project.startingPrice)}
                </p>
              </div>
            )}

            {(
              [
                ["المدينة", project.city],
                ...(project.address ? [["العنوان", project.address]] : []),
                ...(project.deliveryDate ? [["تاريخ التسليم", new Date(project.deliveryDate).toLocaleDateString("ar-SY")]] : []),
                ["الشركة", project.companyName],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label} className="detail-info-row">
                <span className="detail-info-label">{label}</span>
                <span className="detail-info-value">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
