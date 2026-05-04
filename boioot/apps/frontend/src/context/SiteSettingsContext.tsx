"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiConfig } from "@/lib/api-config";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SiteSettings {
  sectionProjectsEnabled:  boolean;
  sectionRequestsEnabled:  boolean;
  sectionDailyRentEnabled: boolean;
  sectionBlogEnabled:      boolean;
}

interface SiteSettingsContextValue {
  settings:  SiteSettings;
  isLoading: boolean;
  /** Re-fetch from server (called by admin page after saving). */
  refresh: () => Promise<void>;
}

// ── Defaults — all sections enabled so nothing disappears on error ─────────────

export const DEFAULT_SETTINGS: SiteSettings = {
  sectionProjectsEnabled:  true,
  sectionRequestsEnabled:  true,
  sectionDailyRentEnabled: true,
  sectionBlogEnabled:      true,
};

// ── Context ───────────────────────────────────────────────────────────────────

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings:  DEFAULT_SETTINGS,
  isLoading: false,
  refresh:   async () => {},
});

// ── Client-side fetch (used for refresh after admin save) ─────────────────────

async function fetchSettings(): Promise<SiteSettings> {
  const res = await fetch(`${apiConfig.baseUrl}/settings/public`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("failed to load site settings");
  return res.json();
}

// ── Provider ──────────────────────────────────────────────────────────────────
// initialSettings: passed from the server component (layout.tsx) so the first
// SSR paint already reflects the real database values — no flash of hidden
// sections appearing before the client-side fetch completes.

export function SiteSettingsProvider({
  children,
  initialSettings,
}: {
  children:        ReactNode;
  initialSettings?: SiteSettings;
}) {
  const [settings, setSettings]   = useState<SiteSettings>(
    initialSettings ?? DEFAULT_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(!initialSettings);

  const load = async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch {
      // Keep current value — sections remain visible on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Always re-fetch on mount so the client stays in sync even if the server
    // snapshot was slightly stale (e.g. cached CDN edge response).
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SiteSettingsContext.Provider value={{ settings, isLoading, refresh: load }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSiteSettings(): SiteSettingsContextValue {
  return useContext(SiteSettingsContext);
}
