"use client";

import { use, useState } from "react";
import { api, type HealthEventDetail, type VetBriefContent } from "@pli/api-client";
import type { RiskLevel } from "@pli/ui-kit";
import { useAsync } from "../../../lib/hooks";
import { ErrorNote, State } from "../../../components/ui";
import { IntakeCard } from "../../_components/health/IntakeCard";
import { ObservationCard } from "../../_components/health/ObservationCard";
import { OutcomeCard } from "../../_components/health/OutcomeCard";
import { OverviewCard } from "../../_components/health/OverviewCard";
import { VetBriefCard } from "../../_components/health/VetBriefCard";

/** OWN-005 Health 详情（Stage H §20-22）：发现异常→Intake→Evidence→Triage→Vet Brief→Outcome。
 *  医疗安全信息使用独立组件（RiskBanner/RedFlagReason/NextActionCard/EmergencyAction/EvidenceList），
 *  不埋入普通 AI 对话文本；Emergency 不埋在普通 AI 回答里。
 *  E2E 契约保留：主诉 / .badge.EMERGENCY / .alert.emergency 含立即 / 生成 Vet Brief / 摘要预览 / 不是兽医诊断。 */
const RISK_LEVELS: RiskLevel[] = ["NORMAL", "NOTICE", "MONITOR", "VET_SOON", "URGENT", "EMERGENCY"];

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
  const answeredQuestions = detail.data?.intake_steps.filter((s) => s.answer_text) ?? [];
  const level = detail.data?.latest_triage_level ?? null;
  const isRiskLevel = level != null && RISK_LEVELS.includes(level as RiskLevel);

  return (
    <main>
      <h1>健康事件</h1>
      <State state={detail.state} error={detail.error} onRetry={detail.reload}>
        {detail.data && (
          <>
            <OverviewCard data={detail.data} level={level} isRiskLevel={isRiskLevel} />

            <IntakeCard
              openQuestions={openQuestions}
              answeredQuestions={answeredQuestions}
              answer={answer}
              setAnswer={setAnswer}
              onSubmit={submitAnswer}
              onGenerate={generateQuestions}
            />

            <ObservationCard
              obsText={obsText}
              setObsText={setObsText}
              onAdd={addObservation}
              observations={detail.data.observations}
            />

            <VetBriefCard
              brief={brief}
              share={share}
              briefCount={detail.data.vet_briefs.length}
              hasBriefs={detail.data.vet_briefs.length > 0}
              onMakeBrief={makeBrief}
              onShareBrief={shareBrief}
            />

            <OutcomeCard
              outcome={outcome}
              setOutcome={setOutcome}
              outcomeNotes={outcomeNotes}
              setOutcomeNotes={setOutcomeNotes}
              onRecord={recordOutcome}
              outcomes={detail.data.outcomes}
            />
            <ErrorNote message={error} />
          </>
        )}
      </State>
    </main>
  );
}
