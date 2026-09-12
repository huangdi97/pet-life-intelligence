import type { ApiErrorBody } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8800";

const USER_KEY = "pli_dev_user_id";

export function getDevUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_KEY);
}

export function setDevUserId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(USER_KEY, id);
  else window.localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  code: string;
  request_id: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody["error"]) {
    super(body.message);
    this.code = body.code;
    this.request_id = body.request_id;
    this.status = status;
    this.details = body.details;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const uid = getDevUserId();
  if (uid) headers["X-Dev-User-Id"] = uid;

  const resp = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!resp.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = await resp.json();
    } catch {
      /* non-JSON error */
    }
    if (body?.error) throw new ApiError(resp.status, body.error);
    throw new ApiError(resp.status, {
      code: "HTTP_ERROR",
      message: `Request failed (${resp.status})`,
      request_id: "",
    });
  }
  return (await resp.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: async <T>(path: string, file: File): Promise<T> => {
    const form = new FormData();
    form.append("file", file);
    const headers: Record<string, string> = {};
    const uid = getDevUserId();
    if (uid) headers["X-Dev-User-Id"] = uid;
    const resp = await fetch(`${API_URL}/api/v1${path}`, {
      method: "POST",
      body: form,
      headers,
      credentials: "include",
    });
    if (!resp.ok) {
      const body = (await resp.json()) as ApiErrorBody;
      throw new ApiError(resp.status, body.error);
    }
    return (await resp.json()) as T;
  },
};
