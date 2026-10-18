import { useCallback, useEffect, useState } from "react";
import { Button, Text, View } from "@tarojs/components";
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
  occurred_at: string;
  recorded_at: string;
  source_type: string;
  payload: Record<string, unknown>;
  role: "CURRENT" | "HISTORICAL" | null;
  valid: boolean;
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

function valueText(source: Source): string {
  if (!source.valid) return "这条来源已撤回或修正，不再是当前依据";
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
                <Text className="muted">{source.valid ? "来源有效" : "来源已撤回或修正"}</Text>
                <Text className="muted">{source.event_id}</Text>
              </View>
            ))}
            {sources.length > 0 && sources.length < sourceTotal && sourceMore ? (
              <Button className="btn" onClick={() => loadSources(sources.length)}>
                继续查看其余来源（{sources.length}/{sourceTotal}）
              </Button>
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
