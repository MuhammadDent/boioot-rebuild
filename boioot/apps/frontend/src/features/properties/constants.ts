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

/** Floor level labels — match backend enum values exactly. */
export const FLOOR_LABELS: Record<string, string> = {
  Ground:      "الأرضي",
  First:       "الأول",
  Second:      "الثاني",
  Third:       "الثالث",
  Fourth:      "الرابع",
  Fifth:       "الخامس",
  Sixth:       "السادس",
  SeventhPlus: "سابع فما فوق",
  Penthouse:   "بنتهاوس",
  SingleFloor: "طابق واحد",
  Basement:    "الطابق السفلي",
};

/**
 * NON-AUTHORITATIVE LEGACY FALLBACK — do not treat this map as the source of
 * truth. The authoritative source for ownership types is the admin-managed
 * database table exposed via GET /api/ownership-types (see
 * `features/properties/ownershipTypes.ts`). This map is retained only for
 * offline/API-failure resilience and for labeling legacy codes that are no
 * longer in the database.
 */
export const OWNERSHIP_TYPE_LABELS: Record<string, string> = {
  Freehold:        "ملكية",
  Usufruct:        "حق انتفاع",
  Leasehold:       "إيجار طويل الأمد",
  LongLease:       "إيجار طويل الأمد",
  LongTermLease:   "إيجار طويل الأمد",
  SharedOwnership: "ملكية مشتركة",
  Cooperative:     "تعاوني",
  Customary:       "عادي (عرفي)",
  Waqf:            "وقف",
  RegisteredDeed:  "سند مسجل",
  Unknown:         "غير محدد",
};

/**
 * NON-AUTHORITATIVE LEGACY FALLBACK — prefer `resolveOwnershipLabel` from
 * `features/properties/ownershipTypes.ts`, which resolves against the
 * admin-managed API first. This function only consults the static map above.
 * Falls back to "غير محدد" for any unknown, null, or empty value —
 * never exposes raw backend enum strings to users.
 */
export function getOwnershipTypeLabel(value: string | null | undefined): string {
  if (!value) return "غير محدد";
  return OWNERSHIP_TYPE_LABELS[value] ?? "غير محدد";
}

/**
 * NON-AUTHORITATIVE LEGACY FALLBACK — DO NOT use for form selects.
 * Form options must come from GET /api/ownership-types via
 * `useOwnershipTypes()` in `features/properties/ownershipTypes.ts`
 * (admin-managed, active + ordered). This list is retained only as a
 * last-resort offline fallback and for tests of legacy behavior.
 */
export const OWNERSHIP_OPTIONS: { value: string; label: string }[] = [
  { value: "Freehold",        label: "ملكية" },
  { value: "Usufruct",        label: "حق انتفاع" },
  { value: "LongLease",       label: "إيجار طويل الأمد" },
  { value: "SharedOwnership", label: "ملكية مشتركة" },
  { value: "Cooperative",     label: "تعاوني" },
  { value: "Customary",       label: "عادي (عرفي)" },
  { value: "Waqf",            label: "وقف" },
  { value: "RegisteredDeed",  label: "سند مسجل" },
];

/** Formats a numeric price with currency suffix. */
export function formatPrice(price: number, currency = "SYP"): string {
  if (currency === "USD") {
    return "$" + price.toLocaleString("en");
  }
  return price.toLocaleString("en") + " ل.س";
}
