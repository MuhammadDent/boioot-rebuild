import { api } from "@/lib/api";
import type { PagedResult, DashboardRequestItem, RequestResponse } from "@/types";

export const DASHBOARD_REQUESTS_PAGE_SIZE = 10;

export const dashboardRequestsApi = {
  getList(
    page: number = 1,
    pageSize: number = DASHBOARD_REQUESTS_PAGE_SIZE
  ): Promise<PagedResult<DashboardRequestItem>> {
    return api.get(`/dashboard/requests?page=${page}&pageSize=${pageSize}`);
  },

  getById(id: string): Promise<RequestResponse> {
    return api.get(`/dashboard/requests/${id}`);
  },

  /** PATCH /dashboard/requests/{id}/status — body: { status: "New"|"Contacted"|"Qualified"|"Closed" } */
  updateStatus(id: string, status: string): Promise<RequestResponse> {
    return api.patch(`/dashboard/requests/${id}/status`, { status });
  },
};
