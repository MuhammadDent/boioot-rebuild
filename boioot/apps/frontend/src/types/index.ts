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
