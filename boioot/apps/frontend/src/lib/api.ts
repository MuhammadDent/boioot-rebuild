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
  constructor(cause?: unknown) {
    super("تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.");
    this.name = "NetworkError";
    if (cause) console.error("[api] Network error cause:", cause);
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
    const refreshUrl = `${apiConfig.baseUrl}/auth/refresh`;
    console.log("[api] Silent refresh →", refreshUrl);
    try {
      const res = await fetch(refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        // Same-origin — cookie is sent automatically; no credentials override needed.
      });

      console.log("[api] Silent refresh ←", res.status);
      if (!res.ok) return false;

      const data = await res.json();

      // Update stored access token from the rotated response
      if (data.token)     tokenStorage.setToken(data.token);
      if (data.expiresAt) tokenStorage.setExpiresAt(data.expiresAt);

      return true;
    } catch (err) {
      console.error("[api] Silent refresh failed:", err);
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

// ─── Try to extract a readable error message from any response body ────────────

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  const rawBody = await res.text().catch(() => "");
  if (!rawBody.trim()) {
    return `${fallback} (HTTP ${res.status})`;
  }
  // Try JSON first
  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;

    // ASP.NET DataAnnotations validation errors: { errors: { Field: ["msg1"] }, title: "..." }
    if (payload?.errors && typeof payload.errors === "object") {
      const allMsgs = Object.values(payload.errors as Record<string, string[]>)
        .flat()
        .filter(Boolean);
      if (allMsgs.length > 0) return allMsgs.join(" | ");
    }

    const msg =
      (payload?.error as string | undefined) ??
      (payload?.message as string | undefined) ??
      (payload?.title as string | undefined);
    if (msg) return msg;
  } catch {
    // Not JSON — body might be HTML (e.g. 502 from proxy)
    console.warn("[api] Non-JSON error body:", rawBody.slice(0, 200));
  }
  return `${fallback} (HTTP ${res.status})`;
}

// ─── Core request ──────────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const fullUrl = `${apiConfig.baseUrl}${path}`;

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

    console.log(`[api] → ${method} ${fullUrl}`);
    try {
      const response = await fetch(fullUrl, { ...options, headers });
      console.log(`[api] ← ${method} ${fullUrl} ${response.status}`);
      return response;
    } catch (err) {
      console.error(`[api] ✗ ${method} ${fullUrl}`, err);
      throw new NetworkError(err);
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
      const message = await extractErrorMessage(res, "بيانات الدخول غير صحيحة");
      throw new ApiError(message, 401, null);
    }
  }

  if (!res.ok) {
    // Clone before reading body (body can only be consumed once)
    const bodyText = await res.text().catch(() => "");
    let payload: Record<string, unknown> | null = null;

    try {
      if (bodyText.trim()) payload = JSON.parse(bodyText) as Record<string, unknown>;
    } catch {
      console.warn(`[api] Non-JSON error body for ${method} ${fullUrl}:`, bodyText.slice(0, 200));
    }

    // ── Plan limit interception ──────────────────────────────────────────────
    if (res.status === 422 && payload?.code === "PLAN_LIMIT_EXCEEDED") {
      const planPayload = payload as unknown as PlanLimitPayload;
      dispatchUpsellTrigger(planPayload);
      throw new PlanLimitError(planPayload);
    }

    const message =
      (payload?.error as string | undefined) ??
      (payload?.message as string | undefined) ??
      (payload?.title as string | undefined) ??
      `خطأ من الخادم (${res.status})`;

    console.error(`[api] Error ${res.status} for ${method} ${fullUrl}:`, message, payload);
    throw new ApiError(message, res.status, payload);
  }

  if (res.status === 204) return undefined as T;

  // Read as text first — some success responses have an empty body (e.g. Ok() with no payload).
  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();

  if (!raw || !raw.trim()) return undefined as T;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error("[api] Invalid JSON response", { path, raw: raw.slice(0, 200), err });
      throw new ApiError("استجابة غير صالحة من الخادم", 0, { raw });
    }
  }

  // Non-JSON success (e.g. plain text) — return as-is
  return raw as unknown as T;
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

  /**
   * POST with FormData (file uploads). Does NOT set Content-Type — browser
   * sets it automatically with the correct boundary.
   */
  upload<T>(path: string, formData: FormData): Promise<T> {
    const method = "POST";
    const fullUrl = `${apiConfig.baseUrl}${path}`;
    const token = tokenStorage.getToken();

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    console.log(`[api] → ${method} ${fullUrl} (upload)`);
    return fetch(fullUrl, {
      method,
      headers,
      body: formData,
    })
      .then(async (res) => {
        console.log(`[api] ← ${method} ${fullUrl} ${res.status}`);
        if (!res.ok) {
          const message = await extractErrorMessage(res, "فشل رفع الملف");
          throw new ApiError(message, res.status);
        }
        if (res.status === 204) return undefined as T;
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          return res.json() as Promise<T>;
        }
        return res.text() as unknown as Promise<T>;
      })
      .catch((err) => {
        if (err instanceof ApiError) throw err;
        console.error(`[api] ✗ ${method} ${fullUrl}`, err);
        throw new NetworkError(err);
      });
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
    return err.message || "حدث خطأ غير متوقع";
  }
  if (typeof err === "string") return err;
  console.error("[api] Unknown error type:", err);
  return "حدث خطأ غير متوقع";
}
