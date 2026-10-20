import { useCallback, useEffect, useState } from "react";
import { Button, Input, Text, View } from "@tarojs/components";
import Taro, { useRouter } from "@tarojs/taro";
import { api } from "../../../services/api";
import { fmtTime } from "../../../utils/format";
import { PetContextGate } from "../../../components/feedback/Feedback";
import { usePets } from "../../../utils/usePets";
import {
  followUpEventType, rememberFollowUpTarget,
} from "../../../utils/caseFollowUp";

/** R8AK Mini parity: immutable Case detail, authorized sources, append-only
 *  owner review. The server still enforces pet scope, owner role and CAS. */
interface Review {
  review_id: string;
  reviewed_at: string;
  decision: string;
  note: string;
  related_event_ids: string[];
  related_sources_valid: boolean | null;
}
interface Detail {
  case_id: string;
  pet_id: string;
  metric: string;
  current_value: number;
  baseline_value: number;
  sample_days: number;
  evidence_event_ids: string[];
  source_valid: boolean;
  follow_up_source_valid?: boolean | null;
  state: string;
  computed_at: string;
  uncertainty: string;
  truth_note: string;
  owner_can_review: boolean;
  latest_review_id: string | null;
  reviews: Review[];
}
interface Source {
  event_id: string;
  event_type: string;
  occurred_at: string;
  recorded_at: string;
  source_type: string;
  payload: Record<string, unknown>;
  role: "CURRENT" | "HISTORICAL" | null;
  valid: boolean;
  validity_reason?: "VALID" | "RETRACTED" | "SUPERSEDED" | "WRONG_METRIC" | "NON_FACT_SOURCE";
}
interface SourcePage {
  sources: Source[];
  total: number;
  has_more: boolean;
}
const DECISIONS: Record<string, string> = {
  RECORD_OBSERVATION: "已关联真实后续观察",
  FOLLOW_UP_LATER: "主人选择稍后关注",
  NOT_RELEVANT: "主人选择暂不关注",
  CORRECT_SOURCE: "主人要求重新核对来源",
};
const ACTIONS: Array<{ key: string; label: string }> = [
  { key: "FOLLOW_UP_LATER", label: "继续关注" },
  { key: "NOT_RELEVANT", label: "暂不关注" },
  { key: "CORRECT_SOURCE", label: "来源需核对" },
];
const METRIC: Record<string, { name: string; unit: string }> = {
  walk_minutes_per_day: { name: "散步", unit: "分钟" },
  meal_count_per_day: { name: "进食", unit: "次" },
  sleep_minutes_per_day: { name: "睡眠", unit: "分钟" },
};

const SOURCE_TRUTH: Record<string, string> = {
  VALID: "可用于本次对比",
  RETRACTED: "记录已撤回",
  SUPERSEDED: "记录已由后续修正替代",
  WRONG_METRIC: "记录指标与本次对比不符",
  NON_FACT_SOURCE: "此来源不具备观察事实资格",
};
function sourceTruthLabel(source: Source): string {
  return source.valid ? SOURCE_TRUTH.VALID
    : SOURCE_TRUTH[source.validity_reason ?? ""] ?? "来源有效性待核实";
}

function valueText(source: Source): string {
  if (source.event_type === "daily.meal") return "按 1 条进食记录计数，不代表食物摄入量";
  if (source.event_type !== "daily.walk" && source.event_type !== "daily.sleep") {
    return "仅展示有来源的生活记录";
  }
  const duration = source.payload?.duration_minutes;
  if (typeof duration === "number" && duration > 0 && duration <= 1440) {
    return `记录时长 ${duration} 分钟（非实时测量）`;
  }
  return "仅展示有来源的生活记录";
}

export default function ObservationDetailPage() {
  const router = useRouter();
  const petId = String(router.params.petId ?? "");
  const caseId = String(router.params.caseId ?? "");
  const linkedEvent = String(router.params.linkedEvent ?? "");
  const { petId: selectedPet, refresh, state } = usePets();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceTotal, setSourceTotal] = useState(0);
  const [sourceMore, setSourceMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // R8AP: owner retraction with an explicit second step; never local rewrites.
  const [retractTarget, setRetractTarget] = useState<string | null>(null);
  const [retracting, setRetracting] = useState(false);
  // R8AR: correction appends a superseding event; the original row is kept.
  const [correctTarget, setCorrectTarget] = useState<Source | null>(null);
  const [correctValue, setCorrectValue] = useState("");
  const [correcting, setCorrecting] = useState(false);

  const load = useCallback(() => {
    api
      .get<Detail>(`/pets/${petId}/life-change-cases/${caseId}`)
      .then((data) => {
        if (data.pet_id !== petId || data.case_id !== caseId) {
          setError("返回的档案不属于当前宠物，已停止显示。");
          return;
        }
        setDetail(data);
        setError(null);
      })
      .catch(() => setError("档案暂时没有读取成功，请稍后重试。"));
  }, [caseId, petId]);

  useEffect(() => {
    setDetail(null);
    setSources([]);
    setSourceTotal(0);
    setSourceMore(false);
    load();
  }, [load]);

  const loadSources = (offset: number) => {
    api
      .get<SourcePage>(`/pets/${petId}/life-change-cases/${caseId}/sources?offset=${offset}&limit=6`)
      .then((page) => {
        setSources((before) => {
          const seen = new Set(before.map((item) => item.event_id));
          return [...before, ...page.sources.filter((item) => !seen.has(item.event_id))];
        });
        setSourceTotal(page.total);
        setSourceMore(page.has_more);
      })
      .catch(() => setMessage("来源暂时没有读取成功；不能用未显示代替没有来源。"));
  };

  const review = (decision: string) => {
    if (!detail || busy || !detail.owner_can_review) return;
    setBusy(true);
    setMessage(null);
    api
      .post<{ review_id: string; pet_id: string; case_id: string; decision: string; replayed: boolean }>(
        `/pets/${petId}/life-change-cases/${caseId}/reviews`,
        {
          decision,
          expected_latest_review_id: detail.latest_review_id,
          idempotency_key: `r8-mini-${decision}-${detail.latest_review_id ?? "initial"}`,
        },
      )
      .then((ack) => {
        if (ack.pet_id !== petId || ack.case_id !== caseId || ack.decision !== decision) {
          setMessage("服务器确认的档案身份与当前页面不一致，已停止显示。");
          return;
        }
        setMessage(ack.replayed ? "这次决定此前已保存。" : "已追加一条主人反馈；历史记录未被改写。");
        load();
      })
      .catch(() => {
        setMessage("提交未确认；档案可能已有新的反馈，请刷新后重试。");
        load();
      })
      .finally(() => setBusy(false));
  };

  const retractSource = (eventId: string) => {
    if (!detail?.owner_can_review || retracting) return;
    setRetracting(true);
    setMessage(null);
    api
      .post(`/events/${eventId}/retract`, {})
      .then(() => {
        // The server derives INVALIDATED on read; never rewrite it locally.
        setRetractTarget(null);
        setSources([]);
        setSourceTotal(0);
        setSourceMore(false);
        setMessage("已撤回这条原始记录；旧对比失效，历史主人反馈仍保留。请重新核对档案。");
        load();
      })
      .catch(() => setMessage("撤回未确认，请稍后重试。"))
      .finally(() => setRetracting(false));
  };

  const submitCorrection = (source: Source) => {
    if (!detail?.owner_can_review || correcting) return;
    const value = Number(correctValue.trim());
    if (!Number.isFinite(value) || value < 0 || value > 1440) {
      setMessage("请填写 0–1440 之间的分钟数。");
      return;
    }
    setCorrecting(true);
    setMessage(null);
    api
      .post(`/pets/${petId}/events/${source.event_id}/supersede`, {
        payload: { duration_minutes: value },
        idempotency_key: `r8-mini-correction-${source.event_id}-${value}`,
      })
      .then(() => {
        setCorrectTarget(null);
        setCorrectValue("");
        setSources([]);
        setSourceTotal(0);
        setSourceMore(false);
        setMessage("已提交修正；旧对比失效，历史主人反馈仍保留。请重新核对档案。");
        load();
      })
      .catch(() => setMessage("修正未确认，请稍后重试。"))
      .finally(() => setCorrecting(false));
  };

  const startFollowUp = (row: Detail) => {
    const eventType = followUpEventType(row.metric);
    if (!eventType) {
      setMessage("该指标暂不支持补录真实观察。");
      return;
    }
    // The tab page cannot receive URL params via switchTab; a short-lived
    // intent keeps the same pet/Case/metric without inventing a new tab.
    rememberFollowUpTarget({
      caseId: row.case_id, petId, metric: row.metric, eventType,
    });
    Taro.switchTab({ url: "/pages/index/index" });
  };

  const metric = detail ? (METRIC[detail.metric] ?? { name: "生活记录", unit: "" }) : null;
  return (
    <View className="page">
      <Text className="h1">生活观察档案</Text>
      <PetContextGate state={state} hasPet={Boolean(selectedPet)} onRetry={refresh} />
      {selectedPet && selectedPet !== petId ? (
        <View className="state state-error">已切换到其他宠物；不同宠物的档案不会混用。</View>
      ) : null}
      {error ? <View className="state state-error">{error}</View> : null}
      {!detail && !error ? <View className="state">正在核对冻结来源与主人反馈……</View> : null}
      {detail && metric ? (
        <>
          <View className="card">
            <Text className="section-title">{metric.name}变化回顾</Text>
            <Text className="muted">
              当时已记录 {detail.current_value} {metric.unit} · 同期参考 {detail.baseline_value} {metric.unit}
            </Text>
            <Text className="muted">
              {detail.sample_days} 天可比参考 · {detail.evidence_event_ids.length} 条原始来源 · 对比时间{" "}
              {fmtTime(detail.computed_at)}
            </Text>
            <Text className="muted">不能据此推断疾病或已恢复。</Text>
          </View>

          {linkedEvent ? (
            <View className="card" data-testid="pli.r8.mini-followup-linked">
              <Text>已关联真实后续观察（事件 {linkedEvent.slice(0, 8)}）。</Text>
              <Text className="muted">是否有效仍以来源状态为准，不代表健康结论。</Text>
            </View>
          ) : null}

          <View className="open-section">
            <Text className="section-title">主人可以怎样继续？</Text>
            {detail.owner_can_review ? (
              <View className="row">
                {ACTIONS.map((action) => (
                  <Button
                    key={action.key}
                    className="btn"
                    disabled={busy}
                    onClick={() => review(action.key)}
                  >
                    {action.label}
                  </Button>
                ))}
                <Button
                  className="btn"
                  disabled={busy}
                  data-testid="pli.r8.mini-followup-record"
                  onClick={() => startFollowUp(detail)}
                >
                  记录一条真实观察
                </Button>
              </View>
            ) : (
              <Text className="muted">只有宠物主人可以继续记录决定。</Text>
            )}
            {message ? <Text className="muted">{message}</Text> : null}
          </View>

          <View className="open-section">
            <Text className="section-title">主人反馈历程</Text>
            {detail.reviews.length === 0 ? <Text className="muted">还没有主人反馈。</Text> : null}
            {detail.reviews.map((row) => (
              <View className="card" key={row.review_id}>
                <Text>{DECISIONS[row.decision] ?? "已保存的主人决定"}</Text>
                <Text className="muted">{fmtTime(row.reviewed_at)}</Text>
                {row.decision === "RECORD_OBSERVATION" ? (
                  <Text className="muted">
                    {row.related_sources_valid === true ? "后续记录目前有效"
                      : row.related_sources_valid === false ? "后续记录已撤回或修正，需重新核对"
                        : "后续记录有效性待核实"}
                  </Text>
                ) : null}
                {row.related_event_ids.map((eventId) => (
                  <Text className="muted" key={eventId}>后续事件 ID：{eventId}</Text>
                ))}
                {row.note?.trim() ? <Text className="muted">主人备注：{row.note}</Text> : null}
              </View>
            ))}
          </View>

          <View className="open-section">
            <Text className="section-title">当时依据什么？</Text>
            <Text className="muted">
              {detail.source_valid ? "原始记录目前有效。" : "原始记录已改变，这次旧对比已失效。"}
            </Text>
            <Button className="btn" onClick={() => loadSources(0)}>查看来源时间与数值</Button>
            {sources.map((source) => (
              <View className="card" key={source.event_id}>
                <Text>
                  {source.role === "CURRENT" ? "当日依据" : source.role === "HISTORICAL" ? "同期参考" : "日期待核实"}
                </Text>
                <Text className="muted">{valueText(source)}</Text>
                <Text className="muted">发生 {fmtTime(source.occurred_at)} · 录入 {fmtTime(source.recorded_at)}</Text>
                <Text className="muted">{sourceTruthLabel(source)}</Text>
                <Text className="muted">{source.event_id}</Text>
                {detail.owner_can_review && source.valid ? (
                  retractTarget === source.event_id ? (
                    <View data-testid={`pli.r8.mini-source-retract-confirm.${source.event_id}`}>
                      <Text className="muted">
                        撤回后这条来源不再有效，旧对比会失效；历史主人反馈仍保留。
                      </Text>
                      <Button
                        className="btn"
                        disabled={retracting}
                        data-testid={`pli.r8.mini-source-retract-yes.${source.event_id}`}
                        onClick={() => retractSource(source.event_id)}
                      >
                        {retracting ? "正在撤回…" : "确认撤回这条记录"}
                      </Button>
                      <Button
                        className="secondary-action"
                        disabled={retracting}
                        onClick={() => setRetractTarget(null)}
                      >
                        取消
                      </Button>
                    </View>
                  ) : (
                    <Button
                      className="secondary-action"
                      data-testid={`pli.r8.mini-source-retract.${source.event_id}`}
                      onClick={() => setRetractTarget(source.event_id)}
                    >
                      这条记录有误
                    </Button>
                  )
                ) : null}
                {detail.owner_can_review && source.valid
                  && detail.metric !== "meal_count_per_day" ? (
                  correctTarget?.event_id === source.event_id ? (
                    <View data-testid={`pli.r8.mini-source-correct-form.${source.event_id}`}>
                      <Text className="muted">
                        只修正数值；发生时间与原始记录保持不变。修正会替代旧来源，旧对比随之失效。
                      </Text>
                      <Input
                        type="number"
                        value={correctValue}
                        placeholder="0–1440 分钟"
                        data-testid={`pli.r8.mini-source-correct-input.${source.event_id}`}
                        onInput={(event) => setCorrectValue(event.detail.value)}
                      />
                      <Button
                        className="btn"
                        disabled={correcting}
                        data-testid={`pli.r8.mini-source-correct-submit.${source.event_id}`}
                        onClick={() => submitCorrection(source)}
                      >
                        {correcting ? "正在提交…" : "提交修正"}
                      </Button>
                      <Button
                        className="secondary-action"
                        disabled={correcting}
                        onClick={() => { setCorrectTarget(null); setCorrectValue(""); }}
                      >
                        取消
                      </Button>
                    </View>
                  ) : (
                    <Button
                      className="secondary-action"
                      data-testid={`pli.r8.mini-source-correct.${source.event_id}`}
                      onClick={() => {
                        setCorrectTarget(source);
                        const raw = source.payload?.duration_minutes;
                        setCorrectValue(typeof raw === "number" ? String(raw) : "");
                      }}
                    >
                      修正这条记录
                    </Button>
                  )
                ) : null}
              </View>
            ))}
            {sources.length > 0 && sources.length < sourceTotal && sourceMore ? (
              <Button className="btn" onClick={() => loadSources(sources.length)}>
                继续查看其余来源（{sources.length}/{sourceTotal}）
              </Button>
            ) : null}
            {message ? (
              <Text className="muted" data-testid="pli.r8.mini-action-status">{message}</Text>
            ) : null}
          </View>

          <View className="open-section">
            <Text className="section-title">解释边界</Text>
            <Text className="muted">{detail.truth_note}</Text>
            <Text className="muted">{detail.uncertainty}</Text>
            <Text className="muted">Case ID：{detail.case_id}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}
