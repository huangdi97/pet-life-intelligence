"use client";

import type { HealthEventDetail } from "@pli/api-client";
import { fmtTime } from "../../../lib/hooks";

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
      <p className="muted">关闭本次健康事件并记录结局（PLI-063）。</p>
      <div className="grid2">
        <label className="field">
          结局
          <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            <option value="">选择…</option>
            {["RECOVERED", "IMPROVED", "UNCHANGED", "WORSENED", "RELAPSED", "REFERRED", "UNRESOLVED"].map(
              (o) => (
                <option key={o}>{o}</option>
              ),
            )}
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
          已记录：{o.outcome} · {o.notes} · {fmtTime(o.recorded_at)}
        </div>
      ))}
    </div>
  );
}
