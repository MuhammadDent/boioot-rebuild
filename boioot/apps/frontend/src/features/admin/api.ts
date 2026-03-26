import { api } from "@/lib/api";
import type {
  PagedResult,
  AdminUserResponse,
  AdminUserProfileResponse,
  AdminAgentResponse,
  AdminBrokerResponse,
  AdminCompanyResponse,
  PropertyResponse,
  ProjectResponse,
  RequestResponse,
  ListingTypeConfig,
  PropertyTypeConfig,
  OwnershipTypeConfig,
  AdminPlanSummary,
  AdminPlanDetail,
  AdminPlanPricingEntry,
  PlanLimitItem,
  PlanFeatureItem,
  AdminInvoiceResponse,
} from "@/types";

// ── Filter param types ─────────────────────────────────────────────────────────

export interface AdminUsersParams {
  /** Admin | CompanyOwner | Agent | User — empty string means "all" */
  role?: string;
  isActive?: boolean;
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
  lastLoginAfter?: string;
  tag?: string;
}

export interface AdminCompaniesParams {
  city?: string;
  isVerified?: boolean;
}

export interface AdminPropertiesParams {
  /** Available | Inactive | Sold | Rented — empty string means "all" */
  status?: string;
  city?: string;
}

export interface AdminProjectsParams {
  /** Upcoming | UnderConstruction | Completed — empty string means "all" */
  status?: string;
  city?: string;
}

export interface AdminRequestsParams {
  /** New | Contacted | Qualified | Closed — empty string means "all" */
  status?: string;
}

export interface UpsertListingTypePayload {
  value: string;
  label: string;
  order: number;
  isActive: boolean;
}

export interface UpsertPropertyTypePayload {
  value: string;
  label: string;
  icon: string;
  order: number;
  isActive: boolean;
}

export interface UpsertOwnershipTypePayload {
  value: string;
  label: string;
  order: number;
  isActive: boolean;
}

// ── Admin API service ──────────────────────────────────────────────────────────

export const adminApi = {
  getUsers(
    page: number,
    pageSize: number,
    params: AdminUsersParams = {},
  ): Promise<PagedResult<AdminUserResponse>> {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (params.role)                     qs.set("role", params.role);
    if (params.isActive !== undefined)   qs.set("isActive", String(params.isActive));
    if (params.search)                   qs.set("search", params.search);
    if (params.createdAfter)             qs.set("createdAfter", params.createdAfter);
    if (params.createdBefore)            qs.set("createdBefore", params.createdBefore);
    if (params.lastLoginAfter)           qs.set("lastLoginAfter", params.lastLoginAfter);
    if (params.tag)                      qs.set("tag", params.tag);
    return api.get(`/admin/users?${qs}`);
  },

  getUserAnalytics(): Promise<import("@/types").UserAnalyticsResponse> {
    return api.get("/admin/users/analytics");
  },

  bulkUserAction(
    action: "activate" | "deactivate" | "export",
    userIds: string[],
  ): Promise<{ affected: number; message: string; exportData?: AdminUserResponse[] }> {
    return api.post("/admin/users/bulk", { action, userIds });
  },

  getUserTags(userId: string): Promise<{ tag: string; createdAt: string }[]> {
    return api.get(`/admin/users/${userId}/tags`);
  },

  addUserTag(userId: string, tag: string): Promise<{ tag: string; createdAt: string }> {
    return api.post(`/admin/users/${userId}/tags`, { tag });
  },

  removeUserTag(userId: string, tag: string): Promise<void> {
    return api.delete(`/admin/users/${userId}/tags/${encodeURIComponent(tag)}`);
  },

  getAllTags(): Promise<string[]> {
    return api.get("/admin/users/tags");
  },

  getAdminUser(userId: string): Promise<AdminUserResponse> {
    return api.get(`/admin/users/${userId}`);
  },

  getAdminUserProfile(userId: string): Promise<AdminUserProfileResponse> {
    return api.get(`/admin/users/${userId}/profile`);
  },

  updateAdminUser(userId: string, data: { fullName?: string; phone?: string }): Promise<AdminUserResponse> {
    return api.put(`/admin/users/${userId}`, data);
  },

  getCompanies(
    page: number,
    pageSize: number,
    params: AdminCompaniesParams = {},
  ): Promise<PagedResult<AdminCompanyResponse>> {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (params.city)                      qs.set("city", params.city);
    if (params.isVerified !== undefined)  qs.set("isVerified", String(params.isVerified));
    return api.get(`/admin/companies?${qs}`);
  },

  getProperties(
    page: number,
    pageSize: number,
    params: AdminPropertiesParams = {},
  ): Promise<PagedResult<PropertyResponse>> {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (params.status) qs.set("status", params.status);
    if (params.city)   qs.set("city", params.city);
    return api.get(`/admin/properties?${qs}`);
  },

  /** DELETE /api/properties/{id} — AdminOrCompanyOwner policy */
  deleteProperty(id: string): Promise<void> {
    return api.delete(`/properties/${id}`);
  },

  /** PATCH /api/admin/properties/{id}/status */
  updatePropertyStatus(id: string, status: string): Promise<void> {
    return api.patch(`/admin/properties/${id}/status`, { status });
  },

  getProjects(
    page: number,
    pageSize: number,
    params: AdminProjectsParams = {},
  ): Promise<PagedResult<ProjectResponse>> {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (params.status) qs.set("status", params.status);
    if (params.city)   qs.set("city", params.city);
    return api.get(`/admin/projects?${qs}`);
  },

  getRequests(
    page: number,
    pageSize: number,
    params: AdminRequestsParams = {},
  ): Promise<PagedResult<RequestResponse>> {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (params.status) qs.set("status", params.status);
    return api.get(`/admin/requests?${qs}`);
  },

  /** POST /api/admin/users — admin creates a user directly */
  createUser(payload: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    role?: string;
  }): Promise<AdminUserResponse> {
    return api.post("/admin/users", payload);
  },

  /** PATCH /api/admin/users/{userId}/status */
  updateUserStatus(userId: string, isActive: boolean): Promise<AdminUserResponse> {
    return api.patch(`/admin/users/${userId}/status`, { isActive });
  },

  /** PATCH /api/admin/users/{userId}/role */
  updateUserRole(userId: string, role: string): Promise<AdminUserResponse> {
    return api.patch(`/admin/users/${userId}/role`, { role });
  },

  // ── Admin Agents ────────────────────────────────────────────────────────────

  /** GET /api/admin/agents */
  getAdminAgents(
    page: number,
    pageSize: number,
    params: { companyId?: string; isActive?: boolean } = {},
  ): Promise<PagedResult<AdminAgentResponse>> {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (params.companyId)            qs.set("companyId", params.companyId);
    if (params.isActive !== undefined) qs.set("isActive", String(params.isActive));
    return api.get(`/admin/agents?${qs}`);
  },

  /** POST /api/admin/agents */
  createAdminAgent(payload: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    bio?: string;
    companyId?: string;
  }): Promise<AdminAgentResponse> {
    return api.post("/admin/agents", payload);
  },

  /** PUT /api/admin/agents/{userId} */
  updateAdminAgent(userId: string, payload: {
    fullName: string;
    phone?: string;
    bio?: string;
    companyId?: string;
  }): Promise<AdminAgentResponse> {
    return api.put(`/admin/agents/${userId}`, payload);
  },

  // ── Admin Brokers ───────────────────────────────────────────────────────────

  /** GET /api/admin/brokers/{userId} */
  getAdminBroker(userId: string): Promise<AdminBrokerResponse> {
    return api.get(`/admin/brokers/${userId}`);
  },

  /** GET /api/admin/brokers */
  getAdminBrokers(
    page: number,
    pageSize: number,
    params: { isActive?: boolean } = {},
  ): Promise<PagedResult<AdminBrokerResponse>> {
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (params.isActive !== undefined) qs.set("isActive", String(params.isActive));
    return api.get(`/admin/brokers?${qs}`);
  },

  /** POST /api/admin/brokers */
  createAdminBroker(payload: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    profileImageUrl?: string;
  }): Promise<AdminBrokerResponse> {
    return api.post("/admin/brokers", payload);
  },

  /** PUT /api/admin/brokers/{userId} */
  updateAdminBroker(userId: string, payload: {
    fullName: string;
    phone?: string;
    profileImageUrl?: string;
  }): Promise<AdminBrokerResponse> {
    return api.put(`/admin/brokers/${userId}`, payload);
  },

  /** PATCH /api/admin/users/{userId}/profile-image */
  updateUserProfileImage(userId: string, profileImageUrl: string): Promise<AdminUserResponse> {
    return api.patch(`/admin/users/${userId}/profile-image`, { profileImageUrl });
  },

  /** POST /api/upload/image — returns { url: string } */
  uploadImage(file: File): Promise<{ url: string }> {
    const form = new FormData();
    form.append("file", file);
    return api.postForm("/upload/image", form);
  },

  /** POST /api/admin/companies */
  createCompany(payload: {
    name: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    logoUrl?: string;
  }): Promise<AdminCompanyResponse> {
    return api.post("/admin/companies", payload);
  },

  /** PUT /api/admin/companies/{id} */
  updateCompany(id: string, payload: {
    name: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    logoUrl?: string;
  }): Promise<AdminCompanyResponse> {
    return api.put(`/admin/companies/${id}`, payload);
  },

  /** PATCH /api/admin/companies/{companyId}/verify */
  verifyCompany(companyId: string, isVerified: boolean): Promise<AdminCompanyResponse> {
    return api.patch(`/admin/companies/${companyId}/verify`, { isVerified });
  },

  // ── Listing Types ─────────────────────────────────────────────────────────

  /** GET /api/admin/listing-types — all types (admin view, includes inactive) */
  getListingTypes(): Promise<ListingTypeConfig[]> {
    return api.get("/admin/listing-types");
  },

  /** POST /api/admin/listing-types */
  createListingType(payload: UpsertListingTypePayload): Promise<ListingTypeConfig> {
    return api.post("/admin/listing-types", payload);
  },

  /** PUT /api/admin/listing-types/{id} */
  updateListingType(id: string, payload: UpsertListingTypePayload): Promise<ListingTypeConfig> {
    return api.put(`/admin/listing-types/${id}`, payload);
  },

  /** DELETE /api/admin/listing-types/{id} */
  deleteListingType(id: string): Promise<void> {
    return api.delete(`/admin/listing-types/${id}`);
  },

  // ── Property Types ────────────────────────────────────────────────────────

  getPropertyTypes(): Promise<PropertyTypeConfig[]> {
    return api.get("/admin/property-types");
  },
  createPropertyType(payload: UpsertPropertyTypePayload): Promise<PropertyTypeConfig> {
    return api.post("/admin/property-types", payload);
  },
  updatePropertyType(id: string, payload: UpsertPropertyTypePayload): Promise<PropertyTypeConfig> {
    return api.put(`/admin/property-types/${id}`, payload);
  },
  deletePropertyType(id: string): Promise<void> {
    return api.delete(`/admin/property-types/${id}`);
  },

  // ── Ownership Types ───────────────────────────────────────────────────────

  getOwnershipTypes(): Promise<OwnershipTypeConfig[]> {
    return api.get("/admin/ownership-types");
  },
  createOwnershipType(payload: UpsertOwnershipTypePayload): Promise<OwnershipTypeConfig> {
    return api.post("/admin/ownership-types", payload);
  },
  updateOwnershipType(id: string, payload: UpsertOwnershipTypePayload): Promise<OwnershipTypeConfig> {
    return api.put(`/admin/ownership-types/${id}`, payload);
  },
  deleteOwnershipType(id: string): Promise<void> {
    return api.delete(`/admin/ownership-types/${id}`);
  },

  // ── Plans ─────────────────────────────────────────────────────────────────

  /** GET /api/admin/plans */
  getPlans(): Promise<AdminPlanSummary[]> {
    return api.get("/admin/plans");
  },

  /** GET /api/admin/plans/{id} */
  getPlanDetail(id: string): Promise<AdminPlanDetail> {
    return api.get(`/admin/plans/${id}`);
  },

  /** POST /api/admin/plans */
  createPlan(payload: {
    name: string;
    displayNameAr?: string;
    displayNameEn?: string;
    audienceType?: string;
    tier?: string;
    description?: string;
    basePriceMonthly: number;
    basePriceYearly: number;
    applicableAccountType?: string;
    planCategory?: string;
    billingMode?: string;
    displayOrder?: number;
    badgeText?: string;
    planColor?: string;
    hasTrial?: boolean;
    trialDays?: number;
    requiresPaymentForTrial?: boolean;
    isDefaultForNewUsers?: boolean;
    availableForSelfSignup?: boolean;
    requiresAdminApproval?: boolean;
    allowAddOns?: boolean;
    allowUpgrade?: boolean;
    allowDowngrade?: boolean;
    autoDowngradeOnExpiry?: boolean;
  }): Promise<AdminPlanDetail> {
    return api.post("/admin/plans", payload);
  },

  /** PUT /api/admin/plans/{id} */
  updatePlan(id: string, payload: {
    name: string;
    displayNameAr?: string;
    displayNameEn?: string;
    audienceType?: string;
    tier?: string;
    description?: string;
    basePriceMonthly: number;
    basePriceYearly: number;
    isActive: boolean;
    applicableAccountType?: string;
    displayOrder: number;
    isPublic: boolean;
    isRecommended: boolean;
    planCategory?: string;
    billingMode: string;
    badgeText?: string;
    planColor?: string;
    hasTrial?: boolean;
    trialDays?: number;
    requiresPaymentForTrial?: boolean;
    isDefaultForNewUsers?: boolean;
    availableForSelfSignup?: boolean;
    requiresAdminApproval?: boolean;
    allowAddOns?: boolean;
    allowUpgrade?: boolean;
    allowDowngrade?: boolean;
    autoDowngradeOnExpiry?: boolean;
  }): Promise<AdminPlanDetail> {
    return api.put(`/admin/plans/${id}`, payload);
  },

  /** DELETE /api/admin/plans/{id} — soft archive */
  deletePlan(id: string): Promise<void> {
    return api.delete(`/admin/plans/${id}`);
  },

  /** POST /api/admin/plans/{id}/duplicate */
  duplicatePlan(id: string): Promise<AdminPlanDetail> {
    return api.post(`/admin/plans/${id}/duplicate`, {});
  },

  /** PUT /api/admin/plans/{id}/limits/{limitKey} */
  setPlanLimit(id: string, limitKey: string, value: number): Promise<PlanLimitItem> {
    return api.put(`/admin/plans/${id}/limits/${limitKey}`, { value });
  },

  /** PUT /api/admin/plans/{id}/features/{featureKey} */
  setPlanFeature(id: string, featureKey: string, isEnabled: boolean): Promise<PlanFeatureItem> {
    return api.put(`/admin/plans/${id}/features/${featureKey}`, { isEnabled });
  },

  // ── Plan Pricing ──────────────────────────────────────────────────────────

  /** GET /api/admin/plans/{planId}/pricing */
  getPlanPricing(planId: string): Promise<AdminPlanPricingEntry[]> {
    return api.get(`/admin/plans/${planId}/pricing`);
  },

  /** POST /api/admin/plans/{planId}/pricing */
  createPlanPricing(planId: string, payload: {
    billingCycle: string;
    priceAmount: number;
    currencyCode: string;
    isActive: boolean;
    isPublic: boolean;
    externalProvider?: string;
    externalPriceId?: string;
  }): Promise<AdminPlanPricingEntry> {
    return api.post(`/admin/plans/${planId}/pricing`, payload);
  },

  /** PUT /api/admin/plans/{planId}/pricing/{pricingId} */
  updatePlanPricing(planId: string, pricingId: string, payload: {
    billingCycle: string;
    priceAmount: number;
    currencyCode: string;
    isActive: boolean;
    isPublic: boolean;
    externalProvider?: string;
    externalPriceId?: string;
  }): Promise<AdminPlanPricingEntry> {
    return api.put(`/admin/plans/${planId}/pricing/${pricingId}`, payload);
  },

  /** DELETE /api/admin/plans/{planId}/pricing/{pricingId} */
  deletePlanPricing(planId: string, pricingId: string): Promise<void> {
    return api.delete(`/admin/plans/${planId}/pricing/${pricingId}`);
  },

  // ── Billing ──────────────────────────────────────────────────────────────

  /** GET /api/admin/billing/invoices?status=... */
  getInvoices(status?: string): Promise<AdminInvoiceResponse[]> {
    const qs = status ? `?status=${status}` : "";
    return api.get(`/admin/billing/invoices${qs}`);
  },

  /** POST /api/admin/billing/invoices/{id}/confirm */
  confirmInvoice(invoiceId: string, note?: string): Promise<AdminInvoiceResponse> {
    return api.post(`/admin/billing/invoices/${invoiceId}/confirm`, { note: note || null });
  },

  /** POST /api/admin/billing/invoices/{id}/reject */
  rejectInvoice(invoiceId: string, note?: string): Promise<AdminInvoiceResponse> {
    return api.post(`/admin/billing/invoices/${invoiceId}/reject`, { note: note || null });
  },

  // ── Subscription Payment Requests ─────────────────────────────────────────

  /** GET /api/admin/payment-requests — paginated + filtered */
  getPaymentRequests(params: {
    status?: string;
    paymentMethod?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<import("@/types").PagedResult<import("@/features/subscriptionPayments/types").PaymentRequestResponse>> {
    const qs = new URLSearchParams();
    if (params.status)        qs.set("status", params.status);
    if (params.paymentMethod) qs.set("paymentMethod", params.paymentMethod);
    if (params.fromDate)      qs.set("fromDate", params.fromDate);
    if (params.toDate)        qs.set("toDate", params.toDate);
    qs.set("page",     String(params.page     ?? 1));
    qs.set("pageSize", String(params.pageSize ?? 30));
    return api.get(`/admin/payment-requests?${qs}`);
  },

  /** GET /api/admin/payment-requests/{id} */
  getPaymentRequest(id: string): Promise<import("@/features/subscriptionPayments/types").PaymentRequestResponse> {
    return api.get(`/admin/payment-requests/${id}`);
  },

  /** POST /api/admin/payment-requests/{id}/under-review */
  paymentMarkUnderReview(id: string): Promise<import("@/features/subscriptionPayments/types").PaymentRequestResponse> {
    return api.post(`/admin/payment-requests/${id}/under-review`, {});
  },

  /** POST /api/admin/payment-requests/{id}/approve */
  paymentApprove(id: string, note?: string): Promise<import("@/features/subscriptionPayments/types").PaymentRequestResponse> {
    return api.post(`/admin/payment-requests/${id}/approve`, { note: note || null });
  },

  /** POST /api/admin/payment-requests/{id}/reject  — note is required */
  paymentReject(id: string, note: string): Promise<import("@/features/subscriptionPayments/types").PaymentRequestResponse> {
    return api.post(`/admin/payment-requests/${id}/reject`, { note });
  },

  /** POST /api/admin/payment-requests/{id}/cancel */
  paymentAdminCancel(id: string, note?: string): Promise<import("@/features/subscriptionPayments/types").PaymentRequestResponse> {
    return api.post(`/admin/payment-requests/${id}/cancel`, { note: note || null });
  },

  /** POST /api/admin/payment-requests/{id}/activate */
  paymentActivate(id: string): Promise<import("@/features/subscriptionPayments/types").PaymentRequestResponse> {
    return api.post(`/admin/payment-requests/${id}/activate`, {});
  },

  // ── Plan Matrix ──────────────────────────────────────────────────────────

  /** GET /api/admin/plan-catalog/matrix — full plan × feature matrix */
  getPlanMatrix(): Promise<import("@/types").PlanMatrixData> {
    return api.get("/admin/plan-catalog/matrix");
  },

  // ── Plan Catalog — Feature Definitions ─────────────────────────────────────

  /** GET /api/admin/plan-catalog/features */
  getCatalogFeatures(): Promise<import("@/types").FeatureDefinitionEntry[]> {
    return api.get("/admin/plan-catalog/features");
  },

  /** POST /api/admin/plan-catalog/features */
  createCatalogFeature(
    payload: import("@/types").CreateFeatureDefinitionPayload
  ): Promise<import("@/types").FeatureDefinitionEntry> {
    return api.post("/admin/plan-catalog/features", payload);
  },

  /** PUT /api/admin/plan-catalog/features/{id} */
  updateCatalogFeature(
    id: string,
    payload: import("@/types").UpdateFeatureDefinitionPayload
  ): Promise<import("@/types").FeatureDefinitionEntry> {
    return api.put(`/admin/plan-catalog/features/${id}`, payload);
  },

  /** DELETE /api/admin/plan-catalog/features/{id} */
  deleteCatalogFeature(id: string): Promise<void> {
    return api.delete(`/admin/plan-catalog/features/${id}`);
  },

  // ── Plan Catalog — Limit Definitions ───────────────────────────────────────

  /** GET /api/admin/plan-catalog/limits */
  getCatalogLimits(): Promise<import("@/types").LimitDefinitionEntry[]> {
    return api.get("/admin/plan-catalog/limits");
  },

  /** POST /api/admin/plan-catalog/limits */
  createCatalogLimit(
    payload: import("@/types").CreateLimitDefinitionPayload
  ): Promise<import("@/types").LimitDefinitionEntry> {
    return api.post("/admin/plan-catalog/limits", payload);
  },

  /** PUT /api/admin/plan-catalog/limits/{id} */
  updateCatalogLimit(
    id: string,
    payload: import("@/types").UpdateLimitDefinitionPayload
  ): Promise<import("@/types").LimitDefinitionEntry> {
    return api.put(`/admin/plan-catalog/limits/${id}`, payload);
  },

  /** DELETE /api/admin/plan-catalog/limits/{id} */
  deleteCatalogLimit(id: string): Promise<void> {
    return api.delete(`/admin/plan-catalog/limits/${id}`);
  },
};
