import { api } from "@/lib/api";
import type {
  PagedResult,
  AdminUserResponse,
  AdminCompanyResponse,
  PropertyResponse,
  ProjectResponse,
  RequestResponse,
  ListingTypeConfig,
  PropertyTypeConfig,
  OwnershipTypeConfig,
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

export interface UpsertListingTypePayload {
  value: string;
  label: string;
  order: number;
  isActive: boolean;
}

export interface UpsertPropertyTypePayload {
  value: string;
  label: string;
  icon: string;
  order: number;
  isActive: boolean;
}

export interface UpsertOwnershipTypePayload {
  value: string;
  label: string;
  order: number;
  isActive: boolean;
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

  /** PATCH /api/admin/users/{userId}/role */
  updateUserRole(userId: string, role: string): Promise<AdminUserResponse> {
    return api.patch(`/admin/users/${userId}/role`, { role });
  },

  /** PATCH /api/admin/companies/{companyId}/verify */
  verifyCompany(companyId: string, isVerified: boolean): Promise<AdminCompanyResponse> {
    return api.patch(`/admin/companies/${companyId}/verify`, { isVerified });
  },

  // ── Listing Types ─────────────────────────────────────────────────────────

  /** GET /api/admin/listing-types — all types (admin view, includes inactive) */
  getListingTypes(): Promise<ListingTypeConfig[]> {
    return api.get("/admin/listing-types");
  },

  /** POST /api/admin/listing-types */
  createListingType(payload: UpsertListingTypePayload): Promise<ListingTypeConfig> {
    return api.post("/admin/listing-types", payload);
  },

  /** PUT /api/admin/listing-types/{id} */
  updateListingType(id: string, payload: UpsertListingTypePayload): Promise<ListingTypeConfig> {
    return api.put(`/admin/listing-types/${id}`, payload);
  },

  /** DELETE /api/admin/listing-types/{id} */
  deleteListingType(id: string): Promise<void> {
    return api.delete(`/admin/listing-types/${id}`);
  },

  // ── Property Types ────────────────────────────────────────────────────────

  getPropertyTypes(): Promise<PropertyTypeConfig[]> {
    return api.get("/admin/property-types");
  },
  createPropertyType(payload: UpsertPropertyTypePayload): Promise<PropertyTypeConfig> {
    return api.post("/admin/property-types", payload);
  },
  updatePropertyType(id: string, payload: UpsertPropertyTypePayload): Promise<PropertyTypeConfig> {
    return api.put(`/admin/property-types/${id}`, payload);
  },
  deletePropertyType(id: string): Promise<void> {
    return api.delete(`/admin/property-types/${id}`);
  },

  // ── Ownership Types ───────────────────────────────────────────────────────

  getOwnershipTypes(): Promise<OwnershipTypeConfig[]> {
    return api.get("/admin/ownership-types");
  },
  createOwnershipType(payload: UpsertOwnershipTypePayload): Promise<OwnershipTypeConfig> {
    return api.post("/admin/ownership-types", payload);
  },
  updateOwnershipType(id: string, payload: UpsertOwnershipTypePayload): Promise<OwnershipTypeConfig> {
    return api.put(`/admin/ownership-types/${id}`, payload);
  },
  deleteOwnershipType(id: string): Promise<void> {
    return api.delete(`/admin/ownership-types/${id}`);
  },
};
