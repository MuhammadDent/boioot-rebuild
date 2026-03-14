import { api } from "@/lib/api";
import type { PagedResult, PropertyResponse } from "@/types";

export interface PropertiesListParams {
  page?: number;
  pageSize?: number;
  city?: string;
  type?: string;
  listingType?: string;
}

export const propertiesService = {
  getList(params: PropertiesListParams = {}): Promise<PagedResult<PropertyResponse>> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.pageSize) query.set("pageSize", String(params.pageSize));
    if (params.city) query.set("city", params.city);
    if (params.type) query.set("type", params.type);
    if (params.listingType) query.set("listingType", params.listingType);
    const qs = query.toString();
    return api.get<PagedResult<PropertyResponse>>(`/properties${qs ? `?${qs}` : ""}`);
  },

  getById(id: string): Promise<PropertyResponse> {
    return api.get<PropertyResponse>(`/properties/${id}`);
  },
};
