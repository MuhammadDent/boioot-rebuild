const TOKEN_KEY                  = "boioot_token";
const USER_KEY                   = "boioot_user";
const EXPIRES_KEY                = "boioot_expires_at";
const REFRESH_TOKEN_KEY          = "boioot_refresh_token";
const REFRESH_TOKEN_EXPIRES_KEY  = "boioot_refresh_token_expires_at";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export const tokenStorage = {
  TOKEN_KEY,
  USER_KEY,
  EXPIRES_KEY,
  REFRESH_TOKEN_KEY,
  REFRESH_TOKEN_EXPIRES_KEY,

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

  // ── Refresh Token ─────────────────────────────────────────
  getRefreshToken(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  removeRefreshToken(): void {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  // ── Refresh Token Expiry ──────────────────────────────────
  getRefreshTokenExpiresAt(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem(REFRESH_TOKEN_EXPIRES_KEY);
  },
  setRefreshTokenExpiresAt(expiresAt: string): void {
    localStorage.setItem(REFRESH_TOKEN_EXPIRES_KEY, expiresAt);
  },
  removeRefreshTokenExpiresAt(): void {
    localStorage.removeItem(REFRESH_TOKEN_EXPIRES_KEY);
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

  /** Returns true if the refresh token is absent or expired. */
  isRefreshTokenExpired(): boolean {
    const raw = this.getRefreshTokenExpiresAt();
    if (!raw) return true;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return true;
    return d <= new Date();
  },

  // ── Clear all ─────────────────────────────────────────────
  clear(): void {
    this.removeToken();
    this.removeUser();
    this.removeExpiresAt();
    this.removeRefreshToken();
    this.removeRefreshTokenExpiresAt();
  },
};

/**
 * App startup cleanup.
 *
 * Clears the session ONLY when there is no valid path to recovery:
 *  - No tokens stored at all.
 *  - Access token expired AND refresh token also expired/absent.
 *
 * If the access token is expired but the refresh token is still valid,
 * the session is kept alive — silent refresh will renew it on the next request.
 *
 * Returns true if a cleanup was performed.
 */
export function cleanExpiredSession(): boolean {
  const hasToken        = !!tokenStorage.getToken();
  const accessExpired   = tokenStorage.isExpired();
  const hasRefresh      = !!tokenStorage.getRefreshToken();
  const refreshExpired  = tokenStorage.isRefreshTokenExpired();

  if (!hasToken) {
    // Nothing stored → ensure everything is clear
    tokenStorage.clear();
    return true;
  }

  if (accessExpired && (!hasRefresh || refreshExpired)) {
    // Access expired and no way to refresh → clear everything
    tokenStorage.clear();
    return true;
  }

  return false;
}
