import { api } from "@/lib/api";
import type {
  BookingReviewStatus,
  CreateTenantReviewRequest,
  CreateOwnerReviewRequest,
} from "@/types";

export type { BookingReviewStatus };

export interface PropertyReviewsResponse {
  publicVisibilityEnabled: boolean;
  averageRating?: number | null;
  count: number;
  reviews: import("@/types").TenantReviewData[];
}

export interface ReviewSettingsResponse {
  publicVisibilityEnabled: boolean;
}

export const reviewsApi = {
  getBookingReviews(bookingId: string): Promise<BookingReviewStatus> {
    return api.get<BookingReviewStatus>(`/bookings/${bookingId}/reviews`);
  },

  submitTenantReview(
    bookingId: string,
    request: CreateTenantReviewRequest
  ): Promise<{ message: string; overallRating: number }> {
    return api.post<{ message: string; overallRating: number }>(
      `/bookings/${bookingId}/reviews/tenant`,
      request
    );
  },

  submitOwnerReview(
    bookingId: string,
    request: CreateOwnerReviewRequest
  ): Promise<{ message: string; overallRating: number }> {
    return api.post<{ message: string; overallRating: number }>(
      `/bookings/${bookingId}/reviews/owner`,
      request
    );
  },

  getPropertyReviews(propertyId: string): Promise<PropertyReviewsResponse> {
    return api.get<PropertyReviewsResponse>(`/properties/${propertyId}/reviews`);
  },

  getAdminSettings(): Promise<ReviewSettingsResponse> {
    return api.get<ReviewSettingsResponse>("/admin/settings/reviews");
  },

  updateAdminSettings(
    publicVisibilityEnabled: boolean
  ): Promise<ReviewSettingsResponse> {
    return api.put<ReviewSettingsResponse>("/admin/settings/reviews", {
      publicVisibilityEnabled,
    });
  },
};
