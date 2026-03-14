import { api } from "@/lib/api";
import { buildQueryString } from "@/lib/query-string";
import type { PagedResult } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────
// Will be expanded when the backend Projects module is implemented.

export interface ProjectResponse {
  id: string;
  name: string;
  description?: string;
  city: string;
  companyId: string;
  companyName: string;
  status: string;
  createdAt: string;
}

export interface ProjectsListParams {
  page?: number;
  pageSize?: number;
  city?: string;
  status?: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────
// These will be activated once the backend /projects endpoints are live.

export const projectsApi = {
  getList(params: ProjectsListParams = {}): Promise<PagedResult<ProjectResponse>> {
    const qs = buildQueryString(params as Record<string, string | number | boolean | null | undefined>);
    return api.get<PagedResult<ProjectResponse>>(`/projects${qs}`);
  },

  getById(id: string): Promise<ProjectResponse> {
    return api.get<ProjectResponse>(`/projects/${id}`);
  },
};
