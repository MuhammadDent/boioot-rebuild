const TOKEN_KEY    = "boioot_token";
const USER_KEY     = "boioot_user";
const EXPIRES_KEY  = "boioot_expires_at";

// Phase 1B: refresh token is now an HttpOnly cookie — never stored in JS.
// These keys are listed here only for the one-time migration cleanup below.
const _LEGACY_REFRESH_TOKEN_KEY         = "boioot_refresh_token";
const _LEGACY_REFRESH_TOKEN_EXPIRES_KEY = "boioot_refresh_token_expires_at";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export const tokenStorage = {
  TOKEN_KEY,
  USER_KEY,
  EXPIRES_KEY,

  // ── Access Token ──────────────────────────────────────────
  getToken(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  // ── User ──────────────────────────────────────────────────
  getUserRaw(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(USER_KEY);
  },
  setUser(user: object): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },

  // ── Access Token Expiry ───────────────────────────────────
  getExpiresAt(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(EXPIRES_KEY);
  },
  setExpiresAt(expiresAt: string): void {
    localStorage.setItem(EXPIRES_KEY, expiresAt);
  },
  removeExpiresAt(): void {
    localStorage.removeItem(EXPIRES_KEY);
  },

  /**
   * Returns true if the access token is expired (or missing).
   *
   * Strategy (in order):
   * 1. If boioot_expires_at is stored and parseable → use it.
   * 2. Fall back to decoding the JWT `exp` claim directly.
   * 3. If the JWT is malformed → treat as expired.
   * 4. If no token at all → treat as expired.
   */
  isExpired(): boolean {
    const raw = this.getExpiresAt();
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d <= new Date();
    }

    if (!isBrowser()) return false;
    const token = this.getToken();
    if (!token) return true;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      if (typeof payload.exp === "number") {
        return payload.exp * 1000 <= Date.now();
      }
    } catch {
      return true;
    }

    return false;
  },

  /**
   * Returns true if the access token will expire within `bufferSeconds`.
   * Used for preemptive silent refresh.
   */
  isExpiredOrExpiringSoon(bufferSeconds = 30): boolean {
    const raw = this.getExpiresAt();
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.getTime() - Date.now() <= bufferSeconds * 1000;
      }
    }
    return this.isExpired();
  },

  // ── Clear all ─────────────────────────────────────────────
  clear(): void {
    this.removeToken();
    this.removeUser();
    this.removeExpiresAt();
    // Also purge any Phase 1A legacy refresh token keys that may be in storage
    localStorage.removeItem(_LEGACY_REFRESH_TOKEN_KEY);
    localStorage.removeItem(_LEGACY_REFRESH_TOKEN_EXPIRES_KEY);
  },
};

/**
 * App startup cleanup.
 *
 * Phase 1B: refresh token lives in an HttpOnly cookie — we cannot inspect it
 * from JavaScript. Startup cleanup only clears when there is no access token
 * stored at all. If the access token is expired, we leave it in place; the
 * silent refresh flow will exchange the cookie for a fresh access token on the
 * first protected API call.
 *
 * Also purges any Phase 1A legacy refresh token keys from localStorage.
 *
 * Returns true if a full cleanup was performed (i.e. the user has no session).
 */
export function cleanExpiredSession(): boolean {
  if (!isBrowser()) return false;

  // Remove Phase 1A legacy keys unconditionally
  localStorage.removeItem(_LEGACY_REFRESH_TOKEN_KEY);
  localStorage.removeItem(_LEGACY_REFRESH_TOKEN_EXPIRES_KEY);

  const hasToken = !!tokenStorage.getToken();
  if (!hasToken) {
    tokenStorage.clear();
    return true;
  }

  // Access token present (even if expired) → keep the session alive.
  // The cookie-based silent refresh will handle renewal on next API call.
  return false;
}
