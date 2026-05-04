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

// ── Defaults — all sections enabled so nothing disappears before data loads ───

const DEFAULT_SETTINGS: SiteSettings = {
  sectionProjectsEnabled:  true,
  sectionRequestsEnabled:  true,
  sectionDailyRentEnabled: true,
  sectionBlogEnabled:      true,
};

// ── Context ───────────────────────────────────────────────────────────────────

const SiteSettingsContext = createContext<SiteSettingsContextValue>({
  settings:  DEFAULT_SETTINGS,
  isLoading: true,
  refresh:   async () => {},
});

// ── Provider ──────────────────────────────────────────────────────────────────

async function fetchSettings(): Promise<SiteSettings> {
  const res = await fetch(`${apiConfig.baseUrl}/settings/public`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("failed to load site settings");
  return res.json();
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings]   = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch {
      // Keep defaults — sections remain visible on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
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
