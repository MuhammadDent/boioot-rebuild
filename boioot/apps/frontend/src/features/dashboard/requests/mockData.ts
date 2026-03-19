import type { DashboardRequestItem, RequestResponse } from "@/types";

/**
 * Temporary dev mock data — replace with real API response when backend is ready.
 * Used as fallback when dashboardRequestsApi.getList() returns 0 items.
 * Structure matches DashboardRequestItem exactly.
 */
export const MOCK_REQUESTS: DashboardRequestItem[] = [
  {
    id: "mock-01",
    name: "أحمد خالد السعيد",
    phone: "0912345678",
    status: "New",
    propertyTitle: "شقة 3 غرف في المزة — دمشق",
    createdAt: daysAgo(1),
  },
  {
    id: "mock-02",
    name: "ليلى حسن نعمة",
    phone: "0933210987",
    status: "Contacted",
    propertyTitle: "شقة 2 غرف في السكوتلندي — دمشق",
    createdAt: daysAgo(2),
  },
  {
    id: "mock-03",
    name: "محمود إبراهيم جميل",
    phone: "0944001122",
    status: "New",
    propertyTitle: "فيلا 5 غرف في الشيخ سعد — دمشق",
    createdAt: daysAgo(2),
  },
  {
    id: "mock-04",
    name: "سوسن طه المصري",
    phone: "0955667788",
    status: "Qualified",
    propertyTitle: "مكتب تجاري في باب توما — دمشق",
    createdAt: daysAgo(4),
  },
  {
    id: "mock-05",
    name: "عمر نضال كيالي",
    phone: "0966778899",
    status: "Closed",
    propertyTitle: "شقة 4 غرف في الجميلية — حلب",
    createdAt: daysAgo(5),
  },
  {
    id: "mock-06",
    name: "رنا فيصل عبود",
    phone: "0977889900",
    status: "New",
    propertyTitle: "شقة 2 غرف في العزيزية — حلب",
    createdAt: daysAgo(5),
  },
  {
    id: "mock-07",
    name: "خالد سمير زيدان",
    phone: "0988990011",
    status: "Contacted",
    projectTitle: "مشروع أبراج النور — حمص",
    createdAt: daysAgo(6),
  },
  {
    id: "mock-08",
    name: "ديانا وائل حلبي",
    phone: "0999001122",
    status: "New",
    propertyTitle: "أرض سكنية في الإنشاءات — حمص",
    createdAt: daysAgo(7),
  },
  {
    id: "mock-09",
    name: "يوسف ماهر سلمان",
    phone: "0911223344",
    status: "Qualified",
    propertyTitle: "فيلا 6 غرف في كفرسوسة — دمشق",
    createdAt: daysAgo(8),
  },
  {
    id: "mock-10",
    name: "مريم أنس قدور",
    phone: "0922334455",
    status: "New",
    propertyTitle: "شقة 1 غرفة في الميدان — دمشق",
    createdAt: daysAgo(9),
  },
  {
    id: "mock-11",
    name: "فادي رائد عكاري",
    phone: "0933445566",
    status: "Closed",
    propertyTitle: "محل تجاري في الحريقة — دمشق",
    createdAt: daysAgo(10),
  },
  {
    id: "mock-12",
    name: "هند جهاد طرابيشي",
    phone: "0944556677",
    status: "Contacted",
    propertyTitle: "شقة 3 غرف في السليمانية — حلب",
    createdAt: daysAgo(11),
  },
  {
    id: "mock-13",
    name: "بسام عادل كبيبو",
    phone: "0955667700",
    status: "New",
    projectTitle: "مشروع سيتي ريزيدنس — دمشق",
    createdAt: daysAgo(12),
  },
  {
    id: "mock-14",
    name: "نجوى سعد الدين",
    phone: "0966770011",
    status: "Qualified",
    propertyTitle: "شقة 2 غرف في الغوطة — ريف دمشق",
    createdAt: daysAgo(13),
  },
  {
    id: "mock-15",
    name: "زياد وحيد منصور",
    phone: "0977881122",
    status: "New",
    propertyTitle: "مكتب في حي الصالحية — دمشق",
    createdAt: daysAgo(14),
  },
  {
    id: "mock-16",
    name: "إيمان حسام الدين",
    phone: "0988992233",
    status: "Contacted",
    propertyTitle: "فيلا 4 غرف في الهامة — ريف دمشق",
    createdAt: daysAgo(16),
  },
  {
    id: "mock-17",
    name: "وسام بكر الأتاسي",
    phone: "0999003344",
    status: "Closed",
    propertyTitle: "شقة 3 غرف في الزهراء — حمص",
    createdAt: daysAgo(18),
  },
  {
    id: "mock-18",
    name: "سلمى كمال يوسف",
    phone: "0911334455",
    status: "New",
    propertyTitle: "أرض زراعية في السفيرة — حلب",
    createdAt: daysAgo(19),
  },
  {
    id: "mock-19",
    name: "جهاد أسامة درويش",
    phone: "0922445566",
    status: "Qualified",
    projectTitle: "مشروع الواحة الخضراء — اللاذقية",
    createdAt: daysAgo(21),
  },
  {
    id: "mock-20",
    name: "منى عصام الحلبي",
    phone: "0933556677",
    status: "Contacted",
    propertyTitle: "شقة 2 غرف في الزيتون — اللاذقية",
    createdAt: daysAgo(22),
  },
  {
    id: "mock-21",
    name: "نادر ريان البيطار",
    phone: "0944667788",
    status: "New",
    propertyTitle: "شقة 3 غرف في العنصر — حلب",
    createdAt: daysAgo(24),
  },
  {
    id: "mock-22",
    name: "شيرين توفيق حداد",
    phone: "0955778899",
    status: "Closed",
    propertyTitle: "مكتب في شارع بغداد — دمشق",
    createdAt: daysAgo(25),
  },
  {
    id: "mock-23",
    name: "رامي علاء الدين",
    phone: "0966889900",
    status: "Contacted",
    propertyTitle: "فيلا 5 غرف في أبو رمانة — دمشق",
    createdAt: daysAgo(27),
  },
  {
    id: "mock-24",
    name: "تمارا شادي الخوري",
    phone: "0977990011",
    status: "New",
    propertyTitle: "شقة 4 غرف في قدسيا — ريف دمشق",
    createdAt: daysAgo(28),
  },
  {
    id: "mock-25",
    name: "ماجد ناصر البرازي",
    phone: "0988001122",
    status: "Qualified",
    propertyTitle: "شقة 2 غرف في الجميلية — حلب",
    createdAt: daysAgo(30),
  },
];

/**
 * Temporary dev mock data for Admin Requests page (/dashboard/admin/requests).
 * Uses RequestResponse shape (superset of DashboardRequestItem — adds updatedAt, email, message, companyName).
 * Used as fallback when adminApi.getRequests() returns 0 items.
 */
export const MOCK_ADMIN_REQUESTS: RequestResponse[] = MOCK_REQUESTS.map(r => ({
  ...r,
  updatedAt: r.createdAt,
  email: undefined,
  message: undefined,
  companyId: undefined,
  companyName: "بويوت العقارية",
}));

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
