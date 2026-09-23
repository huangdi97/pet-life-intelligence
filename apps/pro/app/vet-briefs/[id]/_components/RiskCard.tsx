"use client";

import type { HealthEventDetail } from "@pli/api-client";
import { fmtTime } from "../../../../lib/hooks";
import { TriageBadge } from "../../../../components/ui";

export function RiskCard({ d }: { d: HealthEventDetail }) {
  return (
    <div className="card">
      <h2>风险 · Risk（来自独立规则引擎，非本页判断）</h2>
      <div className="row" style={{ gap: 6 }}>
        <TriageBadge level={d.latest_triage_level} />
      </div>
      {d.triage_history.length > 0 ? (
        <table className="pli-table" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th>分级</th>
              <th>引擎</th>
              <th>版本</th>
              <th>命中规则</th>
              <th>评估时间</th>
            </tr>
          </thead>
          <tbody>
            {d.triage_history.map((t) => (
              <tr key={t.id}>
                <td><span className={`badge ${t.level}`}>{t.level}</span></td>
                <td><span className="badge">{t.engine}</span></td>
                <td>{t.version || "—"}</td>
                <td>{t.matched_rules.length ? t.matched_rules.join("、") : "—"}</td>
                <td>{fmtTime(t.assessed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>暂无分级评估记录。</p>
      )}
      <p className="notice-ai">分级建议由独立规则引擎产生；未触发红旗规则时本页仅显示事实记录，不作健康结论。</p>
    </div>
  );
}
