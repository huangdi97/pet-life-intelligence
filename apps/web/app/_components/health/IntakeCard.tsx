"use client";

import type { IntakeStep } from "@pli/api-client";

interface IntakeCardProps {
  openQuestions: IntakeStep[];
  answeredQuestions: IntakeStep[];
  answer: string;
  setAnswer: (v: string) => void;
  onSubmit: (questionId: string) => void;
  onGenerate: () => void;
}

/** OWN-005 动态追问（Intake）：规则 + AI 生成问题，答案回流事件。 */
export function IntakeCard({
  openQuestions,
  answeredQuestions,
  answer,
  setAnswer,
  onSubmit,
  onGenerate,
}: IntakeCardProps) {
  return (
    <div className="card">
      <h2>动态追问（Intake）</h2>
      <button className="btn" onClick={onGenerate}>
        生成追问问题（规则 + AI）
      </button>
      {openQuestions.map((q) => (
        <div key={q.question_id} style={{ marginTop: 10 }}>
          <div>
            <span className="badge">{q.asked_by}</span> {q.question_text}
          </div>
          <div className="row" style={{ marginTop: 6 }}>
            <input
              style={{ maxWidth: 420 }}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="回答这个问题…"
            />
            <button className="btn primary" onClick={() => onSubmit(q.question_id)}>
              提交
            </button>
          </div>
        </div>
      ))}
      {answeredQuestions.map((s) => (
        <div key={s.question_id} className="muted" style={{ marginTop: 6 }}>
          ✔ {s.question_text} → {s.answer_text}
        </div>
      ))}
    </div>
  );
}
