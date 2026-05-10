import { api } from "@/lib/api";

export interface CoverageItem {
  id: string;
  cityId: string | null;
  cityName: string;
  province: string | null;
  neighborhoodId: string | null;
  neighborhoodName: string | null;
  coverageType: "city_wide" | "custom" | "province_wide";
  addedAt: string;
}

export interface AddCoverageRequest {
  cityId?: string;
  province?: string;
  neighborhoodId?: string;
  coverageType: "city_wide" | "custom" | "province_wide";
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
