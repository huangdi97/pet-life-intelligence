/**
 * R8CB · Knowledge Delta presentation rules.
 *
 * The backend already derives *what* became knowable after a day ended. This
 * module only decides how that deterministic journal difference is worded on an
 * owner surface. It must never invent an explanation:
 *
 * - no health/diagnosis wording ("恢复", "恶化", "风险升高") is ever produced here;
 * - the section is read-only: it exposes text, never an action;
 * - unknown kinds fall back to neutral copy instead of echoing server strings.
 */

export type KnowledgeDeltaKind =
  | "LATE_RECORDED_EVENT"
  | "SOURCE_RETRACTED_LATER"
  | "SOURCE_SUPERSEDED_LATER"
  | "REVIEW_ADDED_LATER"
  | "OUTCOME_ADDED_LATER"
  | "WORKFLOW_CHANGED_LATER"
  | "CASE_BECAME_INVALID_LATER"
  | "FOLLOWUP_BECAME_INVALID_LATER";

export interface KnowledgeDeltaItem {
  kind: KnowledgeDeltaKind | string;
  reason?: string | null;
  changed_at?: string | null;
  occurred_at?: string | null;
  recorded_at?: string | null;
  case_id?: string | null;
  event_id?: string | null;
  review_id?: string | null;
  outcome_id?: string | null;
}

export interface KnowledgeDelta {
  changed: boolean;
  items: KnowledgeDeltaItem[];
  event_delta_count?: number;
  owner_workflow_delta_count?: number;
  truth_note?: string;
  derived_from?: string;
  model_status?: string;
}

export const KNOWLEDGE_DELTA_HEADLINE = "为什么现在看到的不一样";
export const KNOWLEDGE_DELTA_FALLBACK_NOTE =
  "只说明记录和主人核对后来发生了什么，不代表宠物健康状态改变。";
export const KNOWLEDGE_DELTA_EMPTY_REASON = "后来有一条记录或核对发生了变化";

/** Owner-facing wording per kind; mirrors the server reason taxonomy. */
export const KNOWLEDGE_DELTA_REASONS: Record<string, string> = {
  LATE_RECORDED_EVENT: "这条记录是在当天之后补录的",
  SOURCE_RETRACTED_LATER: "后来这条来源被主人撤回",
  SOURCE_SUPERSEDED_LATER: "后来主人提交了一条修正记录",
  REVIEW_ADDED_LATER: "主人后来追加了一次核对",
  OUTCOME_ADDED_LATER: "主人后来基于新的真实观察记录了结果",
  WORKFLOW_CHANGED_LATER: "主人后来更新了这条关注的处理方式",
  CASE_BECAME_INVALID_LATER: "作为这条关注依据的原始记录后来被撤回",
  FOLLOWUP_BECAME_INVALID_LATER: "后来作为该结果依据的记录被撤回",
};

/** `4月18日` from an ISO instant, parsed from the string so no TZ can shift a day. */
export function knowledgeDeltaDay(iso?: string | null): string {
  if (!iso || iso.length < 10) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return "";
  return `${Number(match[2])}月${Number(match[3])}日`;
}

export function knowledgeDeltaVisible(delta?: KnowledgeDelta | null): boolean {
  return Boolean(delta && delta.changed && Array.isArray(delta.items) && delta.items.length > 0);
}

/** One read-only line per journal change: "<day> <owner-readable reason>". */
export function knowledgeDeltaLines(delta?: KnowledgeDelta | null): string[] {
  if (!knowledgeDeltaVisible(delta)) return [];
  return (delta?.items ?? []).map((item) => {
    const reason = KNOWLEDGE_DELTA_REASONS[item.kind] ?? KNOWLEDGE_DELTA_EMPTY_REASON;
    const day = knowledgeDeltaDay(item.changed_at);
    return day ? `${day} ${reason}` : reason;
  });
}

/** Short count summary so the owner sees scope before reading every line. */
export function knowledgeDeltaSummary(delta?: KnowledgeDelta | null): string {
  if (!knowledgeDeltaVisible(delta)) return "";
  const records = delta?.event_delta_count ?? 0;
  const workflow = delta?.owner_workflow_delta_count ?? 0;
  const parts: string[] = [];
  if (records > 0) parts.push(`${records} 条记录变化`);
  if (workflow > 0) parts.push(`${workflow} 条主人核对变化`);
  return parts.join(" · ");
}

export function knowledgeDeltaNote(delta?: KnowledgeDelta | null): string {
  return delta?.truth_note?.trim() || KNOWLEDGE_DELTA_FALLBACK_NOTE;
}
