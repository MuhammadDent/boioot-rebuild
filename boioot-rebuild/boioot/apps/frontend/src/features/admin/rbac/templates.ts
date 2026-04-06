// ─── Role Templates ───────────────────────────────────────────────────────────
// Static definitions. No DB needed. Applied on role creation via setRolePermissions.

export interface RoleTemplate {
  id: string;
  name: string;
  suggestedRoleName: string;
  description: string;
  permissions: string[];
  color: string;
  bg: string;
  border: string;
  iconPath: string;
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "empty",
    name: "دور فارغ",
    suggestedRoleName: "",
    description: "ابدأ من الصفر وأضف الصلاحيات يدوياً من صفحة تفاصيل الدور",
    permissions: [],
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
    iconPath: "M12 5v14M5 12h14",
  },
  {
    id: "customer-support",
    name: "دعم العملاء",
    suggestedRoleName: "CustomerSupportAgent",
    description: "متابعة الطلبات والرد على المستخدمين وتعيين الحالات للفريق",
    permissions: [
      "dashboard.view",
      "requests.view",
      "requests.assign",
      "requests.edit",
      "requests.create",
      "users.view",
      "properties.view",
    ],
    color: "#0369a1",
    bg: "#eff6ff",
    border: "#bfdbfe",
    iconPath: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
  {
    id: "marketing-manager",
    name: "مدير التسويق",
    suggestedRoleName: "MarketingManager",
    description: "إدارة الحملات التسويقية والمحتوى وتحليلات الأداء",
    permissions: [
      "dashboard.view",
      "marketing.view",
      "marketing.manage",
      "blog.view",
      "blog.create",
      "blog.edit",
      "blog.publish",
      "seo.settings.manage",
      "blog.seo.manage",
      "properties.view",
    ],
    color: "#0f766e",
    bg: "#f0fdfa",
    border: "#99f6e4",
    iconPath: "M22 12h-4l-3 9L9 3l-3 9H2",
  },
  {
    id: "content-editor",
    name: "محرر المحتوى",
    suggestedRoleName: "ContentEditor",
    description: "كتابة وتعديل المقالات والمحتوى الرقمي دون صلاحيات النشر",
    permissions: [
      "dashboard.view",
      "blog.view",
      "blog.create",
      "blog.edit",
      "blog.seo.manage",
      "properties.view",
    ],
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    iconPath: "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
  },
  {
    id: "seo-specialist",
    name: "أخصائي السيو",
    suggestedRoleName: "SeoSpecialist",
    description: "إدارة إعدادات محركات البحث وتحسين ظهور المحتوى",
    permissions: [
      "dashboard.view",
      "seo.settings.manage",
      "blog.view",
      "blog.edit",
      "blog.seo.manage",
      "properties.view",
    ],
    color: "#ea580c",
    bg: "#fff7ed",
    border: "#fed7aa",
    iconPath: "M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0zM10 7v3m0 0v3m0-3h3m-3 0H7",
  },
  {
    id: "sales-agent",
    name: "وكيل مبيعات",
    suggestedRoleName: "SalesAgent",
    description: "إدارة العقارات والمشاريع ومتابعة طلبات العملاء",
    permissions: [
      "dashboard.view",
      "properties.view",
      "properties.create",
      "properties.edit",
      "projects.view",
      "projects.create",
      "projects.edit",
      "requests.view",
      "requests.create",
      "requests.edit",
      "agents.view",
    ],
    color: "#ca8a04",
    bg: "#fefce8",
    border: "#fde68a",
    iconPath: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  },
];
