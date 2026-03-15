import { api } from "@/lib/api";
import type {
  PagedResult,
  AdminUserResponse,
  AdminCompanyResponse,
  PropertyResponse,
  ProjectResponse,
  RequestResponse,
} from "@/types";

// ── Filter param types ─────────────────────────────────────────────────────────

export interface AdminUsersParams {
  /** Admin | CompanyOwner | Agent | User — empty string means "all" */
  role?: string;
  isActive?: boolean;
}

export interface AdminCompaniesParams {
  city?: string;
  isVerified?: boolean;
}

export interface AdminPropertiesParams {
  /** Available | Inactive | Sold | Rented — empty string means "all" */
  status?: string;
  city?: string;
}

export interface AdminProjectsParams {
  /** Upcoming | UnderConstruction | Completed — empty string means "all" */
  status?: string;
  city?: string;
}

export interface AdminRequestsParams {
  /** New | Contacted | Qualified | Closed — empty string means "all" */
  status?: string;
}

// ── Admin API service ──────────────────────────────────────────────────────────

export const adminApi = {
  getUsers(
    page: number,
    pageSize: number,
    params: AdminUsersParams = {},
  ): Promise<PagedResult<AdminUserResponse>> {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (params.role)                    qs.set("role", params.role);
    if (params.isActive !== undefined)  qs.set("isActive", String(params.isActive));
    return api.get(`/admin/users?${qs}`);
  },

  getCompanies(
    page: number,
    pageSize: number,
    params: AdminCompaniesParams = {},
  ): Promise<PagedResult<AdminCompanyResponse>> {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (params.city)                      qs.set("city", params.city);
    if (params.isVerified !== undefined)  qs.set("isVerified", String(params.isVerified));
    return api.get(`/admin/companies?${qs}`);
  },

  getProperties(
    page: number,
    pageSize: number,
    params: AdminPropertiesParams = {},
  ): Promise<PagedResult<PropertyResponse>> {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (params.status) qs.set("status", params.status);
    if (params.city)   qs.set("city", params.city);
    return api.get(`/admin/properties?${qs}`);
  },

  getProjects(
    page: number,
    pageSize: number,
    params: AdminProjectsParams = {},
  ): Promise<PagedResult<ProjectResponse>> {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (params.status) qs.set("status", params.status);
    if (params.city)   qs.set("city", params.city);
    return api.get(`/admin/projects?${qs}`);
  },

  getRequests(
    page: number,
    pageSize: number,
    params: AdminRequestsParams = {},
  ): Promise<PagedResult<RequestResponse>> {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (params.status) qs.set("status", params.status);
    return api.get(`/admin/requests?${qs}`);
  },

  /** PATCH /api/admin/users/{userId}/status */
  updateUserStatus(userId: string, isActive: boolean): Promise<AdminUserResponse> {
    return api.patch(`/admin/users/${userId}/status`, { isActive });
  },

  /** PATCH /api/admin/companies/{companyId}/verify */
  verifyCompany(companyId: string, isVerified: boolean): Promise<AdminCompanyResponse> {
    return api.patch(`/admin/companies/${companyId}/verify`, { isVerified });
  },
};
