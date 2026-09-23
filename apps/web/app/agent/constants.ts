import { t } from "../../lib/i18n";

export interface AskAnswer {
  question?: string;
  answer?: string;
  facts?: string[];
  inference?: string | null;
  citations?: Array<{ label?: string; event_id?: string } | string>;
  sources?: Array<{ label?: string; event_id?: string } | string>;
  uncertainty?: string | null;
  action?: string | null;
  sufficient?: boolean;
  detail?: string;
  note?: string;
  limited?: boolean;
  external_blocked?: boolean;
}

export type Tab = "ask" | "brief" | "find" | "plan" | "explain";

export const SUGGESTIONS = [
  "最近体重有什么变化？",
  "上次耳朵异常是什么时候？",
  "今天还有什么没完成？",
  "最近训练进度怎么样？",
];

export const TABS: Array<{ id: Tab; label: string }> = [
  { id: "ask", label: t("agent.tabAsk") },
  { id: "brief", label: t("agent.tabBrief") },
  { id: "find", label: t("agent.tabFind") },
  { id: "plan", label: t("agent.tabPlan") },
  { id: "explain", label: t("agent.tabExplain") },
];
