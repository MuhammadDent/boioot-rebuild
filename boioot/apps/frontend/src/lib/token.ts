const TOKEN_KEY = "boioot_token";
const USER_KEY  = "boioot_user";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export const tokenStorage = {
  TOKEN_KEY,
  USER_KEY,

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

  clear(): void {
    this.removeToken();
    this.removeUser();
  },
};
