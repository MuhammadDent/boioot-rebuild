import { apiConfig } from "./api-config";
import { tokenStorage } from "./token";

// ─── Error types ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor() {
    super("تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.");
    this.name = "NetworkError";
  }
}

// ─── Session messages ──────────────────────────────────────────────────────────

const SESSION_EXPIRED_MSG =
  "انتهت صلاحية الجلسة، الرجاء تسجيل الدخول مرة أخرى";

// ─── Concurrency-safe silent refresh ──────────────────────────────────────────
//
// All in-flight requests that need a token refresh share ONE refresh promise.
// This prevents N simultaneous calls all independently hitting POST /auth/refresh.

let refreshPromise: Promise<boolean> | null = null;

/**
 * Calls POST /auth/refresh directly via fetch (NOT through request() to avoid
 * infinite loops). Rotates stored access + refresh tokens on success.
 *
 * Returns true on success, false on any failure.
 * All concurrent callers share the same in-flight promise.
 */
async function silentRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async (): Promise<boolean> => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const res = await fetch(`${apiConfig.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return false;

      const data = await res.json();

      // Rotate stored tokens
      if (data.token)               tokenStorage.setToken(data.token);
      if (data.expiresAt)           tokenStorage.setExpiresAt(data.expiresAt);
      if (data.refreshToken)        tokenStorage.setRefreshToken(data.refreshToken);
      if (data.refreshTokenExpiresAt) tokenStorage.setRefreshTokenExpiresAt(data.refreshTokenExpiresAt);

      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

// ─── Session termination ───────────────────────────────────────────────────────

function terminateSession(): never {
  tokenStorage.clear();
  if (typeof window !== "undefined") {
    window.location.replace("/login");
  }
  throw new ApiError(SESSION_EXPIRED_MSG, 401, null);
}

// ─── Core request ──────────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // ── Preemptive silent refresh ──────────────────────────────────────────────
  // If the access token is expired/expiring soon AND we have a refresh token,
  // refresh NOW before sending the original request.
  if (tokenStorage.isExpiredOrExpiringSoon(30)) {
    const hasRefresh = !!tokenStorage.getRefreshToken();
    if (hasRefresh) {
      const ok = await silentRefresh();
      if (!ok) terminateSession();
    }
  }

  const executeRequest = async (): Promise<Response> => {
    const token = tokenStorage.getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      return await fetch(`${apiConfig.baseUrl}${path}`, { ...options, headers });
    } catch {
      throw new NetworkError();
    }
  };

  let res = await executeRequest();

  // ── 401 with refresh token → try refresh once → retry ────────────────────
  if (res.status === 401) {
    const hadToken    = !!tokenStorage.getToken();
    const hasRefresh  = !!tokenStorage.getRefreshToken();

    if (hadToken && hasRefresh) {
      const refreshed = await silentRefresh();

      if (refreshed) {
        // Retry the original request with the new access token
        res = await executeRequest();

        if (res.status === 401) {
          // Retry also got 401 — session is truly dead
          terminateSession();
        }
      } else {
        // Refresh failed — force logout
        terminateSession();
      }
    } else {
      // No refresh token available — differentiate expired session vs. login failure
      if (hadToken) {
        terminateSession();
      }
      // Unauthenticated 401 (e.g. wrong login credentials) — pass backend error through
      const payload = await res.json().catch(() => null);
      const message =
        payload?.error ??
        payload?.message ??
        payload?.title ??
        "بيانات الدخول غير صحيحة";
      throw new ApiError(message, 401, payload);
    }
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    const message =
      payload?.error ?? payload?.message ?? payload?.title ?? "حدث خطأ غير متوقع";
    throw new ApiError(message, res.status, payload);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Public API client ────────────────────────────────────────────────────────

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },

  async postForm<T>(path: string, form: FormData): Promise<T> {
    // ── Preemptive silent refresh for form uploads too ─────────────────────
    if (tokenStorage.isExpiredOrExpiringSoon(30)) {
      const hasRefresh = !!tokenStorage.getRefreshToken();
      if (hasRefresh) {
        const ok = await silentRefresh();
        if (!ok) terminateSession();
      }
    }

    const executeFormRequest = async (): Promise<Response> => {
      const token = tokenStorage.getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      try {
        return await fetch(`${apiConfig.baseUrl}${path}`, {
          method: "POST",
          headers,
          body: form,
        });
      } catch {
        throw new NetworkError();
      }
    };

    let res = await executeFormRequest();

    // ── 401 with refresh token → try refresh once → retry ──────────────────
    if (res.status === 401) {
      const hadToken   = !!tokenStorage.getToken();
      const hasRefresh = !!tokenStorage.getRefreshToken();

      if (hadToken && hasRefresh) {
        const refreshed = await silentRefresh();
        if (refreshed) {
          res = await executeFormRequest();
          if (res.status === 401) terminateSession();
        } else {
          terminateSession();
        }
      } else {
        if (hadToken) terminateSession();
        const payload = await res.json().catch(() => null);
        const message =
          payload?.error ?? payload?.message ?? "بيانات الدخول غير صحيحة";
        throw new ApiError(message, 401, payload);
      }
    }

    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      const message =
        payload?.error ?? payload?.message ?? "حدث خطأ أثناء رفع الملف";
      throw new ApiError(message, res.status, payload);
    }

    return res.json() as Promise<T>;
  },
};

// ─── Error normalizer ──────────────────────────────────────────────────────────

/**
 * Extracts a user-friendly Arabic error message from any thrown error.
 * Use this in catch blocks across all features.
 */
export function normalizeError(err: unknown): string {
  if (err instanceof ApiError || err instanceof NetworkError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "حدث خطأ غير متوقع";
}
