"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { fetchPublicContent, type ContentMap } from "@/features/content/api";

// ─── Context ──────────────────────────────────────────────────────────────────

interface ContentContextValue {
  map: ContentMap;
  get: (key: string, fallback?: string) => string;
}

const ContentContext = createContext<ContentContextValue>({
  map: {},
  get: (_key, fallback = "") => fallback,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [map, setMap] = useState<ContentMap>({});

  useEffect(() => {
    fetchPublicContent()
      .then(setMap)
      .catch(() => {});
  }, []);

  const get = useCallback(
    (key: string, fallback = "") => map[key] ?? fallback,
    [map],
  );

  return (
    <ContentContext.Provider value={{ map, get }}>
      {children}
    </ContentContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useContent(key: string, fallback = ""): string {
  const { get } = useContext(ContentContext);
  return get(key, fallback);
}

export function useContentMap(): ContentMap {
  return useContext(ContentContext).map;
}
