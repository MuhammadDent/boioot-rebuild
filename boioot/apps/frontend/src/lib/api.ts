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
