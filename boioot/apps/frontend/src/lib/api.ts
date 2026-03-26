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

// Thrown (and also dispatched as a DOM CustomEvent) when the backend returns
// HTTP 422 with errorCode === "PLAN_LIMIT_EXCEEDED".
export interface PlanLimitPayload {
  code:              string;  // "PLAN_LIMIT_EXCEEDED"
  limitKey:          string;
  message:           string;
  upgradeRequired:   boolean;
  currentValue?:     number;
  planLimit?:        number;
  suggestedPlanCode?: string;
}

export class PlanLimitError extends ApiError {
  public readonly planPayload: PlanLimitPayload;
  constructor(payload: PlanLimitPayload) {
    super(payload.message, 422, payload);
    this.name = "PlanLimitError";
    this.planPayload = payload;
  }
}

// Dispatch a "upsell:trigger" CustomEvent on window so any mounted modal can pick it up.
function dispatchUpsellTrigger(payload: PlanLimitPayload): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("upsell:trigger", { detail: payload }));
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
//
// Phase 1B: the refresh token is in an HttpOnly cookie — the browser sends it
// automatically. We never read or write the refresh token from JS.

let refreshPromise: Promise<boolean> | null = null;

/**
 * Calls POST /auth/refresh directly via fetch (NOT through request() to avoid
 * infinite loops). The HttpOnly cookie is sent automatically by the browser.
 * On success, rotates the stored access token.
 *
 * Returns true on success, false on any failure.
 * All concurrent callers share the same in-flight promise.
 */
async function silentRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async (): Promise<boolean> => {
    try {
      const res = await fetch(`${apiConfig.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        // Same-origin — cookie is sent automatically; no credentials override needed.
      });

      if (!res.ok) return false;

      const data = await res.json();

      // Update stored access token from the rotated response
      if (data.token)     tokenStorage.setToken(data.token);
      if (data.expiresAt) tokenStorage.setExpiresAt(data.expiresAt);

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
  // Only try if we actually have an access token that is expiring soon.
  // Without a stored token there is nothing to refresh (unauthenticated request).
  if (tokenStorage.getToken() && tokenStorage.isExpiredOrExpiringSoon(30)) {
    const ok = await silentRefresh();
    if (!ok) terminateSession();
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

  // ── 401 with a stored access token → try refresh once → retry ────────────
  //
  // If we had a stored token the cookie-based refresh should be able to renew
  // it. If the cookie is also expired/absent the refresh will return 401 and
  // we terminateSession() (redirect to login).
  if (res.status === 401) {
    const hadToken = !!tokenStorage.getToken();

    if (hadToken) {
      const refreshed = await silentRefresh();

      if (refreshed) {
        // Retry the original request with the new access token
        res = await executeRequest();

        if (res.status === 401) {
          // Retry also got 401 — session is truly dead
          terminateSession();
        }
      } else {
        // Refresh failed (cookie expired or revoked) — force logout
        terminateSession();
      }
    } else {
      // No access token stored → unauthenticated request (e.g. login failure)
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

    // ── Plan limit interception ──────────────────────────────────────────────
    if (res.status === 422 && payload?.code === "PLAN_LIMIT_EXCEEDED") {
      const planPayload = payload as PlanLimitPayload;
      dispatchUpsellTrigger(planPayload);
      throw new PlanLimitError(planPayload);
    }

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
    if (tokenStorage.getToken() && tokenStorage.isExpiredOrExpiringSoon(30)) {
      const ok = await silentRefresh();
      if (!ok) terminateSession();
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

    // ── 401 with stored token → try refresh once → retry ──────────────────
    if (res.status === 401) {
      const hadToken = !!tokenStorage.getToken();

      if (hadToken) {
        const refreshed = await silentRefresh();
        if (refreshed) {
          res = await executeFormRequest();
          if (res.status === 401) terminateSession();
        } else {
          terminateSession();
        }
      } else {
        const payload = await res.json().catch(() => null);
        const message =
          payload?.error ?? payload?.message ?? "بيانات الدخول غير صحيحة";
        throw new ApiError(message, 401, payload);
      }
    }

    if (!res.ok) {
      const payload = await res.json().catch(() => null);

      // ── Plan limit interception ────────────────────────────────────────────
      if (res.status === 422 && payload?.code === "PLAN_LIMIT_EXCEEDED") {
        const planPayload = payload as PlanLimitPayload;
        dispatchUpsellTrigger(planPayload);
        throw new PlanLimitError(planPayload);
      }

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
