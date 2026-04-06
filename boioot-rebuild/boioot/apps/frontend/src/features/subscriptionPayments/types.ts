export type PaymentRequestStatus =
  | "Pending"
  | "AwaitingPayment"
  | "ReceiptUploaded"
  | "UnderReview"
  | "Approved"
  | "Rejected"
  | "Activated"
  | "Cancelled";

export interface SubscriptionRequestActionResponse {
  id:                string;
  actionType:        string;
  decision:          string;
  title:             string;
  note:              string;
  sentInternally:    boolean;
  sentByEmail:       boolean;
  emailFailed:       boolean;
  performedByUserId: string;
  performedByName:   string | null;
  createdAt:         string;
}

export interface PaymentRequestResponse {
  id:                      string;
  accountId:               string;
  userId:                  string;

  // User / account info (enriched by admin)
  userName:                string | null;
  userEmail:               string | null;
  userPhone:               string | null;
  accountType:             string | null;
  accountTypeAr:           string | null;

  // Plan
  planId:                  string;
  planName:                string;
  planCode:                string;
  planDisplayNameAr:       string | null;
  pricingId:               string | null;
  billingCycle:            string;

  // Payment
  amount:                  number;
  currency:                string;
  paymentMethod:           string;
  paymentFlowType:         string;

  // Status
  status:                  PaymentRequestStatus;

  // Customer data
  receiptImageUrl:         string | null;
  receiptFileName:         string | null;
  customerNote:            string | null;
  salesRepresentativeName: string | null;

  // Review
  reviewedByUserId:        string | null;
  reviewNote:              string | null;
  externalPaymentReference:string | null;

  // Timestamps
  createdAt:               string;
  reviewedAt:              string | null;
  activatedAt:             string | null;
  completedAt:             string | null;

  // Action history (admin detail view)
  actions:                 SubscriptionRequestActionResponse[];
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

export interface NotifyUserDto {
  decision:     "approved" | "rejected" | "missing_info";
  title:        string;
  message:      string;
  sendInternal: boolean;
  sendEmail:    boolean;
}

export interface NotifyUserResult {
  sentInternally: boolean;
  sentByEmail:    boolean;
  emailFailed:    boolean;
  emailError:     string | null;
  request:        PaymentRequestResponse;
}
