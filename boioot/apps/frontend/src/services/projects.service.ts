import { api } from "@/lib/api";
import type { PagedResult, ProjectResponse } from "@/types";

export interface ProjectFilters {
  city?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: ProjectFilters): string {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.status) params.set("status", filters.status);
  if (filters.page != null) params.set("page", String(filters.page));
  if (filters.pageSize != null) params.set("pageSize", String(filters.pageSize));
  const q = params.toString();
  return q ? `?${q}` : "";
}

export const projectsService = {
  getPublicList(filters: ProjectFilters = {}): Promise<PagedResult<ProjectResponse>> {
    return api.get<PagedResult<ProjectResponse>>(`/projects${buildQuery(filters)}`);
  },

  getPublicById(id: string): Promise<ProjectResponse> {
    return api.get<ProjectResponse>(`/projects/${id}`);
  },

  getDashboardList(filters: ProjectFilters = {}): Promise<PagedResult<ProjectResponse>> {
    return api.get<PagedResult<ProjectResponse>>(`/projects/my${buildQuery(filters)}`);
  },
};
