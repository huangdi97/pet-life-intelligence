import type { ApiErrorBody } from "./types";

// API base URL resolution — Stage R.1 (Web real-access closure).
// Primary source: NEXT_PUBLIC_API_URL injected at build time (production-like
// builds MUST set it explicitly). No bundle may embed a hardcoded loopback:
// when the env value is absent we derive a dev convenience fallback at RUNTIME
// from window.location (<protocol>//<host>:8800), so a browser page served
// from localhost:3000/3100 reaches the local API without putting the literal
// "localhost:8800" into the shipped JavaScript.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").trim() || resolveRuntimeApiUrl();

function resolveRuntimeApiUrl(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (!host) return "";
  return `${window.location.protocol}//${host}:8800`;
}

const USER_KEY = "pli_dev_user_id";
const REFRESH_KEY = "pli_refresh_token";
const USER_META_KEY = "pli_user_meta";

/** Session mode: "real" (access/refresh tokens) or "dev" (X-Dev-User-Id). */
type SessionMode = "real" | "dev" | "none";

export function getDevUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_KEY);
}

export function setDevUserId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(USER_KEY, id);
  else window.localStorage.removeItem(USER_KEY);
  dispatchAuthChanged();
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export interface UserMeta {
  user_id: string;
  email: string;
  display_name: string;
}

export function getUserMeta(): UserMeta | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserMeta;
  } catch {
    return null;
  }
}

function setUserMeta(meta: UserMeta | null): void {
  if (typeof window === "undefined") return;
  if (meta) window.localStorage.setItem(USER_META_KEY, JSON.stringify(meta));
  else window.localStorage.removeItem(USER_META_KEY);
}

export function getSessionMode(): SessionMode {
  if (typeof window === "undefined") return "none";
  if (getRefreshToken()) return "real";
  if (getDevUserId()) return "dev";
  return "none";
}

function dispatchAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("pli-auth-changed"));
}

/** Set a full real-auth session (from /auth/login or /auth/register flow). */
export function setRealSession(tokens: {
  access_token: string;
  refresh_token: string;
  user_id: string;
  email?: string;
  display_name?: string;
}): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  _accessToken = tokens.access_token;
  if (tokens.user_id) window.localStorage.setItem(USER_KEY, tokens.user_id);
  setUserMeta({
    user_id: tokens.user_id,
    email: tokens.email ?? "",
    display_name: tokens.display_name ?? "",
  });
  dispatchAuthChanged();
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(USER_META_KEY);
  _accessToken = null;
  dispatchAuthChanged();
}

// in-memory access token (never persisted to localStorage)
let _accessToken: string | null = null;
let _refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const resp = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
        credentials: "include",
      });
      if (!resp.ok) {
        clearSession();
        return false;
      }
      const body = (await resp.json()) as {
        access_token: string;
        refresh_token: string;
      };
      window.localStorage.setItem(REFRESH_KEY, body.refresh_token);
      _accessToken = body.access_token;
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
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

function buildHeaders(init?: RequestInit): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  const uid = getDevUserId();
  if (uid) headers["X-Dev-User-Id"] = uid;
  if (_accessToken) headers.Authorization = `Bearer ${_accessToken}`;
  return headers;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const headers = buildHeaders(init);
  const resp = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (resp.status === 401 && !retried) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, init, true);
  }
  if (!resp.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await resp.json()) as ApiErrorBody;
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
    if (_accessToken) headers.Authorization = `Bearer ${_accessToken}`;
    let resp = await fetch(`${API_URL}/api/v1${path}`, {
      method: "POST",
      body: form,
      headers,
      credentials: "include",
    });
    if (resp.status === 401) {
      const ok = await tryRefresh();
      if (ok) {
        resp = await fetch(`${API_URL}/api/v1${path}`, {
          method: "POST",
          body: form,
          headers: buildHeaders(),
          credentials: "include",
        });
      }
    }
    if (!resp.ok) {
      const body = (await resp.json()) as ApiErrorBody;
      throw new ApiError(resp.status, body.error);
    }
    return (await resp.json()) as T;
  },
};

/** Convenience for auth flows. */
export const authApi = {
  register: (
    email: string,
    password: string,
    display_name: string,
    invite_code = "",
  ) =>
    api.post<{ user_id: string; verification_token?: string }>("/auth/register", {
      email,
      password,
      display_name,
      invite_code: invite_code.trim() || undefined,
    }),
  verifyEmail: (token: string) => api.post("/auth/verify-email", { token }),
  login: (email: string, password: string, device_label = "") =>
    api.post<{
      access_token: string;
      refresh_token: string;
      expires_in: number;
      user_id: string;
      email: string;
      display_name: string;
    }>("/auth/login", { email, password, device_label }),
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post("/auth/reset-password", { token, new_password }),
  logout: (refresh_token: string) =>
    api.post("/auth/logout", { refresh_token }),
  changePassword: (current_password: string, new_password: string) =>
    api.post("/auth/change-password", { current_password, new_password }),
  listSessions: () => api.get<unknown[]>("/auth/sessions"),
  revokeSession: (session_id: string) =>
    api.post(`/auth/sessions/${session_id}/revoke`, {}),
  deleteAccount: (password: string) =>
    api.post("/auth/delete-account", { password }),
  status: () => api.get<{ mode: string; real_auth: string; dev_auth_enabled: boolean }>("/auth/status"),
};

/** Pilot mode helpers (invite gating + feedback). */
export const pilotApi = {
  status: () =>
    api.get<{
      pilot_mode: boolean;
      pets_total: number;
      active_pets_3d: number;
      active_pets_7d: number;
      feedback_count: number;
      invited: number;
      registered: number;
      activated_owners: number;
      north_star: string;
      excludes: string[];
    }>("/pilot/status"),
  feedback: (body: {
    category: string;
    message: string;
    page_url?: string;
    pet_id?: string;
    client?: string;
    extra?: Record<string, unknown>;
  }) =>
    api.post<{ feedback_id: string; category: string }>("/pilot/feedback", {
      ...body,
      client: body.client ?? "web",
    }),
};