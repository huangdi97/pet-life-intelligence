"use client";

import type { HealthEventDetail } from "@pli/api-client";
import { fmtTime } from "../../../lib/hooks";

const OUTCOME_OPTIONS = [
  ["RECOVERED", "已恢复"],
  ["IMPROVED", "有改善"],
  ["UNCHANGED", "暂无变化"],
  ["WORSENED", "变差"],
  ["RELAPSED", "再次出现"],
  ["REFERRED", "已转诊 / 就医"],
  ["UNRESOLVED", "仍未解决"],
] as const;

function outcomeLabel(value: string): string {
  return OUTCOME_OPTIONS.find(([key]) => key === value)?.[1] ?? "已记录";
}

interface OutcomeCardProps {
  outcome: string;
  setOutcome: (v: string) => void;
  outcomeNotes: string;
  setOutcomeNotes: (v: string) => void;
  onRecord: () => void;
  outcomes: HealthEventDetail["outcomes"];
}

/** OWN-005 Outcome / 随访结局：关闭本次健康事件并记录结局（PLI-063）。 */
export function OutcomeCard({
  outcome,
  setOutcome,
  outcomeNotes,
  setOutcomeNotes,
  onRecord,
  outcomes,
}: OutcomeCardProps) {
  return (
    <div className="card">
      <h2>Outcome / 随访结局</h2>
      <p className="muted">关闭本次健康事件并记录结局。</p>
      <div className="grid2">
        <label className="field">
          结局
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="">选择…</option>
            {OUTCOME_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          备注
          <input value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} />
        </label>
      </div>
      <button className="btn primary" onClick={onRecord} disabled={!outcome}>
        记录结局
      </button>
      {outcomes.map((o, i) => (
        <div key={i} className="muted" style={{ marginTop: 6 }}>
          已记录：{outcomeLabel(o.outcome)}{o.notes ? ` · ${o.notes}` : ""} · {fmtTime(o.recorded_at)}
        </div>
      ))}
    </div>
  );
}
