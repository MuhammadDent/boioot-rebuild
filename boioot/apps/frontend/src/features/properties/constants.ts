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

/** Feature/amenity keys with Arabic labels and icons. */
export const FEATURES_LIST = [
  { key: "Pool",           label: "مسبح",            icon: "🏊" },
  { key: "Garden",         label: "حديقة",            icon: "🌿" },
  { key: "Elevator",       label: "مصعد",             icon: "🛗" },
  { key: "Parking",        label: "موقف سيارات",      icon: "🅿️" },
  { key: "Security",       label: "حراسة أمنية",      icon: "🔒" },
  { key: "Generator",      label: "مولد كهربائي",     icon: "⚡" },
  { key: "CentralAC",      label: "تكييف مركزي",      icon: "❄️" },
  { key: "CentralHeating", label: "تدفئة مركزية",     icon: "🔥" },
  { key: "Balcony",        label: "شرفة",             icon: "🏙️" },
  { key: "Storage",        label: "مستودع",           icon: "📦" },
  { key: "MaidRoom",       label: "غرفة خدم",         icon: "🛏️" },
  { key: "Gym",            label: "نادي رياضي",       icon: "💪" },
  { key: "EquippedKitchen",label: "مطبخ مجهز",        icon: "🍳" },
  { key: "Furnished",      label: "مؤثث بالكامل",     icon: "🪑" },
  { key: "NearSchools",    label: "مدارس قريبة",      icon: "🏫" },
  { key: "NearHospital",   label: "مستشفى قريب",      icon: "🏥" },
  { key: "NearMalls",      label: "مراكز تسوق قريبة", icon: "🛍️" },
  { key: "InternetReady",  label: "إنترنت جاهز",      icon: "📡" },
  { key: "Playground",     label: "ملعب أطفال",       icon: "🎠" },
  { key: "SmartHome",      label: "منزل ذكي",         icon: "📱" },
];

/** Map from feature key → Arabic label (for quick lookup). */
export const FEATURE_LABEL: Record<string, string> = Object.fromEntries(
  FEATURES_LIST.map(({ key, label }) => [key, label])
);

/** Formats a numeric price with currency suffix. */
export function formatPrice(price: number, currency = "SYP"): string {
  if (currency === "USD") {
    return "$" + price.toLocaleString("en-US");
  }
  return price.toLocaleString("ar-SY") + " ل.س";
}
