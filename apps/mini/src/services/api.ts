/** Shared mini-program API client. Uses platform network adapter + the
 *  canonical API base. Mirrors packages/api-client shape; no wx.* here. */
import { getPlatform } from "../platform/index";

const BASE =
  process.env.TARO_APP_API_URL ??
  "http://localhost:8800";

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    request_id: string;
    details?: Record<string, unknown>;
  };
}

export class ApiError extends Error {
  code: string;
  request_id: string;
  status: number;
  constructor(status: number, body: ApiErrorBody["error"]) {
    super(body.message);
    this.code = body.code;
    this.request_id = body.request_id;
    this.status = status;
  }
}

function headers(): Record<string, string> {
  const { auth } = getPlatform();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = auth.getToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { network } = getPlatform();
  const resp = await network.request<ApiErrorBody | T>({
    url: `${BASE}/api/v1${path}`,
    method: (init.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE") ?? "GET",
    data: init.body,
    header: headers(),
    timeout: 15000,
  });
  if (resp.status >= 400) {
    const body = resp.data as ApiErrorBody;
    if (body?.error) throw new ApiError(resp.status, body.error);
    throw new ApiError(resp.status, {
      code: "HTTP_ERROR",
      message: `请求失败 (${resp.status})`,
      request_id: "",
    });
  }
  return resp.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export type { Pet, LifeEvent, Task, NotificationItem } from "./types";