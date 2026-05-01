import { api } from "@/lib/api";

export interface MatchResult {
  userId: string;
  userName: string;
  userPhone: string;
  matchScore: number;
  matchReason: string;
  coverageType: string;
  cityName: string;
  neighborhoodName: string | null;
}

export interface MatchingUserFeatures {
  leadNotifications: boolean;
  instantNotifications: boolean;
  fullMatchAccess: boolean;
  monthlyLeadUnlocks: number;
  hasMatchingSubscription: boolean;
}

export interface MatchResponse {
  requestId: string;
  requestTitle: string;
  requestCity: string | null;
  requestNeighborhood: string | null;
  totalCount: number;
  isLaunchMode: boolean;
  isUnlocked: boolean;
  lockedMatchesCount: number;
  userFeatures: MatchingUserFeatures;
  matches: MatchResult[];
}

export interface BuyerRequestLead {
  id: string;
  title: string;
  propertyType: string;
  city: string | null;
  neighborhood: string | null;
  status: string;
  referenceNumber: string | null;
  createdAt: string;
}

export interface MyLeadsResponse {
  isLaunchMode: boolean;
  totalCount: number;
  leads: BuyerRequestLead[];
}

export const matchingApi = {
  getMatchesForRequest(requestId: string): Promise<MatchResponse> {
    return api.get<MatchResponse>(`/matching/buyer-requests/${requestId}`);
  },
  getMyLeads(): Promise<MyLeadsResponse> {
    return api.get<MyLeadsResponse>("/matching/my-leads");
  },
};
