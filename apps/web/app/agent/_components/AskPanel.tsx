"use client";

import { t } from "../../../lib/i18n";
import { SUGGESTIONS, type AskAnswer, type Suggestion } from "../constants";
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
  petId: string;
  onAsk: (q: string) => void;
  onSuggestion: (s: Suggestion) => void;
  basePath: () => string;
}

/** OWN-015 Ask 面板：建议动作 + 输入 + 回答展示（结论→依据→不确定性→下一步）。 */
export function AskPanel({
  question,
  onQuestionChange,
  asking,
  askErr,
  answer,
  citations,
  aiOff,
  petName,
  petId,
  onAsk,
  onSuggestion,
  basePath,
}: AskPanelProps) {
  return (
    <div className="v4-sec" style={{ paddingTop: 6 }} data-testid="pli.assistant.chat">
      <div className="v4-suggest">
        {SUGGESTIONS.map((s) => (
          <button key={s.id} type="button" onClick={() => onSuggestion(s)} data-testid={`pli.assistant.suggestion.${s.id}`}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="v4-ask-row">
        <input
          value={question}
          placeholder={t("agent.askPlaceholder")}
          aria-label="问题"
          data-testid="pli.assistant.ask"
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
          data-testid="pli.assistant.send"
        >
          {asking ? "思考中……" : t("agent.ask")}
        </button>
      </div>
      {askErr && (
        <div className="v4-error" role="alert">
          {askErr}
        </div>
      )}
      {answer && !askErr && <AnswerPanel answer={answer} citations={citations} basePath={basePath} petId={petId} />}
      {!answer && !askErr && !asking && aiOff && (
        <div className="v4-assistant-empty">
          当前无法连接 AI 服务。已有记录、时间线与规则结果仍可正常查看；恢复连接后再继续提问。
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
