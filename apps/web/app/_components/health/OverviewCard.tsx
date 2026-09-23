"use client";

import type { HealthEventDetail } from "@pli/api-client";
import { EmergencyAction, RiskBanner, type RiskLevel } from "@pli/ui-kit";
import { fmtTime } from "../../../lib/hooks";
import { TriageBadge } from "../../../components/ui";

interface OverviewCardProps {
  data: HealthEventDetail;
  level: string | null;
  isRiskLevel: boolean;
}

/** OWN-005 健康详情头部：分级 + 主诉 + 红旗（医疗安全信息独立组件，不埋入普通 AI 对话文本）。 */
export function OverviewCard({ data, level, isRiskLevel }: OverviewCardProps) {
  return (
    <div className="card">
      <div className="row">
        <TriageBadge level={data.latest_triage_level} />
        <span className={`badge status-${data.status}`}>{data.status}</span>
        <span className="muted">分级由规则引擎给出 · AI 不能降低等级</span>
      </div>
      {isRiskLevel && (
        <RiskBanner
          level={level as RiskLevel}
          reasons={data.triage_history
            .flatMap((t) => t.matched_rules.map((r) => r.rule_id))
            .slice(0, 4)}
          next_action={level === "EMERGENCY" ? "立即联系兽医/急诊" : undefined}
        />
      )}
      <h3>主诉</h3>
      <p>{data.chief_complaint}</p>
      {level === "EMERGENCY" && (
        <>
          <div className="alert emergency">
            规则引擎命中紧急红旗：建议立即联系兽医/急诊。
          </div>
          <EmergencyAction instructions="规则引擎命中紧急红旗：请立即联系兽医或前往最近的宠物急诊。" />
        </>
      )}
      <h3>分级历史（Rule Engine）</h3>
      {data.triage_history.map((t) => (
        <div key={t.id} className="row" style={{ margin: "4px 0" }}>
          <TriageBadge level={t.level} />
          <span className="muted">
            {t.engine} v{t.version} · 规则 {t.matched_rules.map((r) => r.rule_id).join(", ") || "无"} ·{" "}
            {fmtTime(t.assessed_at)}
          </span>
        </div>
      ))}
    </div>
  );
}
