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

export type CaseHistoryNextAction =
  | { kind: "OPEN_CASE"; label: string; note: string }
  | { kind: "RECORD_OBSERVATION"; label: string; note: string }
  | { kind: "NONE"; label: string; note: string };

/** R8BZ: translate canonical owner-workflow truth into a user action.
 *
 * This is navigation policy only. It never creates a health/medical state and
 * never turns an owner judgement into a diagnosis. A required fresh
 * observation is distinguished from an optional recommendation to keep
 * observing.
 */
export function caseHistoryNextAction(c: LifeChangeCaseSummary): CaseHistoryNextAction {
  const workflow = c.owner_workflow_state ?? c.state;
  const metric = caseHistoryMetric(c.metric).name;

  if (!c.source_valid || workflow === "INVALIDATED") {
    return {
      kind: "OPEN_CASE",
      label: "重新核对原始记录",
      note: "原始依据已经变化，不能用新增记录替代来源核对。",
    };
  }
  if (workflow === "FOLLOW_UP_EVIDENCE_INVALIDATED") {
    return {
      kind: "RECORD_OBSERVATION",
      label: `补一条新的真实${metric}记录`,
      note: "旧主人判断仍保留为历史；新结果必须基于新的真实观察。",
    };
  }
  if (workflow === "OUTCOME_CONTINUE_OBSERVING") {
    return {
      kind: "RECORD_OBSERVATION",
      label: `有新情况时继续记录${metric}`,
      note: "这是继续观察的建议，不要求连续打卡，也不代表异常或疾病。",
    };
  }
  if (workflow === "OUTCOME_NEEDS_FURTHER_FOLLOW_UP") {
    return {
      kind: "RECORD_OBSERVATION",
      label: `记录下一次真实${metric}作为跟进`,
      note: "这是主人选择进一步跟进，不自动表示健康风险等级更高。",
    };
  }
  if (workflow === "OUTCOME_NO_LONGER_CONCERNED" || workflow === "CLOSED") {
    return {
      kind: "NONE",
      label: "当前没有待办",
      note: "这只是主人当前选择，不等于宠物已恢复、正常或没有健康问题。",
    };
  }
  if (workflow === "OWNER_ACKNOWLEDGED") {
    return {
      kind: "OPEN_CASE",
      label: "继续核对来源",
      note: "先确认原始记录，再决定是否补充新的真实观察。",
    };
  }
  if (c.follow_up_source_valid === true) {
    return {
      kind: "OPEN_CASE",
      label: "回看后续观察并记录结果",
      note: "已有真实后续观察可核对；结果仍只记录主人判断。",
    };
  }
  if (workflow === "FOLLOW_UP") {
    return {
      kind: "RECORD_OBSERVATION",
      label: `有新情况时记录真实${metric}`,
      note: "先记录真实发生的事实，再把它关联为后续观察。",
    };
  }
  if (workflow === "PROPOSED") {
    return {
      kind: "OPEN_CASE",
      label: "完成这次主人核对",
      note: "先查看冻结来源，再选择继续关注、暂不关注或核对来源。",
    };
  }
  return {
    kind: "OPEN_CASE",
    label: "查看完整档案",
    note: "回看来源、主人反馈和后续观察。",
  };
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
