import Link from "next/link";
import type { ProjectResponse } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  UnderConstruction: "قيد الإنشاء",
  Completed: "مكتمل",
  Planning: "تخطيط",
  OnHold: "متوقف",
};

const STATUS_BADGE: Record<string, string> = {
  UnderConstruction: "badge-yellow",
  Completed: "badge-green",
  Planning: "badge-blue",
  OnHold: "badge-gray",
};

function formatPrice(price: number): string {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)} م`;
  if (price >= 1_000) return `${Math.round(price / 1_000)} ألف`;
  return price.toLocaleString("ar-SY");
}

export default function ProjectCard({ project }: { project: ProjectResponse }) {
  const mainImage = project.images.find((i) => i.isPrimary) ?? project.images[0];
  const statusBadge = STATUS_BADGE[project.status] ?? "badge-gray";

  return (
    <Link href={`/projects/${project.id}`} className="card project-card" style={{ textDecoration: "none" }}>
      {mainImage ? (
        <img
          src={mainImage.imageUrl}
          alt={project.title}
          className="project-card__img"
        />
      ) : (
        <div className="project-card__img-placeholder">🏗️</div>
      )}

      <div className="project-card__body">
        <h3 className="project-card__title">{project.title}</h3>

        {project.startingPrice != null && (
          <p className="project-card__price">
            يبدأ من {formatPrice(project.startingPrice)} ل.س
          </p>
        )}

        <p className="project-card__city">📍 {project.city}</p>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
          <span className={`badge ${statusBadge}`}>
            {STATUS_LABEL[project.status] ?? project.status}
          </span>
        </div>

        <p className="project-card__company">
          🏢 {project.companyName}
        </p>
      </div>
    </Link>
  );
}
