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

/** Common Syrian neighborhoods for property forms */
export const SYRIAN_NEIGHBORHOODS: Record<string, string[]> = {
  "دمشق": [
    "المزة", "كفرسوسة", "المالكي", "أبو رمانة", "القصاع", "الشعلان",
    "البرامكة", "الروضة", "الحمرا", "المهاجرين", "دمر", "جرمانا",
    "قدسيا", "الزبداني", "ركن الدين", "العمارة", "باب توما", "ساروجة",
    "القابون", "برزة", "عدرا", "التضامن",
  ],
  "حلب": [
    "العزيزية", "السريان", "الشهباء", "حي الجميلية", "المشارقة",
    "السليمانية", "الميدان", "صلاح الدين", "الإذاعة", "الحمدانية",
    "الشيخ مقصود", "حلب الجديدة", "سيف الدولة",
  ],
  "حمص": [
    "الوعر", "عكرمة", "الخضراء", "الإنشاءات", "الزهراء",
    "الغوطة", "باب السباع", "ديماس",
  ],
  "اللاذقية": [
    "الزراعة", "قنينص", "الرمل الجنوبي", "الرمل الشمالي",
    "الكورنيش", "صلنفة",
  ],
};

/** Formats a numeric price with currency suffix. */
export function formatPrice(price: number, currency = "SYP"): string {
  if (currency === "USD") {
    return "$" + price.toLocaleString("en-US");
  }
  return price.toLocaleString("ar-SY") + " ل.س";
}
