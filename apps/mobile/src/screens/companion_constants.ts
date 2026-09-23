/** CompanionScreen constants (colocated): feature flag, gate copy, layer model. */

export const COMPANION_FLAG = process.env.PLIDEBUG_COMPANION === "1";

export const PROTOTYPE_GATE_TEXT = "陪伴为前端原型，硬件集成未激活";

export interface CompanionLayer {
  key: string;
  zh: string;
  en: string;
  desc: string;
  controls: string[];
}

export const LAYERS: CompanionLayer[] = [
  {
    key: "observe",
    zh: "观察",
    en: "Observe",
    desc: "汇总设备观察到的最近活动与状态变化，只展示真实事件来源。",
    controls: [],
  },
  {
    key: "presence",
    zh: "在场",
    en: "Presence",
    desc: "家庭成员与宠物的在场时段，来自真实交接与授权记录。",
    controls: ["讲话", "短语音"],
  },
  {
    key: "enrichment",
    zh: "丰富化",
    en: "Enrichment",
    desc: "丰富化活动建议与执行记录；建议不等于诊断或训练处方。",
    controls: ["零食", "玩耍"],
  },
  {
    key: "learned",
    zh: "习得互动",
    en: "Learned Interaction",
    desc: "从历史互动中总结的偏好与基线（provenance 可追踪）。",
    controls: ["互动按钮"],
  },
];
