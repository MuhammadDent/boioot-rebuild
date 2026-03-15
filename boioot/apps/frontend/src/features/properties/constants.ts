// Property label maps — values match the backend enum names exactly.

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Apartment: "شقة",
  Villa:     "فيلا",
  Office:    "مكتب",
  Shop:      "محل",
  Land:      "أرض",
  Building:  "مبنى",
};

export const LISTING_TYPE_LABELS: Record<string, string> = {
  Sale:      "للبيع",
  Rent:      "للإيجار",
  DailyRent: "إيجار يومي",
};

export const PROPERTY_STATUS_LABELS: Record<string, string> = {
  Available: "متاح",
  Sold:      "مباع",
  Rented:    "مؤجر",
  Inactive:  "غير متاح",
};

/** Common Syrian cities used in the city filter (exact-match on the backend). */
export const SYRIAN_CITIES: string[] = [
  "دمشق",
  "حلب",
  "حمص",
  "حماة",
  "اللاذقية",
  "طرطوس",
  "دير الزور",
  "الرقة",
  "درعا",
  "السويداء",
  "القنيطرة",
  "إدلب",
  "الحسكة",
];

/** Formats a numeric price to Arabic Syrian locale string. */
export function formatPrice(price: number): string {
  return price.toLocaleString("ar-SY") + " ل.س";
}
