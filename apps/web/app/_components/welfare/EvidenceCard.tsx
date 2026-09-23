"use client";

import { type Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";
import { State } from "../../../components/ui";
import { KIND_LABELS, type WelfareEvidence } from "./constants";

interface EvidenceCardProps {
  evidence: Async<WelfareEvidence>;
  kind: string;
  setKind: (v: string) => void;
  busy: boolean;
  onRecord: () => void;
}

/** OWN-011 证据（带来源的可观察记录）+ 记录观察控件。 */
export function EvidenceCard({ evidence, kind, setKind, busy, onRecord }: EvidenceCardProps) {
  return (
    <div className="card">
      <h2>{t("welfare.evidence")}</h2>
      <State
        state={evidence.state}
        error={evidence.error ? mapErrorMessage(evidence.error) : null}
        onRetry={evidence.reload}
        empty={t("welfare.noData")}
      >
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {Object.entries(evidence.data?.observation_counts ?? {}).map(([k, n]) => (
            <span key={k} className="badge">
              {KIND_LABELS[k] ?? k} × {n}
            </span>
          ))}
          {Object.keys(evidence.data?.observation_counts ?? {}).length === 0 && (
            <span className="badge">{t("welfare.noData")}</span>
          )}
        </div>
        {evidence.data?.notice && (
          <p className="muted" style={{ marginTop: 8 }}>
            {evidence.data.notice}
          </p>
        )}
      </State>
      <div className="row" style={{ marginTop: 10, gap: 8 }}>
        <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="观察类型" style={{ maxWidth: 220 }}>
          <option value="STRESS_RECOVERY">压力恢复</option>
          <option value="ENVIRONMENT_LOAD">环境负荷</option>
          <option value="CHOICE">选择/控制感</option>
          <option value="QOL_QUESTIONNAIRE">生活质量问卷</option>
        </select>
        <button className="btn primary" disabled={busy} onClick={onRecord}>
          {t("welfare.record")}
        </button>
      </div>
    </div>
  );
}
