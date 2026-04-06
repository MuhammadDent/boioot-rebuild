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

// ─── Session-level cache ──────────────────────────────────────────────────────
// Shared across all provider instances so navigating between pages never
// triggers a second network request for the same content map.

const SESSION_KEY = "boioot:content_cache";

function readCache(): ContentMap | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ContentMap) : null;
  } catch {
    return null;
  }
}

function writeCache(map: ContentMap): void {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(map)); } catch {}
}

// Module-level promise dedup — avoids duplicate in-flight fetches.
let _inFlight: Promise<ContentMap> | null = null;

function getContentMap(): Promise<ContentMap> {
  const cached = readCache();
  if (cached) return Promise.resolve(cached);
  if (_inFlight) return _inFlight;
  _inFlight = fetchPublicContent()
    .then((map) => { writeCache(map); _inFlight = null; return map; })
    .catch(() => { _inFlight = null; return {}; });
  return _inFlight;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ContentProvider({ children }: { children: React.ReactNode }) {
  // Always start with {} so server and client render identically (no hydration mismatch).
  // sessionStorage is only available on the client, so we read it inside useEffect.
  const [map, setMap] = useState<ContentMap>({});

  useEffect(() => {
    getContentMap().then((m) => setMap(m));
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

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useContent(key: string, fallback = ""): string {
  const { get } = useContext(ContentContext);
  return get(key, fallback);
}

export function useContentMap(): ContentMap {
  return useContext(ContentContext).map;
}
