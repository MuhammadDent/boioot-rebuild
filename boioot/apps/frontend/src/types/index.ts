export interface UserProfileResponse {
  id: string;
  userCode: string;
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

export interface DashboardPropertyItem {
  id: string;
  title: string;
  /** Available | Inactive | Sold | Rented */
  status: string;
  /** Apartment | Villa | Office | Shop | Land | Building */
  type: string;
  /** Sale | Rent */
  listingType: string;
  price: number;
  city: string;
  createdAt: string;
}

export interface CreatePropertyRequest {
  title: string;
  description?: string;
  /** Apartment | Villa | Office | Shop | Land | Building */
  type: string;
  /** Sale | Rent */
  listingType: string;
  price: number;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  address?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  companyId: string;
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
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  address?: string;
  city: string;
  latitude?: number;
  longitude?: number;
  agentId?: string;
}
