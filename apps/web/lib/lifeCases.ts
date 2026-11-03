/** R8AK shared Case summary semantics for the Web owner surfaces.
 *
 * Status describes the owner decision and evidence validity only. It is NOT a
 * diagnosis and must never claim that a pet recovered.
 */
export interface WebCaseSummary {
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
}

export const CASE_METRIC: Record<string, { name: string; unit: string }> = {
  walk_minutes_per_day: { name: "散步", unit: "分钟" },
  meal_count_per_day: { name: "进食", unit: "次" },
  sleep_minutes_per_day: { name: "睡眠", unit: "分钟" },
};

export function caseStatus(item: WebCaseSummary): string {
  if (!item.source_valid || item.state === "INVALIDATED") return "原始记录已变更 · 需重新核对";
  if (item.state === "CLOSED") return "主人选择暂不关注";
  if (item.state === "OWNER_ACKNOWLEDGED") return "主人已提出来源核对";
  if (item.follow_up_source_valid === false || item.state === "FOLLOW_UP_EVIDENCE_INVALIDATED") {
    return "后续记录已失效 · 需重新核对";
  }
  if (item.follow_up_source_valid === true) return "已关联真实后续观察";
  if (item.state === "PROPOSED") return "等待主人核对";
  if (item.state === "FOLLOW_UP") return "主人选择继续关注";
  return "已有历史核对记录";
}
