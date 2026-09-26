/**
 * labels.ts — zh-CN presentation labels for canonical backend values
 * (Stage R.2 §62 Owner-facing Internal Copy Zero Gate).
 * Maps canonical enum/event values to user language; unknown values fall
 * back to a safe generic label, never the raw internal token.
 */

/** 事件类型 → 用户语言（未收录类型显示“一条记录”，不暴露内部 event_type）。 */
export function eventTypeLabel(eventType: string): string {
  const map: Record<string, string> = {
    "daily.meal": "喂食",
    "daily.drink": "饮水",
    "daily.elimination": "排泄",
    "daily.walk": "散步",
    "daily.play": "玩耍",
    "daily.weight": "体重",
    "daily.sleep": "睡眠",
    "diary.created": "备注",
    "medication.administered": "用药",
    "behavior.observed": "行为",
    "health.event_opened": "健康记录",
    "health.red_flag": "健康提醒",
    "health.triage_assigned": "健康分级",
    "health.vet_brief_generated": "就诊摘要",
    "health.vet_brief_shared": "分享就诊摘要",
    "health.outcome_recorded": "结局记录",
    "care.task_created": "任务",
    "care.task_completed": "任务完成",
    "care.task_conflict": "任务冲突",
    "training.goal_created": "训练目标",
    "training.session_logged": "训练记录",
    "social.interaction_logged": "互动记录",
    "pet.asked": "提问",
    "today.viewed": "今日查看",
  };
  return map[eventType] ?? "一条记录";
}

/** 来源类型 → 用户语言（未收录来源显示“记录”，不暴露内部枚举）。 */
export function sourceLabel(sourceType: string): string {
  const map: Record<string, string> = {
    OWNER_REPORTED: "主人记录",
    CAREGIVER_REPORTED: "照护人记录",
    DEVICE_DERIVED: "设备记录",
    AI_DERIVED: "AI 整理",
    PROFESSIONAL_CONFIRMED: "专业人员",
    LAB_CONFIRMED: "化验确认",
    SYSTEM_CALCULATED: "系统计算",
  };
  return map[sourceType] ?? "记录";
}

/** 设备事件类型 → 用户语言（未收录类型不显示具体计数）。 */
export function deviceEventLabel(kind: string): string {
  const map: Record<string, string> = {
    FEEDER_PORTION: "喂食",
    WATER_INTAKE: "饮水",
    ACTIVITY: "活动量",
    WEIGHT: "体重",
    CAMERA_CLIP: "画面记录",
    LITTER_VISIT: "猫砂使用",
  };
  return map[kind] ?? "";
}

/** 性别 → 用户语言。 */
export function sexLabelZh(sex: string): string {
  if (sex === "FEMALE") return "雌性";
  if (sex === "MALE") return "雄性";
  return "";
}

/** 出生日期 → “N岁N个月”（仅用于展示真实 birth_date，不编造）。 */
export function petAgeText(birthDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0 && months <= 0) return "刚出生不久";
  if (years <= 0) return `${months}个月`;
  if (months === 0) return `${years}岁`;
  return `${years}岁${months}个月`;
}

/** 事件 payload → 简短用户语言摘要（只映射已知字段，未知字段不暴露 key）。 */
export function eventPayloadText(payload: Record<string, unknown>): string {
  const map: Record<string, string> = {
    amount: "数量",
    unit: "单位",
    food_type: "食物",
    duration_minutes: "时长",
    weight_kg: "体重",
    kind: "类型",
    quality: "状态",
    intensity: "强度",
    activity_type: "活动",
    text: "内容",
    "detail": "详情",
  };
  const parts: string[] = [];
  Object.entries(payload).forEach(([k, v]) => {
    const label = map[k];
    if (!label || v === null || v === undefined || v === "") return;
    parts.push(`${label} ${String(v)}`);
  });
  return parts.join(" · ");
}
