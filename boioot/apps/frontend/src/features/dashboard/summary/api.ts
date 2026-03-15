import { api } from "@/lib/api";
import type { DashboardSummary } from "@/types";

export const dashboardSummaryApi = {
  getSummary(): Promise<DashboardSummary> {
    return api.get("/dashboard/summary");
  },
};
