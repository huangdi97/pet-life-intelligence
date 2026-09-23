import type { LifeEvent } from "@pli/api-client";
import type { QuickLogType } from "@pli/ui-kit";

export interface TodayData {
  pet: { id: string; name: string; species: string };
  date: string;
  event_counts: Record<string, number>;
  events: LifeEvent[];
}

/** API 返回的异常提示行：字段可选，渲染时取第一个非空文案。 */
export interface AbnormalHint {
  metric?: string;
  event_type?: string;
  message?: string;
  hint?: string;
  detail?: string;
}

export interface QuickLogItem {
  type: string;
  label: string;
  payload: Record<string, string | number>;
}

/** OWN-001 Today — 产品首页（Stage H §13/§14）：回答五问，不是数据库 dashboard。
 *  E2E 契约保留：还没有宠物 / 直接快速记录按钮（喂食等）→ .alert.info 已记录。 */
export const QUICK_TYPES: QuickLogItem[] = [
  { type: "daily.meal", label: "喂食", payload: { food_type: "狗粮", amount: "100", unit: "g" } },
  { type: "daily.drink", label: "饮水", payload: { amount: "200", unit: "ml" } },
  { type: "daily.elimination", label: "排泄", payload: { kind: "urine", quality: "normal" } },
  { type: "daily.walk", label: "散步", payload: { duration_minutes: 20, intensity: "normal" } },
  { type: "daily.play", label: "玩耍", payload: { duration_minutes: 15, activity_type: "fetch" } },
  { type: "daily.weight", label: "体重", payload: { weight_kg: "12.0" } },
];

export const SHEET_TYPES: QuickLogType[] = [
  ...QUICK_TYPES.map((q) => ({ type: q.type, label: q.label })),
  { type: "daily.sleep", label: "睡觉", payload: { duration_minutes: 60, quality: "normal" } },
  { type: "medication.administered", label: "用药" },
  { type: "behavior.observed", label: "行为" },
  { type: "diary.created", label: "备注", payload: {} },
];

export const EVENT_LABELS: Record<string, string> = {
  "daily.meal": "进食",
  "daily.drink": "饮水",
  "daily.elimination": "排泄",
  "daily.walk": "散步",
  "daily.play": "玩耍",
  "daily.weight": "体重",
  "daily.sleep": "睡眠",
};
