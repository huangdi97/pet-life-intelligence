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
};

export function caseHistoryStatus(c: LifeChangeCaseSummary): string {
  if (!c.source_valid || c.state === "INVALIDATED") return "原始记录已变更 · 需重新核对";
  // Latest explicit owner choice is authoritative while original sources
  // remain valid. A retired earlier follow-up stays visible in the audit
  // history, but must not override a newer CLOSED/CORRECT_SOURCE decision.
  if (c.state === "CLOSED") return "主人选择暂不关注";
  if (c.state === "OWNER_ACKNOWLEDGED") return "主人已提出来源核对";
  if (c.follow_up_source_valid === false || c.state === "FOLLOW_UP_EVIDENCE_INVALIDATED") {
    return "后续记录已失效 · 需重新核对";
  }
  if (c.follow_up_source_valid === true) return "已关联真实后续观察";
  if (c.state === "PROPOSED") return "等待主人核对";
  if (c.state === "FOLLOW_UP") return "主人选择继续关注";
  return "已有历史核对记录";
}

export function caseHistoryMetric(metric: string): { name: string; unit: string } {
  if (metric === "walk_minutes_per_day") return {name: "散步", unit: "分钟"};
  if (metric === "meal_count_per_day") return {name: "进食", unit: "次"};
  if (metric === "sleep_minutes_per_day") return {name: "睡眠", unit: "分钟"};
  return {name: "生活记录", unit: ""};
}
