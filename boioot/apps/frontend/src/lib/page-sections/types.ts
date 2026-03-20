// ─────────────────────────────────────────────────────────────────────────────
// Page Sections System — Types
//
// Add a new section config interface here, then wire it into PageSectionsConfig.
// The Admin UI and store will automatically pick it up.
// ─────────────────────────────────────────────────────────────────────────────

/** Footer CTA strip — the green "ابدأ الآن" band at the top of the footer */
export interface FooterCTAConfig {
  isEnabled: boolean;
  overline: string;
  title: string;
  subtitle: string;
  primaryButtonText: string;
  primaryButtonLink: string;
  secondaryButtonText: string;
  secondaryButtonLink: string;
}

// ── Future sections (uncomment & extend when needed) ──────────────────────────
//
// export interface HeroBannerConfig {
//   isEnabled: boolean;
//   heading: string;
//   subheading: string;
//   backgroundImageUrl: string;
//   ctaText: string;
//   ctaLink: string;
// }
//
// export interface PromoStripConfig {
//   isEnabled: boolean;
//   message: string;
//   link?: string;
//   backgroundColor: string;
// }
//
// export interface LandingHeroConfig { ... }

/** The full Page Sections config object stored & managed by the system. */
export interface PageSectionsConfig {
  footerCTA: FooterCTAConfig;
  // heroBanner?: HeroBannerConfig;
  // promoStrip?: PromoStripConfig;
}

/** Helper — make every field in a section config optional for partial updates */
export type PartialSection<T> = { [K in keyof T]?: T[K] };
