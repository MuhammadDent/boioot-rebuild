import { api } from "@/lib/api";
import type { PagedResult, AdminUserResponse } from "@/types";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RbacRole {
  id: string;
  name: string;
  permissionCount: number;
  userCount: number;
  isSystem: boolean;
}

export interface RbacPermission {
  id: string;
  key: string;
  module: string;
}

export interface RolePermissionsResponse {
  roleId: string;
  roleName: string;
  permissions: string[];
}

// ── API client ─────────────────────────────────────────────────────────────────

export const rbacApi = {
  // Roles
  getRoles(): Promise<RbacRole[]> {
    return api.get("/admin/rbac/roles");
  },

  createRole(name: string): Promise<RbacRole> {
    return api.post("/admin/rbac/roles", { name });
  },

  renameRole(id: string, name: string): Promise<{ id: string; name: string }> {
    return api.put(`/admin/rbac/roles/${id}`, { name });
  },

  deleteRole(id: string): Promise<{ deleted: boolean }> {
    return api.delete(`/admin/rbac/roles/${id}`);
  },

  // Permissions
  getPermissions(): Promise<RbacPermission[]> {
    return api.get("/admin/rbac/permissions");
  },

  getRolePermissions(roleId: string): Promise<RolePermissionsResponse> {
    return api.get(`/admin/rbac/roles/${roleId}/permissions`);
  },

  setRolePermissions(roleId: string, permissionKeys: string[]): Promise<{ roleId: string; permissionCount: number }> {
    return api.post(`/admin/rbac/roles/${roleId}/permissions`, { permissionKeys });
  },

  // User → Role
  assignUserRole(userId: string, roleId: string): Promise<{ userId: string; roleId: string; roleName: string }> {
    return api.post(`/admin/rbac/users/${userId}/roles`, { roleId });
  },

  removeUserRoles(userId: string): Promise<{ userId: string; removed: number }> {
    return api.delete(`/admin/rbac/users/${userId}/roles`);
  },

  // Users (reuse existing admin endpoint for user search)
  getUsers(page: number, pageSize: number): Promise<PagedResult<AdminUserResponse>> {
    return api.get(`/admin/users?page=${page}&pageSize=${pageSize}`);
  },
};

// ── Permission module labels (Arabic) ─────────────────────────────────────────

export const MODULE_LABELS: Record<string, string> = {
  dashboard:  "لوحة التحكم",
  properties: "العقارات",
  projects:   "المشاريع",
  agents:     "الوكلاء",
  users:      "المستخدمون",
  staff:      "الموظفون",
  roles:      "الأدوار",
  companies:  "الشركات",
  requests:   "الطلبات",
  blog:       "المدونة",
  seo:        "السيو",
  marketing:  "التسويق",
  settings:   "الإعدادات",
  billing:    "الفواتير",
};

export const PERMISSION_LABEL: Record<string, string> = {
  "dashboard.view":       "عرض لوحة التحكم",
  "properties.view":      "عرض العقارات",
  "properties.create":    "إضافة عقار",
  "properties.edit":      "تعديل عقار",
  "properties.delete":    "حذف عقار",
  "projects.view":        "عرض المشاريع",
  "projects.create":      "إضافة مشروع",
  "projects.edit":        "تعديل مشروع",
  "projects.delete":      "حذف مشروع",
  "agents.view":          "عرض الوكلاء",
  "agents.manage":        "إدارة الوكلاء",
  "users.view":           "عرض المستخدمين",
  "users.edit":           "تعديل المستخدمين",
  "users.disable":        "تعطيل المستخدمين",
  "staff.view":           "عرض الموظفين",
  "staff.create":         "إضافة موظف",
  "staff.edit":           "تعديل موظف",
  "staff.disable":        "تعطيل موظف",
  "roles.view":           "عرض الأدوار",
  "roles.manage":         "إدارة الأدوار والصلاحيات",
  "companies.view":       "عرض الشركات",
  "companies.edit":       "تعديل الشركات",
  "requests.view":        "عرض الطلبات",
  "requests.create":      "إنشاء طلب",
  "requests.assign":      "تعيين الطلبات",
  "requests.edit":        "تعديل الطلبات",
  "blog.view":            "عرض المدونة",
  "blog.create":          "كتابة مقال",
  "blog.edit":            "تعديل مقال",
  "blog.publish":         "نشر مقال",
  "blog.delete":          "حذف مقال",
  "blog.seo.manage":      "إعدادات سيو المدونة",
  "seo.settings.manage":  "إعدادات السيو العام",
  "marketing.view":       "عرض التسويق",
  "marketing.manage":     "إدارة التسويق",
  "settings.view":        "عرض الإعدادات",
  "settings.manage":      "تعديل الإعدادات",
  "billing.view":         "عرض الفواتير",
  "billing.manage":       "إدارة الفواتير",
};

export const PERMISSION_DESC: Record<string, string> = {
  "dashboard.view":       "الوصول إلى الصفحة الرئيسية للوحة التحكم والإحصاءات العامة",
  "properties.view":      "تصفّح قائمة العقارات وعرض تفاصيلها",
  "properties.create":    "رفع عقارات جديدة مع الصور والتفاصيل",
  "properties.edit":      "تعديل بيانات العقارات الموجودة",
  "properties.delete":    "حذف عقار نهائياً من قاعدة البيانات",
  "projects.view":        "تصفح المشاريع العقارية وعرض تفاصيلها",
  "projects.create":      "إنشاء مشاريع عقارية جديدة",
  "projects.edit":        "تعديل بيانات المشاريع القائمة",
  "projects.delete":      "حذف مشروع نهائياً",
  "agents.view":          "عرض قائمة الوكلاء العقاريين",
  "agents.manage":        "إضافة وكلاء وتعديل بياناتهم وإدارة أدوارهم",
  "users.view":           "استعراض قائمة المستخدمين المسجّلين",
  "users.edit":           "تعديل بيانات المستخدمين كالاسم والبريد",
  "users.disable":        "تعليق حسابات المستخدمين أو إعادة تفعيلها",
  "staff.view":           "استعراض قائمة الموظفين الداخليين",
  "staff.create":         "إضافة حسابات موظفين جدد",
  "staff.edit":           "تعديل بيانات الموظفين الحاليين",
  "staff.disable":        "تعليق حسابات الموظفين أو إعادة تفعيلها",
  "roles.view":           "استعراض الأدوار وصلاحياتها",
  "roles.manage":         "إنشاء وتعديل وحذف الأدوار وتوزيع الصلاحيات",
  "companies.view":       "استعراض الشركات العقارية المسجّلة",
  "companies.edit":       "تعديل بيانات الشركات والتحقق منها",
  "requests.view":        "استعراض طلبات العملاء",
  "requests.create":      "إنشاء طلبات جديدة بالنيابة عن العملاء",
  "requests.assign":      "تعيين الطلبات للوكلاء والموظفين المختصين",
  "requests.edit":        "تعديل حالة الطلبات وبياناتها",
  "blog.view":            "استعراض مقالات المدونة",
  "blog.create":          "كتابة وحفظ مقالات جديدة كمسوّدة",
  "blog.edit":            "تعديل المقالات المنشورة أو المسوّدات",
  "blog.publish":         "نشر المقالات وإتاحتها للعموم",
  "blog.delete":          "حذف المقالات نهائياً",
  "blog.seo.manage":      "تحرير العنوان والوصف وبيانات OG لمقالات المدونة",
  "seo.settings.manage":  "ضبط إعدادات السيو العامة لكامل الموقع",
  "marketing.view":       "استعراض حملات التسويق والأداء",
  "marketing.manage":     "إدارة الحملات الإعلانية والمحتوى التسويقي",
  "settings.view":        "استعراض إعدادات النظام",
  "settings.manage":      "تعديل الإعدادات العامة للمنصة",
  "billing.view":         "استعراض الفواتير والاشتراكات",
  "billing.manage":       "إدارة الفواتير وخطط الاشتراك والمدفوعات",
};
