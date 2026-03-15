import { api } from "@/lib/api";
import type {
  PagedResult,
  DashboardPropertyItem,
  PropertyResponse,
  CreatePropertyRequest,
  UpdatePropertyRequest,
} from "@/types";

export const DASHBOARD_PROPERTIES_PAGE_SIZE = 10;

export const dashboardPropertiesApi = {
  getList(
    page: number = 1,
    pageSize: number = DASHBOARD_PROPERTIES_PAGE_SIZE
  ): Promise<PagedResult<DashboardPropertyItem>> {
    return api.get(
      `/dashboard/properties?page=${page}&pageSize=${pageSize}`
    );
  },

  // Uses the dashboard-specific endpoint which has no status filter,
  // allowing editing of Inactive properties (unlike GET /api/properties/{id}).
  getById(id: string): Promise<PropertyResponse> {
    return api.get(`/dashboard/properties/${id}`);
  },

  create(data: CreatePropertyRequest): Promise<PropertyResponse> {
    return api.post("/properties", data);
  },

  update(id: string, data: UpdatePropertyRequest): Promise<PropertyResponse> {
    return api.put(`/properties/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return api.delete(`/properties/${id}`);
  },
};
