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
    try {
      const res = await fetch(refreshUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

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
      const allMsgs = Object.entries(payload.errors as Record<string, string[]>)
        .flatMap(([field, msgs]) => (msgs ?? []).map((m: string) => m ? `[${field}] ${m}` : null))
        .filter(Boolean) as string[];
      if (allMsgs.length > 0) {
        return allMsgs.join(" | ");
      }
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
  // Buffer is 2 minutes (120 s) — gives enough time for network round-trips
  // while avoiding unnecessary refreshes on every request.
  if (tokenStorage.getToken() && tokenStorage.isExpiredOrExpiringSoon(120)) {
    const ok = await silentRefresh();
    if (!ok) terminateSession();
  }

  // ── Snapshot the token BEFORE the request fires ───────────────────────────
  // This avoids a race condition: if a concurrent request calls terminateSession()
  // and clears localStorage between our request send and the 401 response
  // arriving, we still know whether WE sent an Authorization header.
  const tokenSentWithRequest = tokenStorage.getToken();

  const executeRequest = async (): Promise<Response> => {
    const token = tokenStorage.getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const response = await fetch(fullUrl, { ...options, headers });
      return response;
    } catch (err) {
      console.error(`[api] ✗ ${method} ${fullUrl}`, err);
      throw new NetworkError(err);
    }
  };

  let res = await executeRequest();

  // ── 401 handling ──────────────────────────────────────────────────────────
  //
  // We use `tokenSentWithRequest` (captured BEFORE the request) instead of
  // re-reading localStorage NOW.  A concurrent request may have already called
  // terminateSession() and cleared the token, which would wrongly make us
  // think this was an unauthenticated request and show "wrong credentials".
  if (res.status === 401) {
    const hadToken = !!tokenSentWithRequest;

    if (hadToken) {
      // We sent a token but the server rejected it — try a silent refresh once.
      // If the HttpOnly refresh-cookie is still valid the backend will rotate
      // the access token; otherwise the session is truly dead.
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
      // No token was sent.
      // Two sub-cases:
      //   a) Genuine unauthenticated call (e.g. the login form itself) — show a
      //      "wrong credentials" message so the caller can surface it.
      //   b) Concurrent terminateSession() already cleared localStorage and
      //      started navigating to /login — we still throw so the caller's
      //      catch block runs, but if navigation is already in progress the
      //      error will be swallowed naturally.
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

    // ── ASP.NET Core 400 DataAnnotations: extract field-level errors ──────────
    // Shape: { title: "One or more validation errors occurred.", errors: { Field: ["msg"] } }
    let message: string;
    if (payload?.errors && typeof payload.errors === "object") {
      const fieldErrors = payload.errors as Record<string, string[]>;
      console.error(`[api] ✗ Validation errors (${method} ${fullUrl}):`, JSON.stringify(fieldErrors, null, 2));
      const joined = Object.entries(fieldErrors)
        .flatMap(([field, msgs]) =>
          (msgs ?? []).map((m: string) => m ? `[${field}] ${m}` : null)
        )
        .filter(Boolean)
        .join(" | ");
      message = joined ||
        (payload?.title as string | undefined) ||
        `خطأ في البيانات المُرسَلة (${res.status})`;
    } else {
      message =
        (payload?.error as string | undefined) ??
        (payload?.message as string | undefined) ??
        (payload?.title as string | undefined) ??
        `خطأ من الخادم (${res.status})`;
    }

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

    return fetch(fullUrl, {
      method,
      headers,
      body: formData,
    })
      .then(async (res) => {
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
