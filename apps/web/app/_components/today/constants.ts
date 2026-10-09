import type { LifeEvent } from "@pli/api-client";
import type { QuickLogType } from "@pli/ui-kit";

/** OWN-001 Today 常量：快速记录类型 / 事件文案标签（原 page.tsx 顶部常量，拆分时原样迁移）。 */
export interface TodayData {
  pet: { id: string; name: string; species: string };
  date: string;
  event_counts: Record<string, number>;
  events: LifeEvent[];
}

export const QUICK_TYPES: QuickLogType[] = [
  {
    type: "daily.meal",
    label: "喂食",
    fields: [
      { key: "food_type", label: "吃了什么", placeholder: "如：鸡肉配方粮" },
      { key: "amount", label: "大约多少", placeholder: "如：80", inputMode: "decimal" },
      { key: "unit", label: "单位", placeholder: "如：g" },
    ],
  },
  {
    type: "daily.drink",
    label: "饮水",
    fields: [
      { key: "amount", label: "大约多少", placeholder: "如：120", inputMode: "decimal" },
      { key: "unit", label: "单位", placeholder: "如：ml" },
    ],
  },
  {
    type: "daily.elimination",
    label: "排泄",
    fields: [
      {
        key: "kind",
        label: "类型",
        options: [
          { value: "urine", label: "尿" },
          { value: "stool", label: "便" },
          { value: "both", label: "都有" },
        ],
      },
      {
        key: "quality",
        label: "观察到的状态",
        options: [
          { value: "normal", label: "看起来和平时一样" },
          { value: "abnormal", label: "和平时不一样" },
          { value: "concerning", label: "明显需要关注" },
        ],
      },
    ],
  },
  {
    type: "daily.walk",
    label: "散步",
    fields: [{ key: "duration_minutes", label: "时长（分钟，可选）", placeholder: "如：30", inputMode: "numeric", min: 1 }],
  },
  {
    type: "daily.play",
    label: "玩耍",
    fields: [
      { key: "duration_minutes", label: "时长（分钟）", placeholder: "如：15", inputMode: "numeric", required: true },
      { key: "activity_type", label: "玩了什么", placeholder: "如：追球" },
    ],
  },
  {
    type: "daily.weight",
    label: "体重",
    fields: [{ key: "weight_kg", label: "体重（kg）", placeholder: "如：11.5", inputMode: "decimal", required: true, min: 0.01 }],
  },
];

export const SHEET_TYPES: QuickLogType[] = [
  ...QUICK_TYPES,
  { type: "daily.sleep", label: "睡觉", fields: [{ key: "duration_minutes", label: "时长（分钟）", placeholder: "如：60", inputMode: "numeric", required: true }] },
  // Medication and Behavior require their governed domain forms; Quick Log
  // must not fabricate an empty medication/behavior payload.
  { type: "medication.administered", label: "用药", href: "/medication" },
  { type: "behavior.observed", label: "行为", href: "/behavior" },
  { type: "health", label: "健康", href: "/health" },
  { type: "diary.created", label: "备注", textInput: { label: "备注内容", placeholder: "想记录点什么？", maxLength: 1000 } },
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
