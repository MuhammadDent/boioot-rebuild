export interface UserProfileResponse {
  id: string;
  userCode: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  profileImageUrl?: string;
  createdAt: string;
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
  companyId: string;
  companyName: string;
  agentId?: string;
  images: PropertyImageResponse[];
  createdAt: string;
  updatedAt: string;
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
  neighborhood?: string;
  address?: string;
  province?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  companyId?: string;
  agentId?: string;
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
  /** Admin | CompanyOwner | Agent | User */
  role: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCompanyResponse {
  id: string;
  name: string;
  email?: string;
  phone?: string;
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
}
