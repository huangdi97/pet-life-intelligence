/** R8AI: A Case is a persistent reviewed-life record, not a live alert.
 * This mapping describes the owner decision/evidence status only, never a
 * physical diagnosis or a claim that the animal has recovered.
 */
export type LifeChangeCaseSummary = {
  case_id: string;
  pet_id: string;
  metric: string;
  current_value: number;
  baseline_value: number;
  sample_days: number;
  evidence_event_ids: string[];
  source_valid: boolean;
  follow_up_source_valid?: boolean | null;
  state: string;
  recorded_state?: string;
  owner_workflow_state?: string;
  owner_workflow_source?: "CASE" | "REVIEW" | "OUTCOME";
  latest_effective_outcome_id?: string | null;
  latest_effective_outcome_assessment?:
    | "CONTINUE_OBSERVING"
    | "NO_LONGER_CONCERNED"
    | "NEEDS_FURTHER_FOLLOW_UP"
    | null;
  requires_new_follow_up_observation?: boolean;
};

export function caseHistoryStatus(c: LifeChangeCaseSummary): string {
  const workflow = c.owner_workflow_state ?? c.state;
  if (!c.source_valid || workflow === "INVALIDATED") return "原始记录已变更 · 需重新核对";
  if (workflow === "FOLLOW_UP_EVIDENCE_INVALIDATED") {
    return "后续记录已失效 · 需新的真实观察";
  }
  if (workflow === "OUTCOME_CONTINUE_OBSERVING") return "主人选择继续观察";
  if (workflow === "OUTCOME_NO_LONGER_CONCERNED") {
    return "主人目前不再担心 · 非恢复结论";
  }
  if (workflow === "OUTCOME_NEEDS_FURTHER_FOLLOW_UP") return "主人选择进一步跟进";
  // A Review appended after an Outcome is the current workflow head. An older
  // invalid Outcome remains visible in detail history but does not override a
  // newer explicit CLOSED/CORRECT_SOURCE choice on summary surfaces.
  if (workflow === "CLOSED") return "主人选择暂不关注";
  if (workflow === "OWNER_ACKNOWLEDGED") return "主人已提出来源核对";
  if (c.follow_up_source_valid === true) return "已关联真实后续观察";
  if (workflow === "PROPOSED") return "等待主人核对";
  if (workflow === "FOLLOW_UP") return "主人选择继续关注";
  return "已有历史核对记录";
}

export function caseHistoryNeedsAttention(c: LifeChangeCaseSummary): boolean {
  const workflow = c.owner_workflow_state ?? c.state;
  return (
    !c.source_valid
    || workflow === "INVALIDATED"
    || workflow === "FOLLOW_UP_EVIDENCE_INVALIDATED"
  );
}

export function caseHistoryMetric(metric: string): { name: string; unit: string } {
  if (metric === "walk_minutes_per_day") return {name: "散步", unit: "分钟"};
  if (metric === "meal_count_per_day") return {name: "进食", unit: "次"};
  if (metric === "sleep_minutes_per_day") return {name: "睡眠", unit: "分钟"};
  return {name: "生活记录", unit: ""};
}
