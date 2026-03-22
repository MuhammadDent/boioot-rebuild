export type PaymentRequestStatus =
  | "Pending"
  | "AwaitingPayment"
  | "ReceiptUploaded"
  | "UnderReview"
  | "Approved"
  | "Rejected"
  | "Activated"
  | "Cancelled";

export interface PaymentRequestResponse {
  id:                      string;
  accountId:               string;
  userId:                  string;
  planId:                  string;
  planName:                string;
  planCode:                string;
  pricingId:               string | null;
  billingCycle:            string;
  amount:                  number;
  currency:                string;
  paymentMethod:           string;
  paymentFlowType:         string;
  status:                  PaymentRequestStatus;
  receiptImageUrl:         string | null;
  receiptFileName:         string | null;
  customerNote:            string | null;
  salesRepresentativeName: string | null;
  reviewedByUserId:        string | null;
  reviewNote:              string | null;
  externalPaymentReference:string | null;
  createdAt:               string;
  reviewedAt:              string | null;
  activatedAt:             string | null;
  completedAt:             string | null;
}

export interface CreatePaymentRequestDto {
  planId:                  string;
  pricingId?:              string;
  billingCycle:            "Monthly" | "Yearly";
  paymentMethod:           string;
  customerNote?:           string;
  salesRepresentativeName?: string;
}

export interface UploadReceiptDto {
  receiptImageUrl: string;
  receiptFileName?: string;
  customerNote?:   string;
}

export interface FreePlanActivationResponse {
  subscriptionId: string;
  planName:       string;
  message:        string;
}
