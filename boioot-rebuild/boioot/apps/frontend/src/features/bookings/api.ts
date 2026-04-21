import { api } from "@/lib/api";
import type { BookingResponse, CreateBookingRequest } from "@/types";

export const bookingsApi = {
  create(request: CreateBookingRequest): Promise<BookingResponse> {
    return api.post<BookingResponse>("/bookings", request);
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
  reject(id: string): Promise<BookingResponse> {
    return api.post<BookingResponse>(`/bookings/${id}/reject`, {});
  },
  cancel(id: string): Promise<BookingResponse> {
    return api.post<BookingResponse>(`/bookings/${id}/cancel`, {});
  },
};