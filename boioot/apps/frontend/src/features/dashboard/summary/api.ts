import { api } from "@/lib/api";
import type { DashboardSummary, DashboardAnalytics } from "@/types";

export const dashboardSummaryApi = {
  getSummary(): Promise<DashboardSummary> {
    return api.get("/dashboard/summary");
  },
  getAnalytics(): Promise<DashboardAnalytics> {
    return api.get("/dashboard/analytics");
  },
};
