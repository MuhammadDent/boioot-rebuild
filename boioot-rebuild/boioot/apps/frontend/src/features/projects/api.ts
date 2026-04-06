import { api } from "@/lib/api";
import { buildQueryString } from "@/lib/query-string";
import type { PagedResult, ProjectResponse } from "@/types";

/** Default page size — matches ProjectFilters.cs default. */
export const PROJECTS_PAGE_SIZE = 12;

/**
 * Query parameters supported by GET /api/projects.
 * Matches ProjectFilters.cs exactly.
 * Note: company filter is NOT supported by the backend; do not add it.
 */
export interface ProjectsListParams {
  page?: number;
  pageSize?: number;
  city?: string;
  /** Backend enum name: Upcoming | UnderConstruction | Completed */
  status?: string;
}

export const projectsApi = {
  getList(params: ProjectsListParams = {}): Promise<PagedResult<ProjectResponse>> {
    const qs = buildQueryString(
      params as Record<string, string | number | boolean | null | undefined>,
    );
    return api.get<PagedResult<ProjectResponse>>(`/projects${qs}`);
  },

  getById(id: string): Promise<ProjectResponse> {
    return api.get<ProjectResponse>(`/projects/${id}`);
  },
};
