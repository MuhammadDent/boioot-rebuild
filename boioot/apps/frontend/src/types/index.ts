export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
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
  area: number;
  type: string;
  listingType: string;
  status: string;
  city: string;
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

export interface RequestResponse {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
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

export interface UserProfileResponse {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresAt: string;
  user: UserProfileResponse;
}

export interface ConversationSummaryResponse {
  id: string;
  otherUserId: string;
  otherUserName: string;
  lastMessageAt?: string;
  unreadCount: number;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectTitle?: string;
  createdAt: string;
}

export interface MessageResponse {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  isOwnMessage: boolean;
  createdAt: string;
}

export interface ConversationDetailResponse {
  id: string;
  otherUserId: string;
  otherUserName: string;
  propertyId?: string;
  propertyTitle?: string;
  projectId?: string;
  projectTitle?: string;
  messages: PagedResult<MessageResponse>;
  createdAt: string;
}

export interface DashboardSummaryResponse {
  totalProperties: number;
  totalProjects: number;
  totalRequests: number;
  newRequests: number;
  totalConversations: number;
  unreadMessages: number;
}

export interface DashboardPropertyItem {
  id: string;
  title: string;
  status: string;
  type: string;
  listingType: string;
  price: number;
  city: string;
  createdAt: string;
}

export interface DashboardProjectItem {
  id: string;
  title: string;
  status: string;
  city: string;
  startingPrice?: number;
  isPublished: boolean;
  createdAt: string;
}

export interface DashboardRequestItem {
  id: string;
  name: string;
  phone: string;
  status: string;
  propertyTitle?: string;
  projectTitle?: string;
  createdAt: string;
}

export interface DashboardMessageSummaryResponse {
  totalConversations: number;
  unreadMessages: number;
}

export interface AdminUserResponse {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
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
