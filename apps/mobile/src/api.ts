/** Mobile API client — thin fetch wrapper over the same endpoints the web app
 *  uses (services/api, /api/v1). Auth: real session token from secure storage
 *  or dev-mode X-Dev-User-Id (same header pattern as packages/api-client).
 *  Timeout on every request; errors map to human language — never raw codes.
 *  The base URL is env-injected (Stage R.1); there is no loopback fallback. */
import { getDevUserId, getToken, setDevUserId } from "./storage/session";
import { resolveApiBaseUrl } from "./apiConfig";

const TIMEOUT_MS = 15000;

const BASE: string | null = resolveApiBaseUrl();

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

/** Map errors to human language (zh-CN). Never surface raw codes. */
export function humanizeError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "PERMISSION_DENIED":
        return "没有查看此内容的权限。";
      case "NOT_FOUND":
        return "内容不存在或已被移除。";
      case "EXTERNAL_BLOCKED":
        return "该服务暂未开放。";
      case "VALIDATION_ERROR":
        return "提交的内容不完整，请检查后重试。";
      default:
        return e.status >= 500 ? "服务出错了，请稍后重试。" : "请求失败，请稍后重试。";
    }
  }
  if (e instanceof Error && e.name === "AbortError") return "请求超时，请检查网络后重试。";
  return "网络异常，请检查网络后重试。";
}

/** Same header pattern as packages/api-client: dev-mode X-Dev-User-Id, then
 *  Bearer token for real sessions. */
async function buildHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const uid = await getDevUserId();
  if (uid) headers["X-Dev-User-Id"] = uid;
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await buildHeaders();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(`${BASE}/api/v1${path}`, { ...init, headers, signal: controller.signal });
  } catch (e: unknown) {
    clearTimeout(timer);
    throw e instanceof Error ? e : new Error("NETWORK_ERROR");
  }
  clearTimeout(timer);
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

/** Dev-mode login (same pattern as apps/web login dev mode): exchange a dev
 *  email for a user id, stored as the X-Dev-User-Id header value. */
export async function devLogin(devEmail: string): Promise<string> {
  const r = await api.post<{ user_id: string }>("/auth/dev/login", { email: devEmail });
  await setDevUserId(r.user_id);
  return r.user_id;
}

export type {
  AiStatus,
  AskAnswer,
  BehaviorEventRow,
  DeviceRow,
  HealthEventRow,
  LifeEvent,
  NotificationItem,
  Pet,
  PetFriend,
  SocialProfile,
  Task,
  TrainingGoalRow,
  TrainingTools,
  WelfareEvidence,
  WelfareProfile,
} from "./services/types";
