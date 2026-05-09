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

  // Uses the my-listings endpoint — broad ownership check that works for every
  // authenticated role (User, Owner, Broker, Agent, CompanyOwner, Admin).
  // The old /dashboard/properties/{id} was gated by AdminOrCompanyOwnerOrAgent
  // which excluded "User" role, causing a 403 for regular listing owners.
  getById(id: string): Promise<PropertyResponse> {
    return api.get(`/properties/my-listings/${id}`);
  },

  // For CompanyOwner / Admin — attaches property to their company.
  create(data: CreatePropertyRequest): Promise<PropertyResponse> {
    return api.post("/properties", data);
  },

  // For Owner / Broker / Agent — personal listing, no company required.
  postUserListing(data: CreatePropertyRequest): Promise<PropertyResponse> {
    return api.post("/properties/post", data);
  },

  // Uses the my-listings PUT endpoint — any authenticated owner can update
  // their own listing regardless of role. EnsureCanManagePropertyAsync inside
  // UpdateAsync handles the ownership check at the service level.
  update(id: string, data: UpdatePropertyRequest): Promise<PropertyResponse> {
    return api.put(`/properties/my-listings/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return api.delete(`/properties/${id}`);
  },
};
