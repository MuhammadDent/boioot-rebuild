// ─────────────────────────────────────────────────────────────────────────────
// Page Sections System — Store
//
// TODAY:  localStorage persistence (no backend required)
// FUTURE: replace getStored / saveStored with API calls.
//         The hook (useSectionStore) and all consumer code stay unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import type { PageSectionsConfig } from "./types";
import { PAGE_SECTIONS_DEFAULTS } from "./defaults";

const STORAGE_KEY = "boioot:page-sections:v1";

// ── Low-level read/write (swap these two for API later) ───────────────────────

function getStored(): PageSectionsConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PageSectionsConfig) : null;
  } catch {
    return null;
  }
}

function saveStored(config: PageSectionsConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Read the full page sections config.
 * Falls back to defaults for any missing key.
 */
export function loadPageSections(): PageSectionsConfig {
  const stored = getStored();
  if (!stored) return PAGE_SECTIONS_DEFAULTS;
  return {
    ...PAGE_SECTIONS_DEFAULTS,
    ...stored,
    footerCTA: { ...PAGE_SECTIONS_DEFAULTS.footerCTA, ...(stored.footerCTA ?? {}) },
  };
}

/**
 * Persist an updated page sections config.
 */
export function savePageSections(config: PageSectionsConfig): void {
  saveStored(config);
}

/**
 * Reset a section (or all sections) to defaults.
 */
export function resetPageSections(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
