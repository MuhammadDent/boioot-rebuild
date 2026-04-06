export interface PaymentProofResponse {
  id:        string;
  imageUrl:  string;
  notes:     string | null;
  createdAt: string;
}

export interface InvoiceResponse {
  id:            string;
  userId:        string;
  userName:      string;
  userEmail:     string;
  planPricingId: string;
  planName:      string;
  billingCycle:  string;
  amount:        number;
  currency:      string;
  status:        "Pending" | "Paid" | "Failed" | "Cancelled";
  providerName:  string;
  externalRef:   string | null;
  adminNote:     string | null;
  createdAt:     string;
  proof:         PaymentProofResponse | null;
}

export interface CheckoutRequest {
  pricingId: string;
}

export interface SubmitProofRequest {
  imageUrl: string;
  notes?:   string;
}
