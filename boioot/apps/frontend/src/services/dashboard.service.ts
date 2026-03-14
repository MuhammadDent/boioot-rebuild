import { api } from "@/lib/api";
import type {
  DashboardSummaryResponse,
  DashboardMessageSummaryResponse,
  PagedResult,
  DashboardPropertyItem,
  DashboardProjectItem,
  DashboardRequestItem,
} from "@/types";

export const dashboardService = {
  getSummary(): Promise<DashboardSummaryResponse> {
    return api.get<DashboardSummaryResponse>("/dashboard/summary");
  },

  getProperties(page = 1, pageSize = 10): Promise<PagedResult<DashboardPropertyItem>> {
    return api.get<PagedResult<DashboardPropertyItem>>(
      `/dashboard/properties?page=${page}&pageSize=${pageSize}`
    );
  },

  getProjects(page = 1, pageSize = 10): Promise<PagedResult<DashboardProjectItem>> {
    return api.get<PagedResult<DashboardProjectItem>>(
      `/dashboard/projects?page=${page}&pageSize=${pageSize}`
    );
  },

  getRequests(page = 1, pageSize = 10): Promise<PagedResult<DashboardRequestItem>> {
    return api.get<PagedResult<DashboardRequestItem>>(
      `/dashboard/requests?page=${page}&pageSize=${pageSize}`
    );
  },

  getMessagesSummary(): Promise<DashboardMessageSummaryResponse> {
    return api.get<DashboardMessageSummaryResponse>("/dashboard/messages/summary");
  },
};
