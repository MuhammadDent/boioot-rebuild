import { api } from "@/lib/api";

export interface AdminPaymentRequestDto {
  id:                      string;
  accountId:               string;
  accountName:             string;
  accountOwnerEmail:       string;
  userId:                  string;
  planId:                  string;
  planName:                string;
  planCode:                string;
  billingCycle:            string;
  amount:                  number;
  currency:                string;
  paymentMethod:           string;
  status:                  string;
  receiptImageUrl:         string | null;
  receiptFileName:         string | null;
  customerNote:            string | null;
  salesRepresentativeName: string | null;
  reviewNote:              string | null;
  reviewedByUserId:        string | null;
  createdAt:               string;
  reviewedAt:              string | null;
  activatedAt:             string | null;
}

export interface AdminPaymentRequestsPage {
  items:       AdminPaymentRequestDto[];
  total:       number;
  page:        number;
  pageSize:    number;
  totalPages:  number;
}

export interface AdminPaymentRequestFilters {
  status?:          string;
  paymentMethod?:   string;
  page?:            number;
  pageSize?:        number;
}

export const adminPaymentRequestsApi = {
  async getAll(filters: AdminPaymentRequestFilters = {}): Promise<AdminPaymentRequestsPage> {
    const q = new URLSearchParams();
    if (filters.status)        q.set("status",      filters.status);
    if (filters.paymentMethod) q.set("paymentMethod", filters.paymentMethod);
    if (filters.page)          q.set("page",         String(filters.page));
    if (filters.pageSize)      q.set("pageSize",     String(filters.pageSize ?? 30));
    const qs = q.toString();
    return api.get<AdminPaymentRequestsPage>(
      `/admin/payment-requests${qs ? `?${qs}` : "?pageSize=30"}`
    );
  },

  async getById(id: string): Promise<AdminPaymentRequestDto> {
    return api.get<AdminPaymentRequestDto>(`/admin/payment-requests/${id}`);
  },

  async approve(id: string, note?: string): Promise<AdminPaymentRequestDto> {
    return api.post<AdminPaymentRequestDto>(`/admin/payment-requests/${id}/approve`, { note: note ?? null });
  },

  async reject(id: string, note: string): Promise<AdminPaymentRequestDto> {
    return api.post<AdminPaymentRequestDto>(`/admin/payment-requests/${id}/reject`, { note });
  },

  async activate(id: string): Promise<AdminPaymentRequestDto> {
    return api.post<AdminPaymentRequestDto>(`/admin/payment-requests/${id}/activate`, {});
  },

  async markUnderReview(id: string): Promise<AdminPaymentRequestDto> {
    return api.post<AdminPaymentRequestDto>(`/admin/payment-requests/${id}/under-review`, {});
  },

  async adminCancel(id: string, note?: string): Promise<AdminPaymentRequestDto> {
    return api.post<AdminPaymentRequestDto>(`/admin/payment-requests/${id}/cancel`, { note: note ?? null });
  },
};
