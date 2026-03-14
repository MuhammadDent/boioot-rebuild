import { api } from "@/lib/api";
import type { PagedResult, PropertyResponse } from "@/types";

export interface PropertyFilters {
  city?: string;
  type?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: PropertyFilters): string {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.type) params.set("type", filters.type);
  if (filters.listingType) params.set("listingType", filters.listingType);
  if (filters.minPrice != null) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) params.set("maxPrice", String(filters.maxPrice));
  if (filters.page != null) params.set("page", String(filters.page));
  if (filters.pageSize != null) params.set("pageSize", String(filters.pageSize));
  const q = params.toString();
  return q ? `?${q}` : "";
}

export const propertiesService = {
  getPublicList(filters: PropertyFilters = {}): Promise<PagedResult<PropertyResponse>> {
    return api.get<PagedResult<PropertyResponse>>(`/properties${buildQuery(filters)}`);
  },

  getPublicById(id: string): Promise<PropertyResponse> {
    return api.get<PropertyResponse>(`/properties/${id}`);
  },

};
