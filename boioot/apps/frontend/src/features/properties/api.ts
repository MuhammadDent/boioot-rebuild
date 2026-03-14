import { api } from "@/lib/api";
import { buildQueryString } from "@/lib/query-string";
import type { PagedResult, PropertyResponse } from "@/types";

export interface PropertiesListParams {
  page?: number;
  pageSize?: number;
  city?: string;
  type?: string;
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  bedrooms?: number;
}

export const propertiesApi = {
  getList(params: PropertiesListParams = {}): Promise<PagedResult<PropertyResponse>> {
    const qs = buildQueryString(params as Record<string, string | number | boolean | null | undefined>);
    return api.get<PagedResult<PropertyResponse>>(`/properties${qs}`);
  },

  getById(id: string): Promise<PropertyResponse> {
    return api.get<PropertyResponse>(`/properties/${id}`);
  },
};
