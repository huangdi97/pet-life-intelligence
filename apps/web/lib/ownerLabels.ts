/**
 * Owner-facing copy for PLI internal identifiers.
 *
 * INVARIANT:
 * Raw internal identifiers — event type keys such as `daily.meal`, provenance /
 * source enums such as `OWNER_REPORTED`, triage levels such as `EMERGENCY`,
 * payload field names or payload JSON — must never reach owner-visible copy
 * (A7 acceptance: OWNER_RUNTIME_INTERNAL_TERMS = 0). Every helper below returns
 * Chinese owner language and falls back to a safe generic label, never to the
 * raw identifier.
 *
 * Canonical event type keys: services/api/app/domain/event_types.py.
 */

const EVENT_TYPE_FALLBACK = "生活记录";
const PROVENANCE_FALLBACK = "来源未知";
const TRIAGE_FALLBACK = "其他";
const TRIAGE_UNTRIAGED = "未分级";

/** event_type → owner copy. Keys mirror the canonical domain event registry. */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  // 日常
  "daily.meal": "喂食",
  "daily.drink": "饮水",
  "daily.elimination": "排泄",
  "daily.walk": "散步",
  "daily.play": "玩耍",
  "daily.weight": "体重",
  "daily.sleep": "睡眠",
  "diary.created": "备注",
  "summary.generated": "每日摘要",
  "reminder.created": "提醒",
  "reminder.completed": "提醒完成",
  // 照护
  "care.task_created": "照护任务",
  "care.task_completed": "任务完成",
  "care.task_conflict": "任务冲突",
  "care.handoff_started": "交接开始",
  "care.handoff_ended": "交接结束",
  "care.checklist_updated": "交接清单更新",
  "care.card_issued": "照护卡",
  // 行为
  "behavior.observed": "行为记录",
  "advice.filtered": "建议安全过滤",
  // 健康
  "health.event_opened": "健康事件",
  "health.intake_step": "健康问询",
  "health.observation_added": "健康观察",
  "ai.observation": "AI 观察",
  "health.artifact_added": "健康资料",
  "health.red_flag": "红旗",
  "health.triage_assigned": "风险分级",
  "health.vet_brief_generated": "就诊摘要生成",
  "health.vet_brief_shared": "就诊摘要分享",
  "health.outcome_recorded": "结局",
  "health.record_imported": "病历导入",
  "recovery_plan.updated": "恢复计划更新",
  // 用药
  "medication.plan_created": "用药计划",
  "medication.administered": "给药",
  "medication.missed": "漏用",
  // 社交
  "social.interaction_logged": "社交互动",
  "social.friend_requested": "伙伴邀请",
  "social.blocked": "屏蔽与举报",
  // 训练
  "training.goal_created": "训练目标",
  "training.session_logged": "训练记录",
  // 档案与家庭
  "pet.created": "建立档案",
  "pet.status_changed": "档案状态更新",
  "pet.media_added": "照片更新",
  "identifier.added": "芯片或证件",
  "relationship.created": "家庭成员加入",
  "grant.created": "授权",
  "grant.revoked": "撤权",
  "grant.expired": "授权到期",
  "consent.changed": "同意设置更新",
  "emergency_profile.updated": "紧急信息更新",
  // 时间线自身
  "milestone.recorded": "里程碑",
  "timeline.viewed": "查看时间线",
  "today.viewed": "查看今日",
};

/**
 * Map an internal event type key to owner copy.
 *
 * @param eventType Canonical event type key (e.g. `daily.meal`).
 * @returns Chinese owner label; generic fallback for unknown keys — never the raw key.
 */
export function eventTypeLabel(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? EVENT_TYPE_FALLBACK;
}

/** Common catalogue/demo breeds -> zh-CN owner copy. Unknown values stay
 * exactly as owner-entered data; we never infer or rewrite arbitrary breeds. */
export function breedLabel(breed: string | null | undefined): string {
  const value = (breed ?? "").trim();
  if (!value) return "";
  const key = value.toLowerCase();
  if (key === "corgi" || key === "welsh corgi" || key === "pembroke welsh corgi") return "柯基";
  if (key === "dlh" || key === "domestic long hair" || key === "domestic longhair") return "长毛家猫";
  return value;
}


/** Consent purpose enums -> owner language. Unknown purposes stay generic. */
export function consentPurposeLabel(purpose: string | null | undefined): string {
  const value = (purpose ?? "").trim().toUpperCase();
  if (value === "SERVICE_ESSENTIAL") return "提供核心服务";
  if (value.includes("HEALTH")) return "健康相关数据";
  if (value.includes("AI") || value.includes("MODEL")) return "智能功能";
  if (value.includes("RESEARCH")) return "研究与产品改进";
  if (value.includes("SHARE") || value.includes("CARE")) return "照护协作与共享";
  if (value.includes("DEVICE") || value.includes("MONITOR")) return "设备与在家观察";
  if (value.includes("NOTIF")) return "通知与提醒";
  return "其他数据用途";
}

/** provenance_level / source_type enums → owner copy. */
const PROVENANCE_LABELS: Record<string, string> = {
  OWNER_REPORTED: "主人记录",
  CAREGIVER_REPORTED: "照护者记录",
  DEVICE: "设备记录",
  DEVICE_DERIVED: "设备记录",
  PROFESSIONAL: "专业人员",
  PROFESSIONAL_CONFIRMED: "专业人员",
  PROFESSIONAL_REVIEWED: "专业人员",
  LAB: "化验结果",
  LAB_CONFIRMED: "化验结果",
  AI_STRUCTURED: "AI整理",
  AI_DERIVED: "AI整理",
  AI_INFERENCE: "AI推断",
  GENERATED_3D: "演示形象",
  RECORDED: "记录",
  LIVE: "实时画面",
  SYSTEM_CALCULATED: "系统计算",
  SYSTEM: "系统",
};

/**
 * Map an internal provenance / source enum to owner copy.
 *
 * @param level Raw provenance value such as `OWNER_REPORTED` or `DEVICE`.
 * @returns Chinese owner label; "来源未知" for unknown values — never the raw enum.
 */
export function provenanceLabel(level: string | null | undefined): string {
  const key = (level ?? "").trim().toUpperCase();
  return PROVENANCE_LABELS[key] ?? PROVENANCE_FALLBACK;
}

/** Triage / risk levels → owner copy (canonical levels: MONITOR < VET_SOON < URGENT < EMERGENCY). */
const TRIAGE_LABELS: Record<string, string> = {
  NORMAL: "正常",
  NOTICE: "留意",
  MONITOR: "观察",
  OBSERVATION: "观察",
  MONITORED: "需监测",
  VET_SOON: "建议就医",
  VET_REVIEW: "待兽医师确认",
  URGENT: "加急",
  EMERGENCY: "紧急",
  RESOLVED: "已解决",
};

/**
 * Map an internal triage level to owner copy.
 *
 * @param level Raw triage level such as `EMERGENCY`; `null` means untriaged.
 * @returns Chinese owner label; "其他" for unknown levels — never the raw enum.
 */
export function triageLabel(level: string | null | undefined): string {
  if (!level || !level.trim()) return TRIAGE_UNTRIAGED;
  return TRIAGE_LABELS[level.trim().toUpperCase()] ?? TRIAGE_FALLBACK;
}

/**
 * Build a short owner-readable summary from an event payload.
 *
 * INVARIANT: only whitelisted fields are rendered, so internal payload keys and
 * unknown values never appear in owner copy; unmapped payloads yield "".
 */
export function eventPayloadSummary(payload: Record<string, unknown>): string {
  const parts: string[] = [];
  const amount = payload["amount"];
  if (typeof amount === "number" || typeof amount === "string") {
    const unit = typeof payload["unit"] === "string" ? String(payload["unit"]) : "";
    parts.push(`${amount}${unit}`);
  }
  if (typeof payload["duration_minutes"] === "number")
    parts.push(`${payload["duration_minutes"]} 分钟`);
  const weight = payload["weight_kg"];
  if (typeof weight === "string" || typeof weight === "number") parts.push(`${weight} kg`);
  if (typeof payload["food_type"] === "string") parts.push(String(payload["food_type"]));
  if (typeof payload["activity_type"] === "string") parts.push(String(payload["activity_type"]));
  if (typeof payload["behavior"] === "string") parts.push(String(payload["behavior"]));
  if (typeof payload["environment"] === "string") parts.push(`地点：${payload["environment"]}`);
  if (typeof payload["outcome"] === "string") parts.push(`结果：${payload["outcome"]}`);
  if (typeof payload["medicine_name"] === "string") parts.push(String(payload["medicine_name"]));
  return parts.join(" · ");
}
