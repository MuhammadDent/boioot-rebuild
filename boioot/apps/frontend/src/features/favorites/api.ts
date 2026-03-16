import { api } from "@/lib/api";
import type { FavoriteResponse } from "@/types";

export const favoritesApi = {
  list(): Promise<FavoriteResponse[]> {
    return api.get<FavoriteResponse[]>("/favorites");
  },

  ids(): Promise<string[]> {
    return api.get<string[]>("/favorites/ids");
  },

  toggle(propertyId: string): Promise<{ added: boolean }> {
    return api.post<{ added: boolean }>(`/favorites/${propertyId}`, {});
  },
};
