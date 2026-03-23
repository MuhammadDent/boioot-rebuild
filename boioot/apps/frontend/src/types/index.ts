export interface BusinessProfileResponse {
  companyId: string;
  displayName: string;
  province?: string;
  city?: string;
  neighborhood?: string;
  address?: string;
  phone?: string;
  whatsApp?: string;
  description?: string;
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
  isProfileComplete: boolean;
  isVerified: boolean;
}

export interface UserProfileResponse {
  id: string;
  userCode: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  profileImageUrl?: string;
  createdAt: string;
  /** Permissions granted by the backend based on the user's role. */
  permissions: string[];
}

export interface FavoriteResponse {
  favoriteId: string;
  propertyId: string;
  title: string;
  price: number;
  currency: string;
  city: string;
  province?: string;
  neighborhood?: string;
  listingType: string;
  type: string;
  thumbnailUrl?: string;
  bedrooms?: number;
  area: number;
  addedAt: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresAt: string;
  user: UserProfileResponse;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ProjectImageResponse {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  order: number;
}

export interface ProjectResponse {
  id: string;
  title: string;
  description?: string;
  /** Serialized enum name: Upcoming | UnderConstruction | Completed */
  status: string;
  province?: string;
  city: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  startingPrice?: number;
  deliveryDate?: string;
  isPublished: boolean;
  companyId: string;
  companyName: string;
  images: ProjectImageResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertyImageResponse {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  order: number;
}

export interface PropertyResponse {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  area: number;
  type: string;
  listingType: string;
  status: string;
  province?: string;
  city: string;
  neighborhood?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  hallsCount?: number;
  companyId: string;
  companyName: string;
  agentId?: string;
  ownerId?: string;
  isPersonalListing?: boolean;
  // Payment
  paymentType?: string;
  installmentsCount?: number;
  hasCommission?: boolean;
  commissionType?: string;
  commissionValue?: number;
  // Characteristics
  ownershipType?: string;
  floor?: string;
  propertyAge?: number;
  features?: string[];
  // Media
  videoUrl?: string;
  images: PropertyImageResponse[];
  createdAt: string;
  updatedAt: string;
  // Company branding (always set when company data loaded)
  companyLogoUrl?: string;
  // Advertiser
  ownerName?: string;
  ownerPhone?: string;
  ownerPhoto?: string;
  // Resolved chat recipient user ID (backfill: OwnerId → Agent.UserId → company agent)
  recipientId?: string;
  // Analytics
  viewCount?: number;
}

export interface ListingTypeConfig {
  id: string;
  value: string;
  label: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyTypeConfig {
  id: string;
  value: string;
  label: string;
  icon: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OwnershipTypeConfig {
  id: string;
  value: string;
  label: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardPropertyItem {
  id: string;
  title: string;
  /** Available | Inactive | Sold | Rented */
  status: string;
  /** Apartment | Villa | Office | Shop | Land | Building */
  type: string;
  listingType: string;
  price: number;
  currency: string;
  city: string;
  createdAt: string;
}

export interface DashboardProjectItem {
  id: string;
  title: string;
  /** Upcoming | UnderConstruction | Completed */
  status: string;
  city: string;
  startingPrice?: number;
  isPublished: boolean;
  createdAt: string;
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  province?: string;
  city: string;
  address?: string;
  startingPrice?: number;
  /** ISO date string e.g. "2026-12-31" */
  deliveryDate?: string;
  /** Upcoming | UnderConstruction | Completed */
  status: string;
  isPublished: boolean;
  companyId: string;
}

export interface UpdateProjectRequest {
  title: string;
  description?: string;
  province?: string;
  city: string;
  address?: string;
  startingPrice?: number;
  /** ISO date string e.g. "2026-12-31" */
  deliveryDate?: string;
  /** Upcoming | UnderConstruction | Completed */
  status: string;
  isPublished: boolean;
}

export interface CreatePropertyRequest {
  title: string;
  description?: string;
  /** Apartment | Villa | Office | Shop | Land | Building */
  type: string;
  listingType: string;
  price: number;
  currency: string;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  hallsCount?: number;
  neighborhood?: string;
  address?: string;
  province?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  companyId?: string;
  agentId?: string;
  // Payment
  paymentType?: string;
  installmentsCount?: number;
  hasCommission?: boolean;
  commissionType?: string;
  commissionValue?: number;
  // Characteristics
  ownershipType?: string;
  floor?: string;
  propertyAge?: number;
  features?: string[];
  // Media
  images?: string[];
  videoUrl?: string;
}

export interface UpdatePropertyRequest {
  title: string;
  description?: string;
  type: string;
  listingType: string;
  /** Available | Inactive | Sold | Rented */
  status: string;
  price: number;
  currency: string;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  neighborhood?: string;
  address?: string;
  province?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  agentId?: string;
  features?: string[];
  /** IDs of existing images to delete. null = don't change images. */
  removedImageIds?: string[];
  /** New base64 images to append. null = don't add images. */
  newImages?: string[];
  videoUrl?: string;
}

export interface SubmitRequestPayload {
  name: string;
  phone: string;
  email?: string;
  message?: string;
  /** UUID — set when the inquiry is about a specific property */
  propertyId?: string;
  /** UUID — set when the inquiry is about a specific project */
  projectId?: string;
}

export interface DashboardRequestItem {
  id: string;
  name: string;
  phone: string;
  /** New | Contacted | Qualified | Closed */
  status: string;
  propertyTitle?: string;
  projectTitle?: string;
  createdAt: string;
}

// ─── Messaging ────────────────────────────────────────────────────────────────

export interface ConversationSummary {
  id: string;
  otherUserId: string;
  otherUserName: string;
  /** ISO string — undefined when no messages yet */
  lastMessageAt?: string;
  unreadCount: number;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectTitle?: string;
  createdAt: string;
}

export interface MessageItem {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  /** True when the authenticated user is the sender */
  isOwnMessage: boolean;
  createdAt: string;
  /** Optional file attachment stored as base64 data URL */
  attachmentData?: string;
  attachmentName?: string;
}

export interface ConversationDetail {
  id: string;
  otherUserId: string;
  otherUserName: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectTitle?: string;
  /** Messages sorted oldest-first; page 1 = oldest batch */
  messages: PagedResult<MessageItem>;
  createdAt: string;
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export interface RequestResponse {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  /** New | Contacted | Qualified | Closed */
  status: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectTitle?: string;
  companyId?: string;
  companyName?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminUserResponse {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  profileImageUrl?: string;
  /** Admin | CompanyOwner | Agent | User */
  role: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserProfileResponse {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  profileImageUrl?: string;
  role: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  propertyCount: number;
  requestCount: number;
  city?: string;
  hasActiveSubscription: boolean;
  planName?: string;
  planListingLimit: number;
  usedListings: number;
  remainingListings: number;
  subscriptionStatus?: string;
  subscriptionEndDate?: string;
}

export interface AdminBrokerResponse {
  id: string;
  userCode: string;
  fullName: string;
  email: string;
  phone?: string;
  profileImageUrl?: string;
  agentCount: number;
  propertyCount: number;
  dealsCount: number;
  averageRating?: number;
  reviewCount: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAgentResponse {
  id: string;
  userCode: string;
  fullName: string;
  email: string;
  phone?: string;
  bio?: string;
  profileImageUrl?: string;
  companyId?: string;
  companyName?: string;
  brokerId?: string;
  propertyCount: number;
  dealsCount: number;
  averageRating?: number;
  reviewCount: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCompanyResponse {
  id: string;
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  logoUrl?: string;
  isVerified: boolean;
  isDeleted: boolean;
  agentCount: number;
  propertyCount: number;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalProperties: number;
  totalProjects: number;
  totalRequests: number;
  newRequests: number;
  totalConversations: number;
  unreadMessages: number;
  planName?: string;
  listingsUsed: number;
  listingsLimit: number;
  agentsUsed: number;
  agentsLimit: number;
  hasAnalyticsDashboard: boolean;
}

// ── Dashboard Analytics ────────────────────────────────────────────────────────

export interface MonthlyDataPoint {
  label: string;
  count: number;
}

export interface TopListingItem {
  id: string;
  title: string;
  views: number;
  requestCount: number;
  status: string;
  city: string;
}

export interface AttentionListingItem {
  id: string;
  title: string;
  issue: string;
}

export interface DashboardAnalytics {
  totalListings: number;
  activeListings: number;
  inactiveListings: number;
  soldListings: number;
  rentedListings: number;
  totalProjects: number;
  totalAgents: number;
  totalRequests: number;
  newRequests: number;
  totalViews: number;
  monthlyListings: MonthlyDataPoint[];
  monthlyRequests: MonthlyDataPoint[];
  topListings: TopListingItem[];
  attentionListings: AttentionListingItem[];
}

// ── Admin Plans ────────────────────────────────────────────────────────────────

export interface PlanLimitItem {
  limitDefinitionId: string;
  key: string;
  name: string;
  unit?: string;
  /** -1 = unlimited */
  value: number;
}

export interface PlanFeatureItem {
  featureDefinitionId: string;
  key: string;
  name: string;
  description?: string;
  featureGroup?: string;
  icon?: string;
  isEnabled: boolean;
}

export interface AdminPlanSummary {
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  basePriceMonthly: number;
  basePriceYearly: number;
  applicableAccountType?: string;
  createdAt: string;
  displayOrder: number;
  isPublic: boolean;
  isRecommended: boolean;
  planCategory?: string;
  billingMode: string;
  rank: number;
  badgeText?: string;
  planColor?: string;
  // Trial
  hasTrial: boolean;
  trialDays: number;
  requiresPaymentForTrial: boolean;
  // Business rules
  isDefaultForNewUsers: boolean;
  availableForSelfSignup: boolean;
  requiresAdminApproval: boolean;
  allowAddOns: boolean;
  allowUpgrade: boolean;
  allowDowngrade: boolean;
  autoDowngradeOnExpiry: boolean;
}

export interface AdminPlanDetail extends AdminPlanSummary {
  limits: PlanLimitItem[];
  features: PlanFeatureItem[];
}

export interface AdminPlanPricingEntry {
  id: string;
  planId: string;
  billingCycle: string;
  priceAmount: number;
  currencyCode: string;
  isActive: boolean;
  isPublic: boolean;
  externalProvider?: string;
  externalPriceId?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Blog ─────────────────────────────────────────────────────────────────────

// ── Public Blog DTOs (from /api/blog/*) ───────────────────────────────────────

export interface PublicBlogPostSummary {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  tags: string[];
  isFeatured: boolean;
  readTimeMinutes?: number;
  viewCount: number;
  publishedAt?: string;
  categories: PublicBlogCategory[];
  createdAt: string;
}

export interface PublicBlogPostDetail {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  tags: string[];
  isFeatured: boolean;
  readTimeMinutes?: number;
  viewCount: number;
  seoTitle?: string;
  seoDescription?: string;
  seoMode: "Auto" | "Template" | "Custom";
  ogTitle?: string;
  ogDescription?: string;
  publishedAt?: string;
  categories: PublicBlogCategory[];
  createdAt: string;
}

export interface PublicBlogCategory {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

export type BlogPostStatus = "Draft" | "Published" | "Archived";
export type SeoTitleMode = "Auto" | "Template" | "Custom";
export type SeoDescriptionMode = "Auto" | "Template" | "Custom";
export type SlugMode = "Auto" | "Custom";

export interface BlogSeoSettingsDto {
  siteName: string;
  defaultPostSeoTitleTemplate: string;
  defaultPostSeoDescriptionTemplate: string;
  defaultBlogListSeoTitle: string;
  defaultBlogListSeoDescription: string;
  defaultOgTitleTemplate: string;
  defaultOgDescriptionTemplate: string;
}

export interface UpdateBlogSeoSettingsRequest {
  siteName?: string;
  defaultPostSeoTitleTemplate?: string;
  defaultPostSeoDescriptionTemplate?: string;
  defaultOgTitleTemplate?: string;
  defaultOgDescriptionTemplate?: string;
  defaultBlogListSeoTitle?: string;
  defaultBlogListSeoDescription?: string;
}

export interface BlogCategoryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostSummaryResponse {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  tags: string[];
  status: BlogPostStatus;
  isFeatured: boolean;
  readTimeMinutes?: number;
  viewCount: number;
  publishedAt?: string;
  createdByUserId: string;
  createdByName: string;
  categories: BlogCategoryResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostDetailResponse extends BlogPostSummaryResponse {
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  seoTitleMode: SeoTitleMode;
  seoDescriptionMode: SeoDescriptionMode;
  slugMode: SlugMode;
  seoMode: "Auto" | "Template" | "Custom";
  ogTitle?: string;
  ogDescription?: string;
  resolvedSeoTitle: string;
  resolvedSeoDescription: string;
  updatedByUserId?: string;
  publishedByUserId?: string;
  isDeleted: boolean;
}

export interface CreateBlogPostRequest {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  tags?: string[];
  categoryIds: string[];
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoTitleMode?: SeoTitleMode;
  seoDescriptionMode?: SeoDescriptionMode;
  slugMode?: SlugMode;
  seoMode?: "Auto" | "Template" | "Custom";
  ogTitle?: string;
  ogDescription?: string;
  readTimeMinutes?: number;
}

export interface UpdateBlogPostRequest {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  tags?: string[];
  categoryIds?: string[];
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoTitleMode?: SeoTitleMode;
  seoDescriptionMode?: SeoDescriptionMode;
  slugMode?: SlugMode;
  seoMode?: "Auto" | "Template" | "Custom";
  ogTitle?: string;
  ogDescription?: string;
  readTimeMinutes?: number;
}

export interface CreateBlogCategoryRequest {
  name: string;
  slug?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface UpdateBlogCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}

// ── Billing ───────────────────────────────────────────────────────────────────

export interface PaymentInstructionsDto {
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
}

export interface PaymentProofDto {
  id: string;
  imageUrl: string;
  notes?: string;
  createdAt: string;
}

export interface AdminInvoiceResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planPricingId: string;
  planName: string;
  billingCycle: string;
  amount: number;
  currency: string;
  status: string;
  providerName: string;
  externalRef?: string;
  adminNote?: string;
  createdAt: string;
  expiresAt?: string;
  isExpired: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  paymentInstructions?: PaymentInstructionsDto;
  proof?: PaymentProofDto;
}

// ── Plan Catalog ─────────────────────────────────────────────────────────────

export interface FeatureDefinitionEntry {
  id: string;
  key: string;
  name: string;
  description?: string;
  featureGroup?: string;
  icon?: string;
  isActive: boolean;
}

export interface LimitDefinitionEntry {
  id: string;
  key: string;
  name: string;
  description?: string;
  unit?: string;
  valueType: string;
  appliesToScope?: string;
  isActive: boolean;
}

export interface CreateFeatureDefinitionPayload {
  key: string;
  name: string;
  description?: string;
  featureGroup?: string;
  icon?: string;
}

export interface UpdateFeatureDefinitionPayload {
  name: string;
  description?: string;
  featureGroup?: string;
  icon?: string;
  isActive: boolean;
}

export interface CreateLimitDefinitionPayload {
  key: string;
  name: string;
  description?: string;
  unit?: string;
  valueType?: string;
  appliesToScope?: string;
}

export interface UpdateLimitDefinitionPayload {
  name: string;
  description?: string;
  unit?: string;
  valueType?: string;
  appliesToScope?: string;
  isActive: boolean;
}
