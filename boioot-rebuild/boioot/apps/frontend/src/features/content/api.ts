import { api } from "@/lib/api";

export type ContentMap = Record<string, string>;

export async function fetchPublicContent(): Promise<ContentMap> {
  return api.get<ContentMap>("/content/public");
}
