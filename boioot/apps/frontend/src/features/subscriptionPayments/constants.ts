import type { PaymentRequestStatus } from "./types";

// ── Payment method labels ─────────────────────────────────────────────────────

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer:      "تحويل بنكي",
  cash_to_sales_rep:  "دفع نقدي لمندوب المبيعات",
  receipt_upload:     "رفع إيصال الدفع",
  online_gateway:     "دفع إلكتروني",
  other_manual:       "طريقة أخرى",
};

export const PAYMENT_METHOD_DESC: Record<string, string> = {
  bank_transfer:     "حوّل المبلغ إلى حساب الشركة البنكي ثم ارفع صورة الإيصال",
  cash_to_sales_rep: "ادفع المبلغ نقداً لأحد مندوبي مبيعات بويوت",
  receipt_upload:    "ارفع إيصال الدفع الخاص بك مباشرةً",
  online_gateway:    "قريباً — الدفع الإلكتروني",
  other_manual:      "تواصل مع فريق المبيعات لترتيب طريقة الدفع",
};

export const PAYMENT_METHOD_ICON: Record<string, string> = {
  bank_transfer:     "🏦",
  cash_to_sales_rep: "🤝",
  receipt_upload:    "📄",
  online_gateway:    "💳",
  other_manual:      "📞",
};

export const AVAILABLE_METHODS = [
  "bank_transfer",
  "cash_to_sales_rep",
  "receipt_upload",
  "other_manual",
];

/** All manual payment methods — every one supports optional proof upload */
export const MANUAL_METHODS = new Set([
  "bank_transfer",
  "cash_to_sales_rep",
  "receipt_upload",
  "other_manual",
]);

/** Methods where proof upload is strongly recommended (shown with emphasis) */
export const RECEIPT_METHODS = new Set(["bank_transfer", "receipt_upload"]);

// ── Status labels + colours ───────────────────────────────────────────────────

export interface StatusMeta {
  label:  string;
  color:  string;
  bg:     string;
  note:   string;
}

export const STATUS_META: Record<PaymentRequestStatus, StatusMeta> = {
  Pending: {
    label: "قيد الانتظار",
    color: "#92400e",
    bg:    "#fef3c7",
    note:  "تم استلام طلبك. سيراجعه فريق المبيعات قريباً.",
  },
  AwaitingPayment: {
    label: "بانتظار الدفع",
    color: "#0369a1",
    bg:    "#e0f2fe",
    note:  "يرجى إتمام الدفع ثم رفع الإيصال.",
  },
  ReceiptUploaded: {
    label: "الإيصال مرفوع",
    color: "#1d4ed8",
    bg:    "#dbeafe",
    note:  "تم رفع الإيصال بنجاح. سيراجعه الفريق قريباً.",
  },
  UnderReview: {
    label: "قيد المراجعة",
    color: "#5b21b6",
    bg:    "#f5f3ff",
    note:  "يراجع فريقنا طلبك الآن. سيتم التفعيل بعد التحقق من الدفع.",
  },
  Approved: {
    label: "تمت الموافقة",
    color: "#166534",
    bg:    "#dcfce7",
    note:  "تمت الموافقة على طلبك. سيتم تفعيل الباقة قريباً.",
  },
  Rejected: {
    label: "مرفوض",
    color: "#b91c1c",
    bg:    "#fee2e2",
    note:  "تعذّر قبول طلبك. يمكنك إنشاء طلب جديد.",
  },
  Activated: {
    label: "مُفعَّل ✓",
    color: "#166534",
    bg:    "#bbf7d0",
    note:  "تم تفعيل اشتراكك بنجاح. استمتع بالباقة!",
  },
  Cancelled: {
    label: "ملغى",
    color: "#374151",
    bg:    "#f3f4f6",
    note:  "تم إلغاء الطلب.",
  },
};

// ── Billing cycle labels ──────────────────────────────────────────────────────

export const CYCLE_LABELS: Record<string, string> = {
  Monthly: "شهري",
  Yearly:  "سنوي",
};
