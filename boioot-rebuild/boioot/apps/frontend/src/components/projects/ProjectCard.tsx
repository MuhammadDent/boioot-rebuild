import Link from "next/link";
import { memo } from "react";
import type { ProjectResponse } from "@/types";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_BADGE,
  formatStartingPrice,
} from "@/features/projects/constants";

interface ProjectCardProps {
  project: ProjectResponse;
}

function ProjectCardInner({ project }: ProjectCardProps) {
  const mainImage =
    project.images.find((img) => img.isPrimary) ?? project.images[0];

  const statusLabel = PROJECT_STATUS_LABELS[project.status] ?? project.status;
  const statusBadge = PROJECT_STATUS_BADGE[project.status] ?? "badge-gray";

  return (
    <Link href={`/projects/${project.id}`} style={{ textDecoration: "none", display: "block" }}>
      <article className="card project-card">
        {mainImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainImage.imageUrl}
            alt={project.title}
            className="project-card__img"
            loading="lazy"
            decoding="async"
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

          <div className="project-card__tags">
            <span className={`badge ${statusBadge}`}>{statusLabel}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default memo(ProjectCardInner);
