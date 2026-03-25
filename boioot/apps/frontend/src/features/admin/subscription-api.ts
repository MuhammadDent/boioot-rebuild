import { api } from "@/lib/api";
import type { SubscriptionHistoryDto } from "@/features/subscription/types";

export interface AdminSubscriptionDto {
  subscriptionId:    string;
  accountId:         string;
  accountName:       string;
  accountOwnerEmail: string;
  planId:            string;
  planName:          string;
  status:            string;
  autoRenew:         boolean;
  isActive:          boolean;
  startDate:         string;
  endDate:           string | null;
  trialEndsAt:       string | null;
  currentPeriodEnd:  string | null;
  canceledAt:        string | null;
  billingCycle:      string | null;
  priceAmount:       number;
  currencyCode:      string;
}

export interface AssignPlanRequest {
  accountId: string;
  planId:    string;
  pricingId: string | null;
  notes:     string | null;
}

export const adminSubscriptionApi = {
  async getAll(params?: { status?: string; page?: number; pageSize?: number }): Promise<AdminSubscriptionDto[]> {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.page)   q.set("page",   String(params.page));
    if (params?.pageSize) q.set("pageSize", String(params.pageSize));
    const qs = q.toString();
    return api.get<AdminSubscriptionDto[]>(`/admin/subscriptions${qs ? `?${qs}` : ""}`);
  },

  async assign(request: AssignPlanRequest): Promise<void> {
    await api.post("/admin/subscriptions/assign", request);
  },

  async getHistoryByAccount(accountId: string): Promise<SubscriptionHistoryDto[]> {
    return api.get<SubscriptionHistoryDto[]>(`/admin/subscriptions/history/${accountId}`);
  },
};
