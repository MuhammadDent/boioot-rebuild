import { api } from "@/lib/api";
import { buildQueryString } from "@/lib/query-string";
import type { PagedResult, PropertyResponse } from "@/types";

/**
 * Query parameters supported by GET /api/properties.
 * Matches PropertyFilters.cs exactly — do not add fields not in the backend DTO.
 */
export interface PropertiesListParams {
  page?: number;
  pageSize?: number;
  city?: string;
  /** Backend enum name: Apartment | Villa | Office | Shop | Land | Building */
  type?: string;
  /** Backend enum name: Sale | Rent */
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
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
