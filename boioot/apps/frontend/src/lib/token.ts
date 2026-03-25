const TOKEN_KEY    = "boioot_token";
const USER_KEY     = "boioot_user";
const EXPIRES_KEY  = "boioot_expires_at";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export const tokenStorage = {
  TOKEN_KEY,
  USER_KEY,
  EXPIRES_KEY,

  // ── Token ────────────────────────────────────────────────
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

  // ── User ─────────────────────────────────────────────────
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

  // ── Expiry ───────────────────────────────────────────────
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
   * Returns true if the session token is expired.
   *
   * Strategy (in order):
   * 1. If boioot_expires_at is stored and parseable → use it.
   * 2. Fall back to decoding the JWT `exp` claim directly.
   *    This catches tokens issued before expiresAt storage was added.
   * 3. If the JWT is malformed → treat as expired.
   * 4. If no token at all → treat as expired.
   */
  isExpired(): boolean {
    // 1. Check stored expiresAt
    const raw = this.getExpiresAt();
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return d <= new Date();
    }

    // 2. Decode JWT exp directly (browser-only)
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

  // ── Clear all ─────────────────────────────────────────────
  clear(): void {
    this.removeToken();
    this.removeUser();
    this.removeExpiresAt();
  },
};
