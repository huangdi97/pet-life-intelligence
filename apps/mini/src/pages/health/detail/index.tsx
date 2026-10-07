import { useEffect, useState } from "react";
import { Button, Input, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../../services/api";
import { riskLabel } from "../../../utils/format";

interface IntakeStep {
  question_id: string;
  question_text: string;
  answer_text: string;
}
interface HealthEventDetail {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
  intake_steps: IntakeStep[];
  observations: Array<{ id: string; kind: string; text: string; created_at: string }>;
  vet_briefs: string[];
  outcomes: Array<{ outcome: string; notes: string; recorded_at: string }>;
}
const OUTCOME_OPTIONS = [
  ["RECOVERED", "已恢复"],
  ["IMPROVED", "有改善"],
  ["UNCHANGED", "暂无变化"],
  ["WORSENED", "变差"],
  ["RELAPSED", "再次出现"],
  ["REFERRED", "已转诊 / 就医"],
  ["UNRESOLVED", "仍未解决"],
] as const;

function outcomeLabel(value: string): string {
  return OUTCOME_OPTIONS.find(([key]) => key === value)?.[1] ?? "已记录";
}

interface VetBriefContent {
  chief_complaint: string;
  key_findings: Array<{ kind: string; text: string; observed_at: string }>;
  ai_disclaimer: string;
  notice: string;
  red_flags: string[];
}

export default function HealthDetail() {
  const id = String(Taro.getCurrentInstance().router?.params?.id ?? "");
  const [detail, setDetail] = useState<HealthEventDetail | null>(null);
  const [brief, setBrief] = useState<{ id: string; content: VetBriefContent } | null>(null);
  const [briefShare, setBriefShare] = useState<{ token_id: string; token: string; expires_at: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [observation, setObservation] = useState("");
  const [outcome, setOutcome] = useState("");
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!id) return;
    setState("loading");
    api.get<HealthEventDetail>(`/health-events/${id}`)
      .then((row) => {
        setDetail(row);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [id, version]);

  const openQuestion = detail?.intake_steps.find((step) => !step.answer_text) ?? null;

  async function act(work: () => Promise<unknown>, success?: string) {
    if (busy) return;
    setBusy(true);
    try {
      await work();
      setVersion((v) => v + 1);
      if (success) Taro.showToast({ title: success, icon: "success" });
    } catch {
      Taro.showToast({ title: "操作失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    if (!openQuestion || !answer.trim()) return;
    await act(
      () => api.post(`/health-events/${id}/answers`, { answers: [{ question_id: openQuestion.question_id, answer: answer.trim() }] }),
      "已补充",
    );
    setAnswer("");
  }

  async function makeBrief() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await api.post<{ vet_brief_id: string; content: VetBriefContent }>(`/health-events/${id}/vet-brief`, {});
      setBrief({ id: result.vet_brief_id, content: result.content });
      setBriefShare(null);
      setVersion((v) => v + 1);
      Taro.showToast({ title: "摘要已生成", icon: "success" });
    } catch {
      Taro.showToast({ title: "生成失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function shareBrief() {
    if (!brief || busy) return;
    setBusy(true);
    try {
      const result = await api.post<{ token_id: string; share_token: string; expires_at: string }>(
        `/vet-briefs/${brief.id}/share`,
        { expires_in_hours: 72 },
      );
      setBriefShare({
        token_id: result.token_id,
        token: result.share_token,
        expires_at: result.expires_at,
      });
      Taro.showToast({ title: "分享已创建", icon: "success" });
    } catch {
      Taro.showToast({ title: "暂时无法创建分享", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function revokeBriefShare() {
    if (!briefShare || busy) return;
    setBusy(true);
    try {
      await api.del(`/share-tokens/${briefShare.token_id}`);
      setBriefShare(null);
      Taro.showToast({ title: "分享已撤销", icon: "success" });
    } catch {
      Taro.showToast({ title: "暂时无法撤销", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="page">
      <View className="h1">健康事件</View>
      <View className="sub">真实观察 → 风险分级 → 补充信息 → Vet Brief → 结局。</View>

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && <View className="state state-error">暂时连接不上；不会用推测补齐健康信息。</View>}

      {detail ? (
        <>
          <View className={detail.latest_triage_level === "URGENT" || detail.latest_triage_level === "EMERGENCY" ? "attention-panel attention-danger" : "attention-panel attention-calm"}>
            <View className="attention-title">{riskLabel(detail.latest_triage_level)}</View>
            <View className="attention-body">{detail.chief_complaint}</View>
            <View className="attention-footer">分级来自独立规则引擎，不构成兽医诊断。</View>
          </View>

          <View className="open-section">
            <View className="section-title">补充信息</View>
            {detail.intake_steps.filter((step) => step.answer_text).map((step) => (
              <View className="life-row" key={step.question_id}>
                <View className="life-row-body">
                  <Text className="life-row-type">{step.question_text}</Text>
                  <View className="life-row-detail">{step.answer_text}</View>
                </View>
              </View>
            ))}
            {openQuestion ? (
              <View className="field">
                <Text>{openQuestion.question_text}</Text>
                <Input className="input" value={answer} onInput={(e) => setAnswer(e.detail.value)} placeholder="按实际情况回答" />
                <Button className="btn btn-primary" disabled={busy || !answer.trim()} onClick={submitAnswer}>提交回答</Button>
              </View>
            ) : (
              <Button className="btn" disabled={busy} onClick={() => act(() => api.post(`/health-events/${id}/questions`, {}))}>生成需要补充的问题</Button>
            )}
          </View>

          <View className="open-section">
            <View className="section-title">观察证据</View>
            {detail.observations.length ? detail.observations.map((row) => (
              <View className="life-row" key={row.id}>
                <View className="life-row-body">
                  <Text className="life-row-type">{row.kind}</Text>
                  <View className="life-row-detail">{row.text}</View>
                </View>
              </View>
            )) : <View className="life-empty-note">还没有补充观察。</View>}
            <View className="field">
              <Input className="input" value={observation} onInput={(e) => setObservation(e.detail.value)} placeholder="补充一条真实观察" />
              <Button className="btn" disabled={busy || !observation.trim()} onClick={async () => {
                await act(() => api.post(`/health-events/${id}/observations`, { texts: [observation.trim()], use_ai: true }), "已添加观察");
                setObservation("");
              }}>添加观察</Button>
            </View>
          </View>

          <View className="open-section">
            <View className="section-title">Vet Brief · 就诊摘要</View>
            <View className="life-row-detail">把已记录事实整理成就诊前摘要；不是兽医诊断。</View>
            <Button className="btn btn-primary" disabled={busy} onClick={makeBrief}>{busy ? "处理中…" : "生成就诊摘要"}</Button>
            {brief ? (
              <View className="soft-panel">
                <View className="section-title">{brief.content.chief_complaint}</View>
                {brief.content.red_flags?.map((flag) => <View className="life-row-source" key={flag}>• {flag}</View>)}
                {brief.content.key_findings?.slice(0, 5).map((finding, index) => <View className="life-row-detail" key={`${finding.kind}-${index}`}>• {finding.text}</View>)}
                <View className="life-row-source">{brief.content.ai_disclaimer || brief.content.notice}</View>
                {!briefShare ? (
                  <Button className="btn" disabled={busy} onClick={() => void shareBrief()}>
                    生成 72 小时只读分享链接
                  </Button>
                ) : (
                  <View className="soft-panel">
                    <View className="section-title">只读分享已创建</View>
                    <View className="life-row-detail" selectable>{`/api/v1/vet-briefs/shared/${briefShare.token}`}</View>
                    <View className="life-row-source">有效至 {new Date(briefShare.expires_at).toLocaleString()}；可随时撤销。</View>
                    <Button className="btn" disabled={busy} onClick={() => void revokeBriefShare()}>撤销分享链接</Button>
                  </View>
                )}
              </View>
            ) : detail.vet_briefs.length ? <View className="life-row-source">已有 {detail.vet_briefs.length} 份历史摘要。</View> : null}
          </View>

          <View className="open-section">
            <View className="section-title">结局</View>
            {detail.outcomes.length ? detail.outcomes.map((row, index) => (
              <View className="life-row" key={`${row.recorded_at}-${index}`}>
                <View className="life-row-body">
                  <Text className="life-row-type">{outcomeLabel(row.outcome)}</Text>
                  {row.notes ? <View className="life-row-detail">{row.notes}</View> : null}
                </View>
              </View>
            )) : <View className="life-empty-note">还没有结局记录。</View>}
            <View className="life-empty-note">请选择实际结果。记录后会关闭本次健康事件；如又出现新情况，请新建健康事件。</View>
            <View className="chips">
              {OUTCOME_OPTIONS.map(([value, label]) => (
                <View
                  key={value}
                  className={`chip${outcome === value ? " chip-active" : ""}`}
                  onClick={() => !busy && setOutcome(value)}
                >
                  {label}
                </View>
              ))}
            </View>
            <View className="field">
              <Input className="input" value={outcomeNotes} onInput={(e) => setOutcomeNotes(e.detail.value)} placeholder="补充说明（可选）" />
              <Button className="btn" disabled={busy || !outcome} onClick={async () => {
                await act(() => api.post(`/health-events/${id}/outcomes`, { outcome, notes: outcomeNotes.trim() }), "已记录结局");
                setOutcome("");
                setOutcomeNotes("");
              }}>记录结局</Button>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
