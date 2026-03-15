"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";
import { projectsApi } from "@/features/projects/api";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_BADGE,
  formatStartingPrice,
  formatDeliveryDate,
} from "@/features/projects/constants";
import type { ProjectResponse } from "@/types";

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [project, setProject]               = useState<ProjectResponse | null>(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    setSelectedImageIdx(0);

    projectsApi
      .getById(id)
      .then(setProject)
      .catch(() => setError("تعذّر تحميل بيانات المشروع. ربما لم يعد متاحاً."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-background)", padding: "2rem 0" }}>
        <div className="container" style={{ paddingTop: "3rem" }}>
          <div className="error-banner">{error}</div>
          <Link
            href="/projects"
            className="btn btn-outline"
            style={{ marginTop: "1rem", display: "inline-block" }}
          >
            ← العودة إلى المشاريع
          </Link>
        </div>
      </div>
    );
  }

  if (!project) return null;

  const images       = project.images;
  const activeImage  = images[selectedImageIdx] ?? images[0];
  const statusLabel  = PROJECT_STATUS_LABELS[project.status] ?? project.status;
  const statusBadge  = PROJECT_STATUS_BADGE[project.status]  ?? "badge-gray";

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)", padding: "2rem 0" }}>
      <div className="container">

        {/* Back link */}
        <Link
          href="/projects"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--color-text-secondary)",
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
            textDecoration: "none",
          }}
        >
          ← العودة إلى المشاريع
        </Link>

        {/* Main image */}
        {activeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeImage.imageUrl}
            alt={project.title}
            className="detail-hero"
          />
        ) : (
          <div className="detail-hero-placeholder">🏗️</div>
        )}

        {/* Image gallery thumbnails — only when there are multiple images */}
        {images.length > 1 && (
          <div className="gallery-thumbs">
            {images.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.imageUrl}
                alt={`صورة ${i + 1}`}
                className={`gallery-thumb${i === selectedImageIdx ? " gallery-thumb--active" : ""}`}
                onClick={() => setSelectedImageIdx(i)}
              />
            ))}
          </div>
        )}

        {/* Content grid */}
        <div className="detail-grid">

          {/* Left column — title, price, description */}
          <div>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              flexWrap: "wrap", marginBottom: "1rem",
            }}>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0 }}>
                {project.title}
              </h1>
              <span className={`badge ${statusBadge}`}>{statusLabel}</span>
            </div>

            <p style={{
              fontSize: "1.4rem", fontWeight: 700,
              color: "var(--color-primary)", marginBottom: "1rem",
            }}>
              {formatStartingPrice(project.startingPrice)}
            </p>

            <p style={{
              color: "var(--color-text-secondary)", marginBottom: "1.5rem",
              display: "flex", alignItems: "center", gap: "0.3rem",
            }}>
              📍 {project.city}
              {project.address && ` — ${project.address}`}
            </p>

            {project.description && (
              <div style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-lg)",
                padding: "1.5rem",
                marginBottom: "1.5rem",
              }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>
                  عن المشروع
                </h2>
                <p style={{
                  color: "var(--color-text-secondary)",
                  lineHeight: 1.8, margin: 0,
                }}>
                  {project.description}
                </p>
              </div>
            )}
          </div>

          {/* Right column — project details card */}
          <div className="detail-info-card">
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>تفاصيل المشروع</h2>

            <DetailRow label="الحالة"         value={statusLabel} />
            <DetailRow label="المدينة"         value={project.city} />
            <DetailRow
              label="موعد التسليم"
              value={formatDeliveryDate(project.deliveryDate)}
            />
            <DetailRow label="الشركة"          value={project.companyName} />
          </div>

        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-info-row">
      <span className="detail-info-label">{label}</span>
      <span className="detail-info-value">{value}</span>
    </div>
  );
}
