"use client";

import { CitationChip } from "@pli/ui-kit";
import { t } from "../../../lib/i18n";
import type { AskAnswer } from "../constants";

interface AnswerPanelProps {
  answer: AskAnswer;
  citations: Array<{ label: string; event_id?: string }>;
  basePath: () => string;
}

/** OWN-015 AI 回答块：Facts/Inference/Sources/Uncertainty/Action；Citation 跳转 Timeline。 */
export function AnswerPanel({ answer, citations, basePath }: AnswerPanelProps) {
  return (
    <div className="pli-state" style={{ textAlign: "left", marginTop: 12 }}>
      <div className="pli-ai-answer-head">
        <span className="badge pli-badge--ai">{t("agent.aiBadge")}</span>
        <span className="pli-ai-answer-title">{t("agent.answer")}</span>
      </div>
      {answer.answer && <p style={{ margin: "8px 0 0" }}>{answer.answer}</p>}
      {answer.facts && answer.facts.length > 0 && (
        <>
          <div className="muted" style={{ marginTop: 8 }}>
            {t("agent.facts")}
          </div>
          <ul className="pli-ai-facts">
            {answer.facts.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </>
      )}
      {answer.inference && (
        <>
          <div className="muted" style={{ marginTop: 8 }}>
            {t("agent.inference")}
          </div>
          <div className="pli-ai-inference">{answer.inference}</div>
        </>
      )}
      {citations.length > 0 && (
        <div className="pli-ai-citations">
          <span className="pli-ai-citations-label">{t("agent.sources")}：</span>
          {citations.map((c, i) => (
            <CitationChip
              key={i}
              label={c.label}
              eventId={c.event_id}
              onClick={
                c.event_id
                  ? (eventId) => {
                      window.location.href = new URL(
                        `${basePath()}/timeline?event=${eventId}`,
                        window.location.origin,
                      ).toString();
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
      {answer.uncertainty && (
        <div className="pli-ai-uncertainty pli-notice">
          {t("agent.uncertainty")}：{answer.uncertainty}
        </div>
      )}
      {answer.action && (
        <div className="pli-ai-action">
          {t("agent.action")}：{answer.action}
        </div>
      )}
    </div>
  );
}
