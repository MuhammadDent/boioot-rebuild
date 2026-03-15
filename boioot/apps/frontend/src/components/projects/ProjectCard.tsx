import Link from "next/link";
import type { ProjectResponse } from "@/types";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_BADGE,
  formatStartingPrice,
} from "@/features/projects/constants";

interface ProjectCardProps {
  project: ProjectResponse;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const mainImage =
    project.images.find((img) => img.isPrimary) ?? project.images[0];

  const statusLabel = PROJECT_STATUS_LABELS[project.status] ?? project.status;
  const statusBadge = PROJECT_STATUS_BADGE[project.status] ?? "badge-gray";

  return (
    <Link href={`/projects/${project.id}`} style={{ textDecoration: "none" }}>
      <article className="card project-card">
        {mainImage ? (
          // eslint-disable-next-line @next/next/no-img-element
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

          <p className="project-card__price">
            {formatStartingPrice(project.startingPrice)}
          </p>

          <p className="project-card__city">📍 {project.city}</p>

          <span className={`badge ${statusBadge}`}>{statusLabel}</span>

          <p className="project-card__company">{project.companyName}</p>
        </div>
      </article>
    </Link>
  );
}
