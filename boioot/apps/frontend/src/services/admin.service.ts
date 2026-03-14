import { api } from "@/lib/api";
import type {
  PagedResult,
  AdminUserResponse,
  AdminCompanyResponse,
  PropertyResponse,
  ProjectResponse,
  RequestResponse,
} from "@/types";

export interface AdminListFilters {
  page?: number;
  pageSize?: number;
  city?: string;
  status?: string;
  role?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

function buildQuery(filters: AdminListFilters): string {
  const params = new URLSearchParams();
  if (filters.page != null) params.set("page", String(filters.page));
  if (filters.pageSize != null) params.set("pageSize", String(filters.pageSize));
  if (filters.city) params.set("city", filters.city);
  if (filters.status) params.set("status", filters.status);
  if (filters.role) params.set("role", filters.role);
  if (filters.isActive != null) params.set("isActive", String(filters.isActive));
  if (filters.isVerified != null) params.set("isVerified", String(filters.isVerified));
  const q = params.toString();
  return q ? `?${q}` : "";
}

export const adminService = {
  getUsers(filters: AdminListFilters = {}): Promise<PagedResult<AdminUserResponse>> {
    return api.get<PagedResult<AdminUserResponse>>(`/admin/users${buildQuery(filters)}`);
  },

  getCompanies(filters: AdminListFilters = {}): Promise<PagedResult<AdminCompanyResponse>> {
    return api.get<PagedResult<AdminCompanyResponse>>(`/admin/companies${buildQuery(filters)}`);
  },

  getProperties(filters: AdminListFilters = {}): Promise<PagedResult<PropertyResponse>> {
    return api.get<PagedResult<PropertyResponse>>(`/admin/properties${buildQuery(filters)}`);
  },

  getProjects(filters: AdminListFilters = {}): Promise<PagedResult<ProjectResponse>> {
    return api.get<PagedResult<ProjectResponse>>(`/admin/projects${buildQuery(filters)}`);
  },

  getRequests(filters: AdminListFilters = {}): Promise<PagedResult<RequestResponse>> {
    return api.get<PagedResult<RequestResponse>>(`/admin/requests${buildQuery(filters)}`);
  },

  updateUserStatus(userId: string, isActive: boolean): Promise<AdminUserResponse> {
    return api.patch<AdminUserResponse>(`/admin/users/${userId}/status`, { isActive });
  },

  verifyCompany(companyId: string, isVerified: boolean): Promise<AdminCompanyResponse> {
    return api.patch<AdminCompanyResponse>(`/admin/companies/${companyId}/verify`, { isVerified });
  },
};
