"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadPageSections } from "@/lib/page-sections";
import type { FooterCTAConfig } from "@/lib/page-sections";
import { PAGE_SECTIONS_DEFAULTS } from "@/lib/page-sections";

// ─────────────────────────────────────────────────────────────────────────────
// FooterCTASection
//
// Reads its config from the PageSections store (localStorage today, API later).
// Renders nothing when isEnabled = false.
// Accepts an optional `config` prop for server-driven or test overrides.
// ─────────────────────────────────────────────────────────────────────────────

interface FooterCTASectionProps {
  /** Override — pass a pre-fetched config (e.g. from a future server API call).
   *  If omitted, the component reads from the client-side store. */
  config?: FooterCTAConfig;
}

export default function FooterCTASection({ config: propConfig }: FooterCTASectionProps) {
  const [config, setConfig] = useState<FooterCTAConfig>(
    propConfig ?? PAGE_SECTIONS_DEFAULTS.footerCTA
  );

  useEffect(() => {
    if (propConfig) return;
    const loaded = loadPageSections();
    setConfig(loaded.footerCTA);
  }, [propConfig]);

  if (!config.isEnabled) return null;

  return (
    <section className="footer2__cta-strip" aria-label={config.title}>
      <div className="footer2__wrap footer2__cta-inner">
        <div className="footer2__cta-text">
          {config.overline && (
            <p className="footer2__cta-overline">{config.overline}</p>
          )}
          <h2 className="footer2__cta-heading">{config.title}</h2>
          {config.subtitle && (
            <p className="footer2__cta-sub">{config.subtitle}</p>
          )}
        </div>
        <div className="footer2__cta-buttons">
          {config.primaryButtonText && config.primaryButtonLink && (
            <Link
              href={config.primaryButtonLink}
              className="footer2__btn footer2__btn--primary"
            >
              {config.primaryButtonText}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          )}
          {config.secondaryButtonText && config.secondaryButtonLink && (
            <Link
              href={config.secondaryButtonLink}
              className="footer2__btn footer2__btn--ghost"
            >
              {config.secondaryButtonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
