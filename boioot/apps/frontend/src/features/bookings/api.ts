import { api } from "@/lib/api";
import type { AvailabilityResponse, BookingResponse, CreateBookingRequest } from "@/types";

export const bookingsApi = {
  availability(propertyId: string, startDate: string, endDate: string): Promise<AvailabilityResponse> {
    const params = new URLSearchParams({ startDate, endDate });
    return api.get<AvailabilityResponse>(`/properties/${propertyId}/availability?${params.toString()}`);
  },
  create(request: CreateBookingRequest): Promise<BookingResponse> {
    return api.post<BookingResponse>("/bookings", request);
  },
  get(id: string): Promise<BookingResponse> {
    return api.get<BookingResponse>(`/bookings/${id}`);
  },
  mine(): Promise<BookingResponse[]> {
    return api.get<BookingResponse[]>("/bookings/mine");
  },
  forMyProperties(): Promise<BookingResponse[]> {
    return api.get<BookingResponse[]>("/bookings/for-my-properties");
  },
  confirm(id: string): Promise<BookingResponse> {
    return api.post<BookingResponse>(`/bookings/${id}/confirm`, {});
  },
  approve(id: string): Promise<BookingResponse> {
    return api.post<BookingResponse>(`/bookings/${id}/approve`, {});
  },
  reject(id: string): Promise<BookingResponse> {
    return api.post<BookingResponse>(`/bookings/${id}/reject`, {});
  },
  cancel(id: string): Promise<BookingResponse> {
    return api.post<BookingResponse>(`/bookings/${id}/cancel`, {});
  },
  submitProof(id: string, data: { proofUrls: string[]; note?: string }): Promise<BookingResponse> {
    return api.post<BookingResponse>(`/bookings/${id}/submit-proof`, { proofUrls: data.proofUrls, note: data.note });
  },
  confirmPayment(id: string): Promise<BookingResponse> {
    return api.post<BookingResponse>(`/bookings/${id}/confirm-payment`, {});
  },
  rejectProof(id: string): Promise<BookingResponse> {
    return api.post<BookingResponse>(`/bookings/${id}/reject-proof`, {});
  },
  cancelOwner(id: string): Promise<BookingResponse> {
    return api.post<BookingResponse>(`/bookings/${id}/cancel-owner`, {});
  },
  requestRevision(id: string, note: string): Promise<BookingResponse> {
    return api.post<BookingResponse>(`/bookings/${id}/request-revision`, { note });
  },
};