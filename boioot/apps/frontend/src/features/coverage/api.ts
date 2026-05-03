import { api } from "@/lib/api";

export interface CoverageItem {
  id: string;
  cityId: string;
  cityName: string;
  neighborhoodId: string | null;
  neighborhoodName: string | null;
  coverageType: "city_wide" | "custom";
  addedAt: string;
}

export interface AddCoverageRequest {
  cityId: string;
  neighborhoodId?: string;
  coverageType: "city_wide" | "custom";
}

export const coverageApi = {
  getMyCoverage(): Promise<CoverageItem[]> {
    return api.get<CoverageItem[]>("/coverage");
  },
  add(data: AddCoverageRequest): Promise<CoverageItem> {
    return api.post<CoverageItem>("/coverage", data);
  },
  remove(id: string): Promise<{ deleted: string }> {
    return api.delete<{ deleted: string }>(`/coverage/${id}`);
  },
};
