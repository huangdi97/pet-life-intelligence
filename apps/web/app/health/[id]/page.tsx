"use client";

import { use, useState } from "react";
import {
  api,

  type HealthEventDetail,
  type VetBriefContent,
} from "@pli/api-client";
import { fmtTime, useAsync } from "../../../lib/hooks";
import { ErrorNote, State, TriageBadge } from "../../../components/ui";

/** Surfaces 10 + 12: health event detail — intake Q&A, evidence, AI/rule
 *  observations (strictly separated), triage, Vet Brief + share, Outcome. */
export default function HealthEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const detail = useAsync<HealthEventDetail>(
    () => api.get<HealthEventDetail>(`/health-events/${id}`),
    [id],
  );
  const [answer, setAnswer] = useState("");
  const [obsText, setObsText] = useState("");
  const [brief, setBrief] = useState<{ id: string; content: VetBriefContent } | null>(null);
  const [share, setShare] = useState<{ token: string; expires_at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");

  async function generateQuestions() {
    setError(null);
    try {
      await api.post(`/health-events/${id}/questions`, {});
      detail.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function submitAnswer(questionId: string) {
    if (!answer.trim()) return;
    setError(null);
    try {
      await api.post(`/health-events/${id}/answers`, {
        answers: [{ question_id: questionId, answer: answer.trim() }],
      });
      setAnswer("");
      detail.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function addObservation() {
    if (!obsText.trim()) return;
    setError(null);
    try {
      await api.post(`/health-events/${id}/observations`, {
        texts: [obsText.trim()],
        use_ai: true,
      });
      setObsText("");
      detail.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function makeBrief() {
    setError(null);
    try {
      const r = await api.post<{ vet_brief_id: string; content: VetBriefContent }>(
        `/health-events/${id}/vet-brief`,
        {},
      );
      setBrief({ id: r.vet_brief_id, content: r.content });
      detail.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function shareBrief(briefId: string) {
    setError(null);
    try {
      const r = await api.post<{ share_token: string; expires_at: string }>(
        `/vet-briefs/${briefId}/share`,
        { expires_in_hours: 72 },
      );
      setShare({ token: r.share_token, expires_at: r.expires_at });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function recordOutcome() {
    if (!outcome) return;
    setError(null);
    try {
      await api.post(`/health-events/${id}/outcomes`, {
        outcome,
        notes: outcomeNotes,
      });
      setOutcome("");
      setOutcomeNotes("");
      detail.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const openQuestions = detail.data?.intake_steps.filter((s) => !s.answer_text) ?? [];

  return (
    <main>
      <h1>健康事件</h1>
      <State state={detail.state} error={detail.error} onRetry={detail.reload}>
        {detail.data && (
          <>
            <div className="card">
              <div className="row">
                <TriageBadge level={detail.data.latest_triage_level} />
                <span className={`badge status-${detail.data.status}`}>{detail.data.status}</span>
                <span className="muted">分级由规则引擎给出 · AI 不能降低等级</span>
              </div>
              <h3>主诉</h3>
              <p>{detail.data.chief_complaint}</p>
              {detail.data.latest_triage_level === "EMERGENCY" && (
                <div className="alert emergency">
                  规则引擎命中紧急红旗：建议立即联系兽医/急诊。
                </div>
              )}
              <h3>分级历史（Rule Engine）</h3>
              {detail.data.triage_history.map((t) => (
                <div key={t.id} className="row" style={{ margin: "4px 0" }}>
                  <TriageBadge level={t.level} />
                  <span className="muted">
                    {t.engine} v{t.version} · 规则 {t.matched_rules.map((r) => r.rule_id).join(", ") || "无"} ·{" "}
                    {fmtTime(t.assessed_at)}
                  </span>
                </div>
              ))}
            </div>

            <div className="card">
              <h2>动态追问（Intake）</h2>
              <button className="btn" onClick={generateQuestions}>
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
                    <button className="btn primary" onClick={() => submitAnswer(q.question_id)}>
                      提交
                    </button>
                  </div>
                </div>
              ))}
              {detail.data.intake_steps.filter((s) => s.answer_text).map((s) => (
                <div key={s.question_id} className="muted" style={{ marginTop: 6 }}>
                  ✔ {s.question_text} → {s.answer_text}
                </div>
              ))}
            </div>

            <div className="card">
              <h2>可观察事实（严格分来源）</h2>
              <div className="row">
                <input
                  style={{ maxWidth: 420 }}
                  value={obsText}
                  onChange={(e) => setObsText(e.target.value)}
                  placeholder="补充一段主人陈述，AI 会提取可观察事实"
                />
                <button className="btn" onClick={addObservation}>
                  添加并提取
                </button>
              </div>
              <ul className="tl" style={{ marginTop: 10 }}>
                {detail.data.observations.map((o) => (
                  <li key={o.id}>
                    <div className="tl-head">
                      <span className={`badge ${o.kind === "AI_OBSERVATION" ? "AI_DERIVED" : ""}`}>
                        {o.kind}
                      </span>
                      <span className="tl-time">{fmtTime(o.created_at)}</span>
                    </div>
                    <div className="tl-body">{o.text}</div>
                  </li>
                ))}
              </ul>
              <p className="notice-ai">
                AI 仅整理主人陈述并标注“主人报告：”，不做诊断、不生成结论；规则结论与兽医确认单独标记。
              </p>
            </div>

            <div className="card">
              <h2>Vet Brief（就诊前摘要）</h2>
              <p className="muted">信息整理，不是兽医诊断。可生成只读分享链接（72 小时有效，可撤销，访问留审计）。</p>
              <button className="btn primary" onClick={makeBrief}>
                生成 Vet Brief
              </button>
              {detail.data.vet_briefs.length > 0 && (
                <p className="muted">已有 {detail.data.vet_briefs.length} 份摘要。</p>
              )}
              {brief && (
                <div style={{ marginTop: 10 }}>
                  <h3>摘要预览</h3>
                  <p>{brief.content.ai_narrative_draft}</p>
                  <p className="muted">
                    引擎：规则 {brief.content.engine_versions.rule_engine || "—"} · AI{" "}
                    {brief.content.engine_versions.ai_model}
                  </p>
                  <div className="notice-ai">{brief.content.ai_disclaimer}</div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <button className="btn" onClick={() => shareBrief(brief.id)}>
                      生成分享链接
                    </button>
                  </div>
                  {share && (
                    <div className="alert info">
                      分享链接：{`/api/v1/vet-briefs/shared/${share.token}`}（至 {fmtTime(share.expires_at)}）
                    </div>
                  )}
                </div>
              )}
            </div>

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
              <button className="btn primary" onClick={recordOutcome} disabled={!outcome}>
                记录结局
              </button>
              {detail.data.outcomes.map((o, i) => (
                <div key={i} className="muted" style={{ marginTop: 6 }}>
                  已记录：{o.outcome} · {o.notes} · {fmtTime(o.recorded_at)}
                </div>
              ))}
            </div>
            <ErrorNote message={error} />
          </>
        )}
      </State>
    </main>
  );
}
