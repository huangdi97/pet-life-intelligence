import { ApiError } from "../../services/api";

export type AgentTab = "ask" | "brief" | "find" | "plan" | "explain";
export type AskState = "idle" | "loading" | "ready" | "blocked" | "error";
export type FindState = "idle" | "loading" | "ready" | "error";

/** 建议问题（Stage H 指定 4 条）。 */
export const SUGGESTED = [
  "最近体重有什么变化？",
  "上次耳朵异常是什么时候？",
  "今天还有什么没完成？",
  "最近训练进度怎么样？",
];

export interface AnswerResult {
  answer: string;
  facts?: string[];
  inference?: string | null;
  citations?: Array<string | { label?: string; event_id?: string }>;
  sources?: Array<string | { label?: string; event_id?: string }>;
  uncertainty?: string | null;
  action?: string | null;
  sufficient?: boolean;
  disclaimer?: string;
  external_blocked?: boolean;
}

export interface SearchHit {
  event_id: string;
  event_type: string;
  occurred_at: string;
  payload: Record<string, unknown>;
}

export interface HealthEventRow {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
  opened_at: string;
}

/** AI/外部服务受阻 → 人类语言；绝不显示原始错误码。 */
export function isExternalBlocked(e: unknown): boolean {
  return (
    e instanceof ApiError &&
    (e.code === "EXTERNAL_BLOCKED" || e.code.startsWith("AI_") || e.status >= 500)
  );
}
