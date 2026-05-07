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

/**
 * Professional access entitlements for the matching system.
 * Phase 1: all professional accounts (Broker / Agent / CompanyOwner / Office)
 * receive full access for free — no subscription required.
 */
export interface MatchingUserFeatures {
  /** True for all professional accounts. Primary gate for full matching access. */
  hasProfessionalAccess: boolean;
  /** Receive notifications when matching requests arrive. True for professionals. */
  leadNotifications: boolean;
  /** Receive notifications immediately (no delay). True for professionals. */
  instantNotifications: boolean;
  /** See all matched results without restriction. True for professionals. */
  fullMatchAccess: boolean;
  /** Monthly lead quota. -1 = unlimited (professionals), 0 = none. */
  monthlyLeadUnlocks: number;
  /** Backward-compat alias for hasProfessionalAccess. */
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
