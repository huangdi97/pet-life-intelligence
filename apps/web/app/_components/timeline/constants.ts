/** OWN-003 Timeline 常量与类型（原 page.tsx 顶部常量，拆分时原样迁移）。 */
export const FILTERS = [
  "", "daily.meal", "daily.drink", "daily.elimination", "daily.walk",
  "daily.play", "daily.weight", "daily.sleep", "care.task_completed", "care.task_conflict",
  "care.handoff_started", "behavior.observed", "health.event_opened",
  "health.triage_assigned", "health.red_flag", "health.outcome_recorded",
  "medication.plan_created", "medication.administered", "medication.missed",
  "social.interaction_logged", "milestone.recorded",
];

export interface VisualModelRow {
  version: number;
  status: string;
  provenance_kind: string;
  activated_at: string | null;
  retired_at: string | null;
}

export const DOMAIN_CHIPS: Array<{ id: string; label: string; match: (et: string) => boolean }> = [
  { id: "", label: "全部", match: () => true },
  { id: "health", label: "健康", match: (et) => et.startsWith("health.") },
  { id: "behavior", label: "行为", match: (et) => et.startsWith("behavior.") },
  { id: "training", label: "训练", match: (et) => et.startsWith("training.") },
  { id: "care", label: "照护", match: (et) => et.startsWith("care.") },
  { id: "daily", label: "日常", match: (et) => et.startsWith("daily.") },
  { id: "media", label: "媒体", match: (et) => et.startsWith("artifact") },
];

export const TYPE_LABELS: Record<string, string> = {
  "daily.meal": "喂食",
  "daily.drink": "饮水",
  "daily.elimination": "排泄",
  "daily.walk": "散步",
  "daily.play": "玩耍",
  "daily.weight": "体重",
  "daily.sleep": "睡眠",
  "care.task_completed": "任务完成",
  "care.task_conflict": "任务冲突",
  "care.handoff_started": "交接开始",
  "care.handoff_ended": "交接结束",
  "behavior.observed": "行为记录",
  "health.event_opened": "健康事件",
  "health.triage_assigned": "风险分级",
  "health.red_flag": "红旗",
  "health.outcome_recorded": "结局",
  "medication.plan_created": "用药计划",
  "medication.administered": "给药",
  "medication.missed": "漏用",
  "social.interaction_logged": "社交互动",
  "milestone.recorded": "里程碑",
  "diary.created": "备注",
};
