import { api } from "@/lib/api";
import type { BookingResponse, CreateBookingRequest } from "@/types";

export const bookingsApi = {
  create(request: CreateBookingRequest): Promise<BookingResponse> {
    return api.post<BookingResponse>("/bookings", request);
  },
};