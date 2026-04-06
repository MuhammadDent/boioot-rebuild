import { api } from "@/lib/api";
import type { InvoiceResponse, SubmitProofRequest } from "./types";

export const billingApi = {
  /**
   * Creates a pending invoice for the given pricing option.
   * Called when the user confirms the upgrade modal.
   */
  async checkout(pricingId: string): Promise<InvoiceResponse> {
    return api.post<InvoiceResponse>("/dashboard/billing/checkout", { pricingId });
  },

  /** Returns all invoices belonging to the authenticated user. */
  async getInvoices(): Promise<InvoiceResponse[]> {
    return api.get<InvoiceResponse[]>("/dashboard/billing/invoices");
  },

  /** Attaches a payment proof image to a pending invoice. */
  async submitProof(
    invoiceId: string,
    request: SubmitProofRequest
  ): Promise<InvoiceResponse> {
    return api.post<InvoiceResponse>(
      `/dashboard/billing/invoices/${invoiceId}/proof`,
      request
    );
  },
};
