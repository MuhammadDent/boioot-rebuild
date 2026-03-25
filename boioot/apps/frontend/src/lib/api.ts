import { apiConfig } from "./api-config";
import { tokenStorage } from "./token";

// ─── Error types ──────────────────────────────────────────────────────────────

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

// ─── Session expiry message ───────────────────────────────────────────────────

const SESSION_EXPIRED_MSG =
  "انتهت صلاحية الجلسة، الرجاء تسجيل الدخول مرة أخرى";

// ─── Central 401 handler ─────────────────────────────────────────────────────
//
// Differentiates between two 401 scenarios:
//
// 1. Authenticated session expired (token was in localStorage):
//    → clear token + redirect to /login + throw session-expired ApiError.
//
// 2. Unauthenticated 401 (e.g. wrong login credentials, no stored token):
//    → read the actual backend error message + throw that ApiError.
//    → No redirect, no session-expired message — caller handles it normally.

async function handle401(res: Response): Promise<never> {
  const hadToken = !!tokenStorage.getToken();
  tokenStorage.clear();

  if (hadToken) {
    // ── Expired / invalidated authenticated session ────────────────────────
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
    throw new ApiError(SESSION_EXPIRED_MSG, 401, null);
  }

  // ── Unauthenticated 401 (login failure, etc.) ──────────────────────────
  const payload = await res.json().catch(() => null);
  const message =
    payload?.error ??
    payload?.message ??
    payload?.title ??
    "بيانات الدخول غير صحيحة";
  throw new ApiError(message, 401, payload);
}

// ─── Core request ─────────────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${apiConfig.baseUrl}${path}`, { ...options, headers });
  } catch {
    throw new NetworkError();
  }

  if (!res.ok) {
    if (res.status === 401) {
      await handle401(res);
    }

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
    const token = tokenStorage.getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${apiConfig.baseUrl}${path}`, {
        method: "POST",
        headers,
        body: form,
      });
    } catch {
      throw new NetworkError();
    }

    if (!res.ok) {
      if (res.status === 401) {
        await handle401(res);
      }
      const payload = await res.json().catch(() => null);
      const message =
        payload?.error ?? payload?.message ?? "حدث خطأ أثناء رفع الملف";
      throw new ApiError(message, res.status, payload);
    }

    return res.json() as Promise<T>;
  },
};

// ─── Error normalizer ─────────────────────────────────────────────────────────

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
