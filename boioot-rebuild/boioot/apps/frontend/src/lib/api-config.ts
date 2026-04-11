const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export const apiConfig = {
  baseUrl: API_URL,
} as const;
