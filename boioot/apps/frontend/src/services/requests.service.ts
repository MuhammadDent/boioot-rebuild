import { api } from "@/lib/api";
import type { PagedResult, RequestResponse } from "@/types";

export interface RequestFilters {
  status?: string;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: RequestFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.page != null) params.set("page", String(filters.page));
  if (filters.pageSize != null) params.set("pageSize", String(filters.pageSize));
  const q = params.toString();
  return q ? `?${q}` : "";
}

export interface SubmitRequestPayload {
  name: string;
  phone: string;
  email?: string;
  message?: string;
  propertyId?: string;
  projectId?: string;
  companyId?: string;
}

export const requestsService = {
  getDashboardList(filters: RequestFilters = {}): Promise<PagedResult<RequestResponse>> {
    return api.get<PagedResult<RequestResponse>>(`/requests${buildQuery(filters)}`);
  },

  submit(payload: SubmitRequestPayload): Promise<RequestResponse> {
    return api.post<RequestResponse>("/requests", payload);
  },

  updateStatus(id: string, status: string): Promise<RequestResponse> {
    return api.patch<RequestResponse>(`/requests/${id}/status`, { status });
  },
};
