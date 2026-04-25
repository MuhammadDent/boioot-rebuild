/**
 * Lightweight, production-safe event tracking utility.
 *
 * Rules:
 * - Never throws or rejects
 * - Never blocks UI or user actions
 * - Silently skips when any tracker is unavailable or blocked
 * - Only safe, non-PII metadata is forwarded (enforced by callers)
 *
 * Supported destinations (all optional, all gracefully degraded):
 *   - Google Analytics 4 via window.gtag
 *   - Meta Pixel via window.fbq
 *   - TikTok Pixel via window.ttq
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ttq?: { track: (event: string, params?: object) => void };
  }
}

export type TrackProps = Record<string, string | number | boolean | undefined | null>;

/**
 * Fire a named event with optional safe metadata.
 *
 * @param eventName  snake_case event name (e.g. "view_property", "booking_success")
 * @param props      Safe metadata only — NO phone, email, name, address, payment details.
 */
export function trackEvent(eventName: string, props?: TrackProps): void {
  try {
    if (typeof window === "undefined") return;

    const payload = props ?? {};

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, payload);
    }

    if (typeof window.fbq === "function") {
      window.fbq("trackCustom", eventName, payload);
    }

    if (typeof window.ttq?.track === "function") {
      window.ttq.track(eventName, payload);
    }
  } catch {
    // swallow — tracking must never break the UI
  }
}
