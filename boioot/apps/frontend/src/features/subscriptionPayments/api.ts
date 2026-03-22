import { api } from "@/lib/api";
import type {
  PaymentRequestResponse,
  CreatePaymentRequestDto,
  UploadReceiptDto,
  FreePlanActivationResponse,
} from "./types";

export const paymentRequestsApi = {
  create(dto: CreatePaymentRequestDto): Promise<PaymentRequestResponse> {
    return api.post<PaymentRequestResponse>("/payment-requests", dto);
  },

  getMyRequests(): Promise<PaymentRequestResponse[]> {
    return api.get<PaymentRequestResponse[]>("/payment-requests");
  },

  getById(id: string): Promise<PaymentRequestResponse> {
    return api.get<PaymentRequestResponse>(`/payment-requests/${id}`);
  },

  uploadReceipt(id: string, dto: UploadReceiptDto): Promise<PaymentRequestResponse> {
    return api.post<PaymentRequestResponse>(`/payment-requests/${id}/receipt`, dto);
  },

  cancel(id: string): Promise<PaymentRequestResponse> {
    return api.post<PaymentRequestResponse>(`/payment-requests/${id}/cancel`, {});
  },

  activateFree(planId: string): Promise<FreePlanActivationResponse> {
    return api.post<FreePlanActivationResponse>("/payment-requests/activate-free", { planId });
  },
};
