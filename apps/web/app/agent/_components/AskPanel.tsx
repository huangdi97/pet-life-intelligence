"use client";

import { t } from "../../../lib/i18n";
import { SUGGESTIONS, type AskAnswer } from "../constants";
import { AnswerPanel } from "./AnswerPanel";

interface AskPanelProps {
  question: string;
  onQuestionChange: (q: string) => void;
  asking: boolean;
  askErr: string | null;
  answer: AskAnswer | null;
  citations: Array<{ label: string; event_id?: string }>;
  aiOff: boolean;
  onAsk: (q: string) => void;
  onSuggestion: (s: string) => void;
  basePath: () => string;
}

/** OWN-015 Ask 面板：建议提问 + 输入 + AI 回答展示。 */
export function AskPanel({
  question,
  onQuestionChange,
  asking,
  askErr,
  answer,
  citations,
  aiOff,
  onAsk,
  onSuggestion,
  basePath,
}: AskPanelProps) {
  return (
    <div className="card">
      <h2>{t("agent.ask")}</h2>
      <div className="row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {SUGGESTIONS.map((s) => (
          <button key={s} className="btn" style={{ fontSize: 13 }} onClick={() => onSuggestion(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="row">
        <input
          style={{ flex: 1, minWidth: 240 }}
          value={question}
          placeholder={t("agent.askPlaceholder")}
          aria-label="问题"
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAsk(question);
          }}
        />
        <button className="btn primary" disabled={asking || !question.trim()} onClick={() => onAsk(question)}>
          {asking ? "思考中……" : t("agent.ask")}
        </button>
      </div>
      {askErr && (
        <div className="alert emergency" role="alert">
          {askErr}
        </div>
      )}
      {answer && !askErr && <AnswerPanel answer={answer} citations={citations} basePath={basePath} />}
      {!answer && !askErr && !asking && aiOff && <div className="state">{t("agent.off")}</div>}
      {!answer && !askErr && !asking && !aiOff && <div className="state">{t("agent.noAnswer")}</div>}
    </div>
  );
}
