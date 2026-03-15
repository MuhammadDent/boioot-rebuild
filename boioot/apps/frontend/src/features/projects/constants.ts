// Project label maps — values match the backend enum names exactly.

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  Upcoming:           "قادم",
  UnderConstruction:  "قيد الإنشاء",
  Completed:          "مكتمل",
};

/** Badge CSS class for each project status. */
export const PROJECT_STATUS_BADGE: Record<string, string> = {
  Upcoming:           "badge-yellow",
  UnderConstruction:  "badge-blue",
  Completed:          "badge-green",
};

/**
 * Formats an optional starting price.
 * Returns "السعر عند الطلب" when no price is set.
 */
export function formatStartingPrice(price: number | null | undefined): string {
  if (price == null) return "السعر عند الطلب";
  return "يبدأ من " + price.toLocaleString("ar-SY") + " ل.س";
}

/**
 * Formats an ISO delivery date string to a short Arabic locale string.
 * Returns "غير محدد" when null / undefined.
 */
export function formatDeliveryDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "غير محدد";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "غير محدد";
  return d.toLocaleDateString("ar-SY", { year: "numeric", month: "long" });
}
