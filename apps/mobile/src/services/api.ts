/** Mobile API client. Shared canonical types + dev-auth (backend sandbox).
 *  In production the session token is attached from secure storage. */
import Constants from "expo-constants";
import { getToken } from "../storage/session";

const BASE: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://localhost:8800";

export interface ApiErrorBody {
  error: { code: string; message: string; request_id: string; details?: Record<string, unknown> };
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(`${BASE}/api/v1${path}`, { ...init, headers });
  if (!resp.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await resp.json()) as ApiErrorBody;
    } catch {
      /* non-JSON */
    }
    if (body?.error) throw new ApiError(resp.status, body.error);
    throw new ApiError(resp.status, {
      code: "HTTP_ERROR",
      message: `请求失败 (${resp.status})`,
      request_id: "",
    });
  }
  return (await resp.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export type { Pet, LifeEvent } from "./types";