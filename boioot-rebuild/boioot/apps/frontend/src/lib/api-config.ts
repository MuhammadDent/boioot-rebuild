const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export const apiConfig = {
  baseUrl: API_URL,
} as const;
