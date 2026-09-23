"use client";

import { ErrorNote } from "../../../../../components/ui";

export const OUTCOMES: Array<{ value: string; label: string }> = [
  { value: "RECOVERED", label: "康复 RECOVERED" },
  { value: "IMPROVED", label: "好转 IMPROVED" },
  { value: "UNCHANGED", label: "无变化 UNCHANGED" },
  { value: "WORSENED", label: "恶化 WORSENED" },
  { value: "RELAPSED", label: "复发 RELAPSED" },
  { value: "REFERRED", label: "转诊 REFERRED" },
  { value: "UNRESOLVED", label: "未解决 UNRESOLVED" },
];

export function RecordOutcomeCard({
  outcome,
  onOutcomeChange,
  notes,
  onNotesChange,
  actionError,
  success,
  busy,
  onSubmit,
  onBack,
}: {
  outcome: string;
  onOutcomeChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  actionError: string | null;
  success: string | null;
  busy: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="card">
      <h2>记录新结局</h2>
      <label className="field">
        结局 Outcome
        <select value={outcome} onChange={(e) => onOutcomeChange(e.target.value)} aria-label="选择结局">
          {OUTCOMES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        备注（可选）
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="补充观察（例如：精神与食欲变化）"
        />
      </label>
      {actionError && <ErrorNote message={actionError} />}
      {success && <div className="alert info">{success}</div>}
      <div className="row">
        <button className="btn primary" onClick={onSubmit} disabled={busy}>
          {busy ? "记录中…" : "记录结局"}
        </button>
        <button className="btn" onClick={onBack}>
          返回患者档案
        </button>
      </div>
      <p className="notice-ai">
        结局记录会写入事件日志（health.outcome_recorded），带 pet / actor / time / source。
      </p>
    </div>
  );
}
