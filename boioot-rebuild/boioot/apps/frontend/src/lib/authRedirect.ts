/**
 * Centralised auth-redirect helpers.
 *
 * Stores and retrieves the page a guest was trying to reach before being asked
 * to authenticate.  All callers must use these helpers — never write to the
 * key directly so the behaviour stays consistent everywhere.
 *
 * Storage: sessionStorage  (cleared on tab close, not shared across tabs)
 * Key    : "auth.redirectAfterLogin"
 */

const REDIRECT_KEY = "auth.redirectAfterLogin";

/** Pages that must never be used as a post-login destination. */
const EXCLUDED_PREFIXES = ["/login", "/register"];

/**
 * Returns true when `target` is a safe, internal relative path
 * that can be used as a post-login destination.
 */
export function isValidRedirectTarget(target: string | null | undefined): target is string {
  if (!target) return false;
  if (!target.startsWith("/")) return false;                        // no external URLs
  if (EXCLUDED_PREFIXES.some(p => target.startsWith(p))) return false;
  return true;
}

/**
 * Captures the current page as the redirect target.
 * Call this just before sending the user to /login.
 * If the current page is itself an excluded path, nothing is saved.
 */
export function saveRedirectTarget(): void {
  if (typeof window === "undefined") return;
  const target =
    window.location.pathname +
    window.location.search +
    window.location.hash;
  if (!isValidRedirectTarget(target)) return;
  sessionStorage.setItem(REDIRECT_KEY, target);
}

/** Returns the stored redirect target without consuming it. */
export function getRedirectTarget(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(REDIRECT_KEY);
}

/** Deletes the stored redirect target. */
export function clearRedirectTarget(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(REDIRECT_KEY);
}

/**
 * Reads, validates, removes, and returns the stored redirect target.
 * Returns null if nothing is stored or the stored value is invalid.
 * Use this immediately after a successful login/register.
 */
export function consumeRedirectTarget(): string | null {
  const target = getRedirectTarget();
  clearRedirectTarget();
  return isValidRedirectTarget(target) ? target : null;
}
