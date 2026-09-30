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

export interface Suggestion {
  id: "explain" | "summary" | "records" | "plan";
  label: string;
  query: string;
  href?: string;
}

export const SUGGESTIONS: Suggestion[] = [
  { id: "explain", label: "解释变化", query: "最近有什么值得注意的变化？" },
  { id: "summary", label: "生成总结", query: "帮我生成最近一段时间的总结" },
  { id: "records", label: "查看记录", query: "", href: "/timeline" },
  { id: "plan", label: "计划下一步", query: "接下来可以做什么？" },
];

export const TABS: Array<{ id: Tab; label: string }> = [
  { id: "ask", label: t("agent.tabAsk") },
  { id: "brief", label: t("agent.tabBrief") },
  { id: "find", label: t("agent.tabFind") },
  { id: "plan", label: t("agent.tabPlan") },
  { id: "explain", label: t("agent.tabExplain") },
];
