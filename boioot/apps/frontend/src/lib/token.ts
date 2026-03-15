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

  /** Returns true if a stored expiresAt value is in the past. */
  isExpired(): boolean {
    const raw = this.getExpiresAt();
    if (!raw) return false;
    return new Date(raw) <= new Date();
  },

  // ── Clear all ─────────────────────────────────────────────
  clear(): void {
    this.removeToken();
    this.removeUser();
    this.removeExpiresAt();
  },
};
