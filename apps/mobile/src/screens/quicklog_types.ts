/** QuickLogScreen shared types + constants (colocated so the screen stays small). */

export type LogType = (typeof LOG_TYPES)[number];

export const LOG_TYPES: Array<{ key: string; zh: string; event_type: string }> = [
  { key: "meal", zh: "喂食", event_type: "daily.meal" },
  { key: "drink", zh: "饮水", event_type: "daily.drink" },
  { key: "elimination", zh: "排泄", event_type: "daily.elimination" },
  { key: "walk", zh: "散步", event_type: "daily.walk" },
  { key: "play", zh: "玩耍", event_type: "daily.play" },
  { key: "sleep", zh: "睡觉", event_type: "daily.sleep" },
  { key: "weight", zh: "体重", event_type: "daily.weight" },
  { key: "medication", zh: "用药", event_type: "medication.administered" },
  { key: "behavior", zh: "行为", event_type: "behavior.observed" },
  { key: "diary", zh: "备注", event_type: "diary.created" },
];

export const ELIMINATION_KINDS: Array<{ key: string; zh: string }> = [
  { key: "urine", zh: "尿" },
  { key: "stool", zh: "便" },
  { key: "both", zh: "都有" },
];

export function clampMinutes(raw: string): number {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 24 * 60);
}
