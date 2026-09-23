/** OWN-011 Welfare 常量与类型（原 page.tsx 顶部常量，拆分时原样迁移）。 */
export const WELFARE_EVENT_TYPES = [
  "daily.sleep",
  "daily.play",
  "daily.walk",
  "daily.weight",
  "daily.elimination",
];

export const KIND_LABELS: Record<string, string> = {
  CHOICE: "选择/控制感",
  ENVIRONMENT_LOAD: "环境负荷",
  STRESS_RECOVERY: "压力恢复",
  QOL_QUESTIONNAIRE: "生活质量问卷",
  "daily.sleep": "休息",
  "daily.play": "玩耍/丰富化",
  "daily.walk": "外出活动",
  "daily.weight": "体况",
  "daily.elimination": "排泄质量",
};

export interface WelfareProfile {
  pet_id: string;
  profile?: {
    domains?: Record<string, unknown>;
    notes?: string;
    updated_at?: string | null;
  } | null;
}

export interface WelfareEvidence {
  observation_counts: Record<string, number>;
  sources: string[];
  notice?: string;
}
