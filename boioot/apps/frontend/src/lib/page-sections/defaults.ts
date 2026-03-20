// ─────────────────────────────────────────────────────────────────────────────
// Page Sections System — Default / Fallback Values
//
// These are used whenever the store has no saved value and as the
// initial seed when an admin resets a section.
// ─────────────────────────────────────────────────────────────────────────────

import type { PageSectionsConfig } from "./types";

export const PAGE_SECTIONS_DEFAULTS: PageSectionsConfig = {
  footerCTA: {
    isEnabled: true,
    overline: "منصة عقارية سورية",
    title: "ابدأ الآن في عرض عقارك أو طلبك",
    subtitle: "سواء كنت صاحب عقار أو تبحث عن فرصة — بيوت يربطك بالشريك الصحيح",
    primaryButtonText: "أضف إعلانك",
    primaryButtonLink: "/post-ad",
    secondaryButtonText: "أضف طلبك",
    secondaryButtonLink: "/requests",
  },
};
