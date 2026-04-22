import { api } from "@/lib/api";
import type {
  RatingResponse,
  RatingSummaryResponse,
  PagedRatingsResponse,
  CanRateResponse,
  CreateRatingRequest,
} from "@/types";

export const ratingsApi = {
  /** POST /api/ratings — requires auth */
  create(data: CreateRatingRequest): Promise<RatingResponse> {
    return api.post<RatingResponse>("/ratings", data);
  },

  /** GET /api/listings/{id}/ratings — public */
  getForListing(
    listingId: string,
    params: { page?: number; pageSize?: number; sort?: string } = {}
  ): Promise<PagedRatingsResponse> {
    const qs = new URLSearchParams();
    if (params.page)     qs.set("page",     String(params.page));
    if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    if (params.sort)     qs.set("sort",     params.sort);
    const query = qs.toString();
    return api.get<PagedRatingsResponse>(
      `/listings/${listingId}/ratings${query ? `?${query}` : ""}`
    );
  },

  /** GET /api/listings/{id}/rating-summary — public */
  getSummary(listingId: string): Promise<RatingSummaryResponse> {
    return api.get<RatingSummaryResponse>(`/listings/${listingId}/rating-summary`);
  },

  /** GET /api/listings/{id}/can-rate — requires auth */
  canRate(listingId: string): Promise<CanRateResponse> {
    return api.get<CanRateResponse>(`/listings/${listingId}/can-rate`);
  },
};
