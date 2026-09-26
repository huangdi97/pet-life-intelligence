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
  petName: string;
  onAsk: (q: string) => void;
  onSuggestion: (s: string) => void;
  basePath: () => string;
}

/** OWN-015 Ask 面板：建议提问 + 输入 + 回答展示（结论→依据→不确定性→下一步）。 */
export function AskPanel({
  question,
  onQuestionChange,
  asking,
  askErr,
  answer,
  citations,
  aiOff,
  petName,
  onAsk,
  onSuggestion,
  basePath,
}: AskPanelProps) {
  return (
    <div className="v4-sec" style={{ paddingTop: 6 }}>
      <div className="v4-suggest">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => onSuggestion(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="v4-ask-row">
        <input
          value={question}
          placeholder={t("agent.askPlaceholder")}
          aria-label="问题"
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAsk(question);
          }}
        />
        <button
          type="button"
          className="v4-action v4-action--primary"
          disabled={asking || !question.trim()}
          onClick={() => onAsk(question)}
        >
          {asking ? "思考中……" : t("agent.ask")}
        </button>
      </div>
      {askErr && (
        <div className="v4-error" role="alert">
          {askErr}
        </div>
      )}
      {answer && !askErr && <AnswerPanel answer={answer} citations={citations} basePath={basePath} />}
      {!answer && !askErr && !asking && aiOff && (
        <div className="v4-assistant-empty">
          AI 服务暂未开放。当前只能基于已有规则与记录回答；接入后会给出带依据的回答。
        </div>
      )}
      {!answer && !askErr && !asking && !aiOff && (
        <div className="v4-assistant-empty">
          我会基于{petName || "它"}已有的真实记录回答。你可以问最近变化、任务、训练、健康记录。
        </div>
      )}
    </div>
  );
}
