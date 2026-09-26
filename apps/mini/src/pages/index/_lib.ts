import type { LifeEvent } from "../../services/api";

export interface TodayData {
  pet: { id: string; name: string; species: string };
  date: string;
  event_counts: Record<string, number>;
  events: LifeEvent[];
}

export interface HealthEventRow {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
  opened_at: string;
}

export interface DeviceRow {
  device_id: string;
  provider: string;
  display_name: string;
  status: string;
}

export interface QuickField {
  key: string;
  label: string;
  initial: string;
  numeric?: boolean;
}

export interface QuickType {
  type: string;
  label: string;
  fields: QuickField[];
  defaults: Record<string, string | number>;
}

/** Quick Log Sheet 类型 — 只复用后端 event_types.py 已注册的 daily.* 事件，
 *  payload 字段与 canonical schema 一致，不发明新事件/新字段。 */
export const QUICK_TYPES: QuickType[] = [
  { type: "daily.meal", label: "喂食", fields: [{ key: "amount", label: "食量（g）", initial: "100" }, { key: "food_type", label: "食物类型", initial: "狗粮" }], defaults: { unit: "g" } },
  { type: "daily.drink", label: "饮水", fields: [{ key: "amount", label: "饮水量（ml）", initial: "200" }], defaults: { unit: "ml" } },
  { type: "daily.elimination", label: "排泄", fields: [{ key: "kind", label: "类型（urine/stool/both）", initial: "urine" }, { key: "quality", label: "状态（normal/abnormal）", initial: "normal" }], defaults: {} },
  { type: "daily.walk", label: "散步", fields: [{ key: "duration_minutes", label: "时长（分钟）", initial: "20", numeric: true }], defaults: { intensity: "normal" } },
  { type: "daily.play", label: "玩耍", fields: [{ key: "duration_minutes", label: "时长（分钟）", initial: "15", numeric: true }], defaults: { activity_type: "fetch" } },
  { type: "daily.weight", label: "体重", fields: [{ key: "weight_kg", label: "体重（kg）", initial: "12.0" }], defaults: {} },
  { type: "daily.sleep", label: "睡眠", fields: [{ key: "duration_minutes", label: "时长（分钟）", initial: "60", numeric: true }], defaults: { quality: "" } },
  { type: "diary.created", label: "备注", fields: [{ key: "text", label: "备注内容", initial: "" }], defaults: {} },
];

/** Quick Log 一级（高频，2 taps 完成）与二级（轻表单或进入对应页面）。 */
export const QUICK_LEVEL1 = ["daily.meal", "daily.drink", "daily.elimination", "daily.walk"];
export const QUICK_LEVEL2 = ["daily.play", "daily.sleep", "daily.weight", "diary.created"];

/** 二级中需要进入完整页面的入口（不发明新事件类型）。 */
export const QUICK_NAV: Array<{ label: string; url: string }> = [
  { label: "用药", url: "/pages/medication/index" },
  { label: "行为", url: "/pages/behavior/index" },
  { label: "健康", url: "/pages/health/index" },
];

export function quickTypeOf(type: string): QuickType | undefined {
  return QUICK_TYPES.find((t) => t.type === type);
}

/** 值得关注：后端 triage 分级非 NORMAL 的进行中健康事件（只显示后端分级值）。 */
export const ATTENTION_LEVELS = ["NOTICE", "MONITOR", "VET_SOON", "URGENT", "EMERGENCY"];

export const DAILY_COUNT_LABELS: Record<string, string> = {
  "daily.meal": "喂食",
  "daily.drink": "饮水",
  "daily.elimination": "排泄",
  "daily.walk": "散步",
  "daily.play": "玩耍",
  "daily.weight": "体重",
  "daily.sleep": "睡眠",
  "diary.created": "备注",
};

export function deviceStatusLabel(status: string): string {
  if (status === "LINKED") return "已连接";
  if (status === "EXPIRED" || status === "REVOKED") return "已断开";
  return "状态未知";
}

import { speciesLabel } from "../../utils/format";
import { petAgeText, sexLabelZh, eventTypeLabel, eventPayloadText, sourceLabel } from "../../utils/labels";
import type { LifeStreamRow } from "../../components/timeline/LifeStream";

export const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function timeContextText(): string {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日 · ${DAY_NAMES[d.getDay()]}`;
}

export function heroIdentity(pet: { species: string; breed: string; birth_date: string | null; sex: string } | undefined): string {
  if (!pet) return "宠物生活智能";
  const parts = [speciesLabel(pet.species), pet.breed, petAgeText(pet.birth_date), sexLabelZh(pet.sex)].filter(Boolean);
  return parts.join(" · ");
}

export function eventRowFromEvent(e: { event_id: string; event_type: string; occurred_at: string; payload: Record<string, unknown>; source_type: string }): LifeStreamRow {
  const t = new Date(e.occurred_at);
  const hh = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  return {
    id: e.event_id,
    time: hh,
    typeLabel: eventTypeLabel(e.event_type),
    detail: eventPayloadText(e.payload),
    source: sourceLabel(e.source_type),
  };
}
