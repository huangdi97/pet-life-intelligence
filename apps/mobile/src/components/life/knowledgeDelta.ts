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
  source_change_kind?: "RETRACTED" | "SUPERSEDED" | string | null;
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
  CASE_BECAME_INVALID_LATER: "作为这条关注依据的原始记录后来发生了变化",
  FOLLOWUP_BECAME_INVALID_LATER: "后来作为该结果依据的记录发生了变化",
};

/**
 * Owner-local calendar label for a journal instant.
 *
 * Backend timestamps are UTC instants while Life Replay's selected day is
 * explicitly device-local. Use the device offset at that instant (including
 * DST) instead of slicing the UTC ISO date. Tests may inject an offset east of
 * UTC so the rule stays deterministic on CI hosts in any timezone.
 */
export function knowledgeDeltaDay(
  iso?: string | null,
  offsetMinutesEastOfUtc?: number,
): string {
  if (!iso) return "";
  const instant = new Date(iso);
  if (!Number.isFinite(instant.getTime())) return "";
  const offset = offsetMinutesEastOfUtc
    ?? -instant.getTimezoneOffset();
  if (!Number.isFinite(offset)) return "";
  const local = new Date(instant.getTime() + offset * 60 * 1000);
  return `${local.getUTCMonth() + 1}月${local.getUTCDate()}日`;
}

export function knowledgeDeltaVisible(delta?: KnowledgeDelta | null): boolean {
  return Boolean(delta && delta.changed && Array.isArray(delta.items) && delta.items.length > 0);
}

function groupedKnowledgeDeltaReason(
  kind: string,
  count: number,
  sourceChangeKind?: string | null,
): string {
  if (count <= 1) {
    if (kind === "CASE_BECAME_INVALID_LATER") {
      if (sourceChangeKind === "RETRACTED") return "作为这条关注依据的原始记录后来被主人撤回";
      if (sourceChangeKind === "SUPERSEDED") return "作为这条关注依据的原始记录后来被主人修正";
    }
    if (kind === "FOLLOWUP_BECAME_INVALID_LATER") {
      if (sourceChangeKind === "RETRACTED") return "后来作为该结果依据的记录被主人撤回";
      if (sourceChangeKind === "SUPERSEDED") return "后来作为该结果依据的记录被主人修正";
    }
    return KNOWLEDGE_DELTA_REASONS[kind] ?? KNOWLEDGE_DELTA_EMPTY_REASON;
  }
  const plural: Record<string, string> = {
    LATE_RECORDED_EVENT: `当天之后补录了 ${count} 条记录`,
    SOURCE_RETRACTED_LATER: `后来有 ${count} 条来源被主人撤回`,
    SOURCE_SUPERSEDED_LATER: `后来主人提交了 ${count} 条修正记录`,
    REVIEW_ADDED_LATER: `主人后来追加了 ${count} 次核对`,
    OUTCOME_ADDED_LATER: `主人后来基于新的真实观察记录了 ${count} 个结果`,
    WORKFLOW_CHANGED_LATER: `主人后来更新了 ${count} 条关注的处理方式`,
    CASE_BECAME_INVALID_LATER: `${count} 条关注的原始记录后来发生变化，需要重新核对`,
    FOLLOWUP_BECAME_INVALID_LATER: `${count} 个结果所依据的记录后来发生变化`,
  };
  return plural[kind] ?? `后来有 ${count} 条记录或核对发生了变化`;
}

/**
 * Owner-readable journal changes grouped by calendar day + deterministic kind.
 *
 * The API deliberately keeps every immutable delta row. The owner surface,
 * however, should not print three identical bullets merely because three
 * source rows were backfilled together. Grouping changes presentation only:
 * counts and journal identities remain untouched in the response.
 */
export function knowledgeDeltaLines(delta?: KnowledgeDelta | null): string[] {
  if (!knowledgeDeltaVisible(delta)) return [];
  const groups = new Map<string, {
    kind: string; day: string; count: number; sourceChangeKind?: string | null;
  }>();
  for (const item of delta?.items ?? []) {
    const day = knowledgeDeltaDay(item.changed_at);
    const sourceChangeKind = item.source_change_kind ?? null;
    const key = `${day}|\u0000|${item.kind}|\u0000|${sourceChangeKind ?? ""}`;
    const current = groups.get(key);
    if (current) current.count += 1;
    else groups.set(key, { kind: item.kind, day, count: 1, sourceChangeKind });
  }
  return Array.from(groups.values()).map(({ kind, day, count, sourceChangeKind }) => {
    const reason = groupedKnowledgeDeltaReason(kind, count, sourceChangeKind);
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
