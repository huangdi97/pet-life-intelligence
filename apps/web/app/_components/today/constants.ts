import type { LifeEvent } from "@pli/api-client";
import type { QuickLogType } from "@pli/ui-kit";

/** OWN-001 Today 常量：快速记录类型 / 事件文案标签（原 page.tsx 顶部常量，拆分时原样迁移）。 */
export interface QuickLogItem {
  type: string;
  label: string;
  payload: Record<string, string | number>;
}

export interface TodayData {
  pet: { id: string; name: string; species: string };
  date: string;
  event_counts: Record<string, number>;
  events: LifeEvent[];
}

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
