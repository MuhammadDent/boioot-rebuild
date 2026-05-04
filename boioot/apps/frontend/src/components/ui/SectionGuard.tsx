"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useSiteSettings, type SiteSettings } from "@/context/SiteSettingsContext";
import SectionDisabled from "@/components/ui/SectionDisabled";

interface Props {
  settingKey: keyof SiteSettings;
  children: ReactNode;
}

/**
 * Wraps a page (or server-rendered children) with a section visibility check.
 *
 * Strategy: render children on the first pass (SSR / initial hydration) so
 * there is no hydration mismatch. After mount, if the setting is disabled the
 * component swaps to <SectionDisabled />.
 */
export default function SectionGuard({ settingKey, children }: Props) {
  const { settings, isLoading } = useSiteSettings();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (mounted && !isLoading && !settings[settingKey]) {
    return <SectionDisabled />;
  }

  return <>{children}</>;
}
