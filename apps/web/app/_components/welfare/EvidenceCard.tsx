"use client";

import { useState } from "react";
import { type Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";
import { State } from "../../../components/ui";
import { KIND_LABELS, type WelfareEvidence } from "./constants";

interface EvidenceCardProps {
  evidence: Async<WelfareEvidence>;
  kind: string;
  setKind: (v: string) => void;
  busy: boolean;
  onRecord: () => Promise<boolean>;
}

/** OWN-011 证据（带来源的可观察记录）+ 记录观察控件。 */
export function EvidenceCard({ evidence, kind, setKind, busy, onRecord }: EvidenceCardProps) {
  const [recordOpen, setRecordOpen] = useState(false);

  async function saveObservation() {
    if (busy) return;
    const saved = await onRecord();
    if (saved) setRecordOpen(false);
  }

  return (
    <section className="v4-sec">
      <h2 className="v4-sec-title">观察依据</h2>
      <State
        state={evidence.state}
        error={evidence.error ? mapErrorMessage(evidence.error) : null}
        onRetry={evidence.reload}
        empty={t("welfare.noData")}
      >
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {Object.entries(evidence.data?.observation_counts ?? {}).map(([k, n]) => (
            <span key={k} className="badge">
              {KIND_LABELS[k] ?? "其他观察"} × {n}
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
      <div className="v5-inline-record" aria-label="记录新的生活观察">
        <div className="v4-sec-head">
          <p className="v4-note">需要补充新情况时再记录；已有事实与趋势始终优先显示。</p>
          <button
            type="button"
            className="btn"
            data-testid="pli.welfare.record.toggle"
            aria-expanded={recordOpen}
            aria-controls="pli-welfare-record-form"
            onClick={() => setRecordOpen((value) => !value)}
          >
            {recordOpen ? "收起" : "记录观察"}
          </button>
        </div>
        {recordOpen ? (
          <div id="pli-welfare-record-form" className="row" style={{ marginTop: 8, gap: 8 }}>
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="观察类型" style={{ maxWidth: 220 }}>
              <option value="STRESS_RECOVERY">压力恢复</option>
              <option value="ENVIRONMENT_LOAD">环境负荷</option>
              <option value="CHOICE">选择与自主</option>
              <option value="QOL_QUESTIONNAIRE">生活质量问卷</option>
            </select>
            <button
              className="btn primary"
              data-testid="pli.welfare.record.submit"
              disabled={busy}
              onClick={() => void saveObservation()}
            >
              {busy ? "记录中…" : "保存观察"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
