import { api } from "@/lib/api";
import type {
  PagedResult,
  DashboardProjectItem,
  ProjectResponse,
  CreateProjectRequest,
  UpdateProjectRequest,
} from "@/types";

export const DASHBOARD_PROJECTS_PAGE_SIZE = 10;

export const dashboardProjectsApi = {
  getList(
    page: number = 1,
    pageSize: number = DASHBOARD_PROJECTS_PAGE_SIZE
  ): Promise<PagedResult<DashboardProjectItem>> {
    return api.get(
      `/dashboard/projects?page=${page}&pageSize=${pageSize}`
    );
  },

  // Uses the dashboard-specific endpoint which has no IsPublished filter,
  // allowing editing of unpublished projects (unlike GET /api/projects/{id}).
  getById(id: string): Promise<ProjectResponse> {
    return api.get(`/dashboard/projects/${id}`);
  },

  create(data: CreateProjectRequest): Promise<ProjectResponse> {
    return api.post("/projects", data);
  },

  update(id: string, data: UpdateProjectRequest): Promise<ProjectResponse> {
    return api.put(`/projects/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return api.delete(`/projects/${id}`);
  },
};
