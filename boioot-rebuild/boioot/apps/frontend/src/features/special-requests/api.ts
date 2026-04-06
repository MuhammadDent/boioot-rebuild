import { api } from "@/lib/api";
import type { PagedResult } from "@/types";

// ─── SpecialRequestType ────────────────────────────────────────────────────────

export interface SpecialRequestType {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpecialRequestTypeDto {
  label: string;
  value: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateSpecialRequestTypeDto {
  label?: string;
  value?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// ─── SpecialRequest ────────────────────────────────────────────────────────────

export interface SpecialRequest {
  id: string;
  publicCode: string;
  fullName: string;
  phone: string;
  whatsApp?: string;
  email?: string;
  requestType?: string;
  message: string;
  status: string;
  source?: string;
  notesInternal?: string;
  closedAt?: string;
  attachmentUrls?: string[];
  createdAt: string;
  updatedAt: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  createdByUserId?: string;
  createdByUserName?: string;
}

export interface SubmitSpecialRequestDto {
  fullName: string;
  phone: string;
  whatsApp?: string;
  email: string;
  requestType: string;
  message: string;
  source?: string;
  attachmentUrls?: string[];
}

export interface UpdateSpecialRequestDto {
  status?: string;
  assignedToUserId?: string | null;
  notesInternal?: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getSpecialRequestTypes(): Promise<SpecialRequestType[]> {
  return api.get<SpecialRequestType[]>("/special-request-types");
}

export function submitSpecialRequest(dto: SubmitSpecialRequestDto): Promise<SpecialRequest> {
  return api.post<SpecialRequest>("/special-requests", dto);
}

// ─── Admin — Request Types ─────────────────────────────────────────────────────

export function adminGetSpecialRequestTypes(): Promise<SpecialRequestType[]> {
  return api.get<SpecialRequestType[]>("/special-request-types/admin");
}

export function adminCreateSpecialRequestType(dto: CreateSpecialRequestTypeDto): Promise<SpecialRequestType> {
  return api.post<SpecialRequestType>("/special-request-types/admin", dto);
}

export function adminUpdateSpecialRequestType(id: string, dto: UpdateSpecialRequestTypeDto): Promise<SpecialRequestType> {
  return api.put<SpecialRequestType>(`/special-request-types/admin/${id}`, dto);
}

export function adminDeleteSpecialRequestType(id: string): Promise<void> {
  return api.delete(`/special-request-types/admin/${id}`);
}

// ─── Admin — Requests ──────────────────────────────────────────────────────────

export function adminGetSpecialRequests(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<PagedResult<SpecialRequest>> {
  const q = new URLSearchParams();
  if (params.search)   q.set("search",   params.search);
  if (params.status)   q.set("status",   params.status);
  if (params.page)     q.set("page",     String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  return api.get<PagedResult<SpecialRequest>>(`/special-requests/admin?${q}`);
}

export function adminGetSpecialRequestById(id: string): Promise<SpecialRequest> {
  return api.get<SpecialRequest>(`/special-requests/admin/${id}`);
}

export function adminUpdateSpecialRequest(id: string, dto: UpdateSpecialRequestDto): Promise<SpecialRequest> {
  return api.put<SpecialRequest>(`/special-requests/admin/${id}`, dto);
}

export function adminDeleteSpecialRequest(id: string): Promise<void> {
  return api.delete(`/special-requests/admin/${id}`);
}
