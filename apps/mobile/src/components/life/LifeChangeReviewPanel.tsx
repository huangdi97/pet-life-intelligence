/** R8 owner-reviewed change: never a diagnosis or an automatic owner action. */
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ApiError, api, humanizeError } from "../../api";
import { clearOwnerIntentIfUnchanged, restoreOwnerIntent, saveOwnerIntent } from "../../storage/pendingOwnerReview";
import { COLORS, SPACE, TYPE } from "../../tokens";
import { nextOwnerEvidenceIds, ownerEvidenceLocalTime, ownerEvidenceRole, ownerEvidenceRoleCounts, ownerEvidenceValue, verifyOwnerEvidenceBatch } from "./ownerEvidence";

export type LifeMetric =
  | "walk_minutes_per_day"
  | "meal_count_per_day"
  | "sleep_minutes_per_day";

export interface NotableRecordedChange {
  metric: LifeMetric;
  current_value: number;
  same_time_baseline: number | null;
  sample_count: number;
  notable: boolean;
  current_recorded?: boolean;
  current_event_ids?: string[];
  historical_event_ids?: string[];
}

interface LifeCase {
  case_id: string;
  pet_id: string;
  metric: LifeMetric;
  current_value: number;
  baseline_value: number;
  sample_days: number;
  evidence_event_ids: string[];
  source_valid: boolean;
  computed_at: string;
  state: string;
  follow_up_source_valid?: boolean | null;
  human_question: string;
}

interface LifeCaseDetail extends LifeCase {
  reviews: Array<{ review_id: string; decision: string }>;
}

interface EvidenceEvent {
  event_id: string;
  pet_id: string;
  event_type: string;
  occurred_at: string;
  recorded_at: string;
  source_type: string;
  payload?: Record<string, unknown>;
  retracted_at?: string | null;
}

type Decision = "FOLLOW_UP_LATER" | "NOT_RELEVANT" | "CORRECT_SOURCE";
type ReviewPostBody = {
  decision: Decision;
  expected_latest_review_id: string | null;
  idempotency_key: string;
};
type ReviewAcknowledgement = {
  review_id: string;
  case_id: string;
  pet_id: string;
  decision: Decision;
};
type PendingReviewIntent = {
  caseId: string;
  decision: Decision;
  payload: ReviewPostBody;
};

const METRIC_TITLE: Record<LifeMetric, string> = {
  walk_minutes_per_day: "散步记录",
  meal_count_per_day: "进食记录",
  sleep_minutes_per_day: "睡眠记录",
};
const METRIC_UNIT: Record<LifeMetric, string> = {
  walk_minutes_per_day: "分钟",
  meal_count_per_day: "次",
  sleep_minutes_per_day: "分钟",
};

// Keep machine event identity/provenance intact while showing useful Chinese
// labels to the pet owner. The accessibility label has the FULL immutable ID;
// the short one in the visual row is only a compact reading aid.
const EVENT_LABELS: Record<string, string> = {
  "daily.walk": "散步",
  "daily.meal": "进食",
  "daily.sleep": "睡眠",
  "daily.play": "玩耍",
};
const SOURCE_LABELS: Record<string, string> = {
  "OWNER_REPORTED": "主人记录",
  "CAREGIVER_REPORTED": "照护者记录",
  "DEVICE_DERIVED": "设备记录",
  "PROFESSIONAL_CONFIRMED": "专业人员确认",
  "LAB_CONFIRMED": "检测机构确认",
};
const ownerEventType = (type: string): string => EVENT_LABELS[type] ?? "生活记录";
const ownerSourceType = (source: string): string => SOURCE_LABELS[source] ?? "其他来源";

// A server Case can keep the same ID even after its evidence changes.
// Never accept a normal Review or clear a saved human intent by comparing
// only the Case ID: verify the immutable source set at BOTH read boundaries.
function caseMatchesFrozenSources(
  detail: LifeCase,
  petId: string,
  caseId: string,
  sourceIdsKey: string,
): boolean {
  const sourceIds = new Set(sourceIdsKey.split("|").filter(Boolean));
  return detail.source_valid === true &&
    detail.pet_id === petId &&
    detail.case_id === caseId &&
    sourceIds.size > 0 &&
    detail.evidence_event_ids.length === sourceIds.size &&
    detail.evidence_event_ids.every((id) => sourceIds.has(id));
}

export function LifeChangeReviewPanel({
  petId, change, onRecord,
}: {
  petId: string;
  change: NotableRecordedChange;
  onRecord: (caseId: string, metric: LifeMetric) => void;
}) {
  const [record, setRecord] = useState<LifeCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEvent[] | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  // Preserve the very same human instruction if POST succeeded but its reply
  // was lost. A fresh optimistic token would otherwise append a second Review.
  const pendingReview = useRef<PendingReviewIntent | null>(null);
  // Async evidence/Review responses are scoped to the live mounted pet+Case.
  // A request from pet A must never repopulate pet B after a tab switch.
  const requestGeneration = useRef(0);
  const activeOwnerScope = useRef({ petId, caseId: "" });
  activeOwnerScope.current = { petId, caseId: record?.case_id ?? "" };
  // Values alone do not identify a LifeChangeCase. A different day's
  // 20-minute walk can have the same 90-minute historical baseline, but is
  // NOT the old Case's frozen source evidence. Match immutable event IDs.
  const sourceIdsKey = [
    ...(change.current_event_ids ?? []),
    ...(change.historical_event_ids ?? []),
  ].sort().join("|");
  // The live change identity refreshes DURING render, before effect cleanup:
  // an old create()/review() reply cannot paint the next pet or changed Case.
  const activeChangeScope = useRef({ petId, metric: change.metric, sourceIdsKey });
  // React state isn't a synchronous mutex: a second tap can enter review()
  // before setLoading(true) commits. The per-scope token serializes attempts.
  const activeReviewAction = useRef<{ scope: string } | null>(null);
  const ownerReviewScope = [petId, record?.case_id ?? "", sourceIdsKey].join(":");
  const renderedReviewScope = useRef(ownerReviewScope);
  if (renderedReviewScope.current !== ownerReviewScope) {
    // Invalidate A→B→A generations synchronously at render, not only after
    // effect cleanup. A stale delayed GET/POST must not resume on the old A.
    renderedReviewScope.current = ownerReviewScope;
    requestGeneration.current += 1;
    activeReviewAction.current = null;
  }
  activeChangeScope.current = { petId, metric: change.metric, sourceIdsKey };

  useEffect(() => {
    let alive = true;
    requestGeneration.current += 1;
    pendingReview.current = null;
    setLoading(false);
    setRestoring(true);
    setRecord(null);
    setMessage(null);
    setEvidence(null);
    setShowEvidence(false);
    api.get<{ cases: LifeCase[] }>(`/pets/${petId}/life-change-cases`)
      .then(async (result) => {
        if (!alive || activeChangeScope.current.petId !== petId ||
            activeChangeScope.current.metric !== change.metric ||
            activeChangeScope.current.sourceIdsKey !== sourceIdsKey) return;
        const sourceIds = new Set(sourceIdsKey.split("|").filter(Boolean));
        const matched = result.cases.find((c) =>
          c.pet_id === petId &&
          c.metric === change.metric && c.source_valid &&
          c.current_value === change.current_value &&
          c.baseline_value === change.same_time_baseline &&
          sourceIds.size > 0 &&
          c.evidence_event_ids.length === sourceIds.size &&
          c.evidence_event_ids.every((id) => sourceIds.has(id)),
        );
        if (matched) {
          const saved = await restoreOwnerIntent(petId, matched.case_id, sourceIdsKey);
          if (!alive || activeChangeScope.current.petId !== petId ||
              activeChangeScope.current.metric !== change.metric ||
              activeChangeScope.current.sourceIdsKey !== sourceIdsKey) return;
          if (saved) {
            pendingReview.current = { caseId: saved.caseId, decision: saved.decision, payload: saved.payload };
            setMessage("发现一条跨重启未确认的主人决定，请重新点击原选择核对；不会自动重试。");
          }
          setRecord(matched);
        }
      })
      .catch(() => {
        if (alive && activeChangeScope.current.petId === petId &&
            activeChangeScope.current.metric === change.metric &&
            activeChangeScope.current.sourceIdsKey === sourceIdsKey) {
          setMessage("未确认操作暂时无法安全核对，请检查网络后重试。");
        }
      })
      .finally(() => {
        if (alive && activeChangeScope.current.petId === petId &&
            activeChangeScope.current.metric === change.metric &&
            activeChangeScope.current.sourceIdsKey === sourceIdsKey) setRestoring(false);
      });
    return () => { alive = false; };
  }, [petId, change.metric, change.current_value, change.same_time_baseline, sourceIdsKey]);

  const create = async () => {
    if (loading || restoring) return;
    const generation = requestGeneration.current;
    const requestedPetId = petId;
    const requestedMetric = change.metric;
    const requestedSources = sourceIdsKey;
    const stillCurrent = () =>
      requestGeneration.current === generation &&
      activeChangeScope.current.petId === requestedPetId &&
      activeChangeScope.current.metric === requestedMetric &&
      activeChangeScope.current.sourceIdsKey === requestedSources;
    setLoading(true);
    setMessage(null);
    try {
      const saved = await api.post<LifeCase>(
        `/pets/${petId}/life-change-cases`, { metric: change.metric },
      );
      if (!stillCurrent()) return;
      if (saved.pet_id !== petId || saved.metric !== change.metric ||
          !saved.source_valid ||
          saved.evidence_event_ids.length !== requestedSources.split("|").filter(Boolean).length ||
          !saved.evidence_event_ids.every((id) => requestedSources.split("|").includes(id))) {
        throw new Error("CASE_SOURCE_SCOPE_MISMATCH");
      }
      // This Case ID transition invalidates create()'s generation during
      // the next render. A generation-guarded finally cannot unlock the new
      // Case's actions afterwards. Unlock FIRST, then commit the new identity.
      setLoading(false);
      setRecord(saved);
    } catch (e: unknown) {
      if (stillCurrent()) setMessage(humanizeError(e));
    } finally {
      // The failure path must still release pending loading; an old pet's
      // async generation must never mutate the new pet's current panel.
      if (stillCurrent()) setLoading(false);
    }
  };

  const review = async (decision: Decision) => {
    if (!record || loading || restoring) return;
    const pending = pendingReview.current;
    // After a network timeout we do not know whether the original decision
    // persisted. Require a same-intent retry before authoring another choice.
    if (pending && (pending.caseId !== record.case_id || pending.decision !== decision)) {
      setMessage("上一条主人决定尚未确认，请先重试原操作，再选择新的处理方式。");
      return;
    }
    if (activeReviewAction.current) return;
    const actionToken = { scope: ownerReviewScope };
    activeReviewAction.current = actionToken;
    const requestedPetId = petId;
    const requestedCaseId = record.case_id;
    const requestedMetric = change.metric;
    const requestedSources = sourceIdsKey;
    const generation = requestGeneration.current;
    const stillCurrent = () =>
      requestGeneration.current === generation &&
      activeChangeScope.current.petId === requestedPetId &&
      activeChangeScope.current.metric === requestedMetric &&
      activeChangeScope.current.sourceIdsKey === requestedSources &&
      activeOwnerScope.current.petId === requestedPetId &&
      activeOwnerScope.current.caseId === requestedCaseId;
    setLoading(true);
    setMessage(null);
    try {
      let payload = pending?.payload;
      if (!payload) {
        const details = await api.get<LifeCaseDetail>(
          `/pets/${petId}/life-change-cases/${record.case_id}`,
        );
        if (!stillCurrent()) return;
        if (!caseMatchesFrozenSources(details, requestedPetId, requestedCaseId, requestedSources)) {
          setMessage("原始记录已经失效或证据发生变化；不会提交旧的主人决定。请刷新后重新核对。");
          return;
        }
        const last = details.reviews[details.reviews.length - 1];
        // Unique per Case + actor (the server's key scope) and optimistic
        // Review predecessor. It is NOT a security credential or pet identity.
        payload = {
          decision,
          expected_latest_review_id: last?.review_id ?? null,
          idempotency_key: `r8-${decision}-${last?.review_id ?? "initial"}`,
        };
        // Persist BEFORE the HTTP POST. A failed secure-storage write is a
        // fail-closed stop, not permission to submit an unrepeatable decision.
        await saveOwnerIntent({ petId, caseId: record.case_id, sourceIdsKey, decision, payload });
        // If the owner switched pets during the SecureStore write, preserve
        // the saved intent for recovery from its ORIGINAL pet. Do not POST.
        if (!stillCurrent()) return;
        pendingReview.current = { caseId: record.case_id, decision, payload };
      } else {
        // A lost-ack retry is still an owner action against LIVE evidence.
        // Retrying the identical token is necessary for idempotency, but not
        // sufficient if the Case's original sources were withdrawn or swapped.
        // Retain the saved intent; never POST on invalidated evidence.
        const retryCase = await api.get<LifeCaseDetail>(
          `/pets/${petId}/life-change-cases/${record.case_id}`,
        );
        if (!stillCurrent()) return;
        if (!caseMatchesFrozenSources(retryCase, requestedPetId, requestedCaseId, requestedSources)) {
          setMessage("原始记录已经失效或证据发生变化；本机原决定仍保留，不会重复提交。请先核对。");
          return;
        }
      }
      if (!stillCurrent()) return;
      const accepted = await api.post<ReviewAcknowledgement>(
        `/pets/${petId}/life-change-cases/${record.case_id}/reviews`,
        payload,
      );
      if (!stillCurrent()) return;
      // A successful HTTP response is not evidence of WHICH owner Review
      // was saved. Check its immutable identity before trusting the follow-up.
      if (!accepted.review_id ||
          accepted.pet_id !== petId ||
          accepted.case_id !== record.case_id ||
          accepted.decision !== decision) {
        throw new Error("REVIEW_ACK_MISMATCH");
      }
      const updated = await api.get<LifeCaseDetail>(
        `/pets/${petId}/life-change-cases/${record.case_id}`,
      );
      if (!stillCurrent()) return;
      if (!caseMatchesFrozenSources(updated, requestedPetId, requestedCaseId, requestedSources)) {
        // POST may already be accepted. Keep the durable instruction pending
        // until an owner can verify the *same* evidence and review identity.
        throw new Error("CASE_SOURCE_INVALIDATED_AFTER_REVIEW");
      }
      // A stale GET may return the correct Case yet omit the just-committed
      // Review. Preserve the SAME human intent and idempotency key until its
      // exact review ID is visible. Do not announce "已记录" prematurely.
      if (!updated.reviews.some((entry) =>
        entry.review_id === accepted.review_id && entry.decision === decision
      )) {
        throw new Error("REVIEW_CONFIRMATION_PENDING");
      }
      setRecord(updated);
      // Even after the exact Review acknowledgement, a second owner panel may
      // have changed the local reminder. Delete only this exact immutable
      // decision, optimistic predecessor and idempotency key.
      if (!stillCurrent()) return;
      const cleared = await clearOwnerIntentIfUnchanged({
        petId, caseId: record.case_id, sourceIdsKey, decision, payload,
      });
      if (!stillCurrent()) return;
      pendingReview.current = null;
      if (!cleared) {
        setMessage("服务器已确认这次主人决定；本机提醒可能已更新，新决定没有被清除，请在待核对记录中重新确认。");
        return;
      }
      setMessage(
        decision === "NOT_RELEVANT"
          ? "已记录你的判断；不代表宠物健康状态已被证明正常。"
          : decision === "CORRECT_SOURCE"
            ? "已记录需要核对来源；请在记录详情中完成真正的修正。"
            : "已记录稍后观察；没有自动创建医疗任务。",
      );
    } catch (e: unknown) {
      if (!stillCurrent()) return;
      // A 409 or validation error on a RETRY does not prove a prior
      // request was never saved. Preserve the exact original owner instruction
      // across ambiguous responses; only verified ack or explicit two-step
      // local opt-out can safely remove it.
      setMessage(
        e instanceof Error && e.message === "CASE_SOURCE_INVALIDATED_AFTER_REVIEW"
          ? "请求可能已经保存，但对应来源失效或变化；本机原决定仍保留，请先核对证据。"
          : e instanceof Error && e.message === "R8_UNCONFIRMED_INTENT_CONFLICT"
          ? "本机已有另一条尚未核对的主人决定，请先核实或明确放弃原提醒；新决定没有自动提交。"
          : e instanceof Error &&
            (e.message === "REVIEW_ACK_MISMATCH" || e.message === "REVIEW_CONFIRMATION_PENDING")
            ? "主人决定尚未在最新记录中确认，请重试刚才同一个操作；不会自动新建第二次决定。"
            : e instanceof ApiError && [400, 401, 403, 404, 409, 422].includes(e.status)
              ? `服务器暂未确认这次操作（${e.status}）；原决定仍在本机待核对，不能据此认定先前请求失败。`
              : humanizeError(e),
      );
    } finally {
      // Never unlock an action that replaced this one after a pet/scope swap.
      if (activeReviewAction.current === actionToken) activeReviewAction.current = null;
      if (stillCurrent()) setLoading(false);
    }
  };

  const inspectEvidence = async () => {
    if (!record || loading || restoring) return;
    if (showEvidence) { setShowEvidence(false); return; }
    setShowEvidence(true);
    if (evidence) return;
    const requestedPetId = petId;
    const requestedCaseId = record.case_id;
    const generation = requestGeneration.current;
    const stillCurrent = () =>
      requestGeneration.current === generation &&
      activeOwnerScope.current.petId === requestedPetId &&
      activeOwnerScope.current.caseId === requestedCaseId;
    setEvidenceError(null);
    setLoading(true);
    try {
      const ids = nextOwnerEvidenceIds(record.evidence_event_ids, []);
      const rows = await Promise.all(ids.map((id) => api.get<EvidenceEvent>(`/events/${id}`)));
      if (!stillCurrent()) return;
      verifyOwnerEvidenceBatch(rows, ids, requestedPetId);
      setEvidence(rows);
    } catch (e: unknown) {
      if (stillCurrent()) setEvidenceError(humanizeError(e));
    } finally {
      if (stillCurrent()) setLoading(false);
    }
  };

  // Every original source must remain inspectable in the owner panel.
  // Page the network work; never pretend the first eight are all the evidence.
  const loadMoreEvidence = async () => {
    if (!record || !showEvidence || !evidence || loading || restoring) return;
    const requestedPetId = petId;
    const requestedCaseId = record.case_id;
    const generation = requestGeneration.current;
    const requestedSources = sourceIdsKey;
    const ids = nextOwnerEvidenceIds(
      record.evidence_event_ids, evidence.map((item) => item.event_id),
    );
    if (ids.length === 0) return;
    const stillCurrent = () =>
      requestGeneration.current === generation &&
      activeOwnerScope.current.petId === requestedPetId &&
      activeOwnerScope.current.caseId === requestedCaseId &&
      activeChangeScope.current.sourceIdsKey === requestedSources;
    setLoading(true);
    setEvidenceError(null);
    try {
      const rows = await Promise.all(ids.map((id) => api.get<EvidenceEvent>(`/events/${id}`)));
      if (!stillCurrent()) return;
      verifyOwnerEvidenceBatch(rows, ids, requestedPetId);
      setEvidence((before) => {
        if (!before) return null;
        const existing = new Set(before.map((event) => event.event_id));
        return [...before, ...rows.filter((item) => !existing.has(item.event_id))];
      });
    } catch (error: unknown) {
      if (stillCurrent()) setEvidenceError(humanizeError(error));
    } finally {
      if (stillCurrent()) setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper} testID="pli.r8.owner-review">
      <Text style={styles.eyebrow}>个体记录 · 主人核对</Text>
      <Text style={styles.title}>{METRIC_TITLE[change.metric]}有值得核对的变化</Text>
      <Text style={styles.note}>
        这里只比较有来源的记录，不推断疾病、情绪，也不把漏记当成零。
      </Text>
      {!record ? (
        <Pressable
          testID="pli.r8.owner-review.create"
          accessibilityRole="button"
          onPress={() => void create()}
          disabled={loading || restoring}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>{loading ? "读取记录中…" : "核对这次记录变化"}</Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.fact} testID="pli.r8.owner-review.fact">
            已记录 {record.current_value} {METRIC_UNIT[record.metric]} · 个人同期记录 {record.baseline_value} {METRIC_UNIT[record.metric]}
          </Text>
          <Text style={styles.meta}>
            {record.sample_days} 天可比记录 · {record.evidence_event_ids.length} 条来源 · {record.state === "PROPOSED"
              ? "等待主人确认"
              : record.state === "FOLLOW_UP_EVIDENCE_INVALIDATED"
                ? "后续记录已失效 · 需要重新核对"
                : "已有主人反馈"}
          </Text>
          {record.state === "FOLLOW_UP_EVIDENCE_INVALIDATED" ? (
            <Text style={styles.warning} testID="pli.r8.owner-review.followup-invalid">
              之前的主人反馈仍已保存，但其引用的后续记录已被撤回或修正。请重新核对，不能据此确认宠物状况已改变。
            </Text>
          ) : null}
          <Text style={styles.question}>{record.human_question}</Text>
          <Pressable
            testID="pli.r8.owner-review.sources"
            accessibilityRole="button"
            onPress={() => void inspectEvidence()}
            style={[styles.sourceAction, (loading || restoring) && styles.sourceDisabled]}
            disabled={loading || restoring}
          >
            <Text style={styles.sourceText}>
              {loading ? "正在读取原始记录…" : restoring ? "正在核对记录…" : showEvidence ? "收起记录来源" : "查看原始记录来源"}
            </Text>
          </Pressable>
          {showEvidence && evidence ? (
            <View style={styles.evidenceList} testID="pli.r8.owner-review.evidence">
              <View style={styles.evidenceHeader}>
                <Text style={styles.evidenceProgress} testID="pli.r8.owner-review.evidence-progress">
                  已查看 {evidence.length} / {record.evidence_event_ids.length} 条原始记录
                </Text>
                <View style={styles.evidenceLegend}>
                  <Text style={styles.evidenceLegendCurrent}>
                    当日依据 {ownerEvidenceRoleCounts(evidence, record.computed_at).current} 条
                  </Text>
                  <Text style={styles.evidenceLegendHistorical}>
                    同期参考 {ownerEvidenceRoleCounts(evidence, record.computed_at).historical} 条
                  </Text>
                </View>
                <Text style={styles.evidenceProgress}>每条来源分别保留发生时间、录入时间与原始事件 ID</Text>
              </View>
              {[...evidence].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at)).map((e) => (
                <Text
                  key={e.event_id}
                  testID={`pli.r8.owner-review.event.${e.event_id}`}
                  accessible
                  accessibilityLabel={`${ownerEvidenceRole(e.occurred_at, record.computed_at)} · ${ownerEventType(e.event_type)} · ${ownerEvidenceValue(e)} · 发生 ${ownerEvidenceLocalTime(e.occurred_at)} · 录入 ${ownerEvidenceLocalTime(e.recorded_at)} · ${ownerSourceType(e.source_type)} · 完整事件标识 ${e.event_id}`}
                  style={[
                    styles.evidenceText,
                    ownerEvidenceRole(e.occurred_at, record.computed_at) === "当日依据"
                      ? styles.evidenceCurrentText : styles.evidenceHistoricalText,
                  ]}
                >
                  {ownerEvidenceRole(e.occurred_at, record.computed_at)} · {ownerEventType(e.event_type)} · {ownerEvidenceValue(e)}
                  {"\n"}发生 {ownerEvidenceLocalTime(e.occurred_at)} · 录入 {ownerEvidenceLocalTime(e.recorded_at)}
                  {"\n"}{ownerSourceType(e.source_type)} · ID {e.event_id.slice(0, 8)}
                </Text>
              ))}
              {evidence.length < record.evidence_event_ids.length ? (
                <Pressable
                  testID="pli.r8.owner-review.sources.more"
                  accessibilityRole="button"
                  disabled={loading || restoring}
                  style={[styles.sourceAction, (loading || restoring) && styles.sourceDisabled]}
                  onPress={() => void loadMoreEvidence()}
                >
                  <Text style={styles.sourceText}>
                    {loading ? "正在读取后续来源…" :
                      `继续查看余下 ${record.evidence_event_ids.length - evidence.length} 条来源`}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.evidenceProgress}>已可逐条核对全部来源</Text>
              )}
            </View>
          ) : null}
          {evidenceError ? (
            <Text style={styles.error} testID="pli.r8.owner-review.evidence-error">
              {evidenceError}
            </Text>
          ) : null}
          {message ? (
            <Text style={styles.decisionStatus} testID="pli.r8.owner-review.decision-status" accessibilityLiveRegion="polite">
              {message}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              testID="pli.r8.owner-review.record"
              style={styles.primary}
              onPress={() => onRecord(record.case_id, record.metric)}
              disabled={loading || restoring}
            >
              <Text style={styles.primaryText}>补充真实观察</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="pli.r8.owner-review.later"
              style={styles.secondary}
              onPress={() => void review("FOLLOW_UP_LATER")}
              disabled={loading || restoring}
            >
              <Text style={styles.secondaryText}>稍后关注</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="pli.r8.owner-review.correct"
              style={styles.secondary}
              onPress={() => void review("CORRECT_SOURCE")}
              disabled={loading || restoring}
            >
              <Text style={styles.secondaryText}>来源不准确</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="pli.r8.owner-review.dismiss"
              style={styles.secondary}
              onPress={() => void review("NOT_RELEVANT")}
              disabled={loading || restoring}
            >
              <Text style={styles.secondaryText}>暂不关注</Text>
            </Pressable>
          </View>
        </>
      )}
      {!record && message ? <Text style={styles.error} accessibilityLiveRegion="polite">{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginHorizontal: SPACE.s4, marginTop: SPACE.s2, padding: SPACE.s4, borderRadius: 20, backgroundColor: COLORS.stageWarmBase, gap: SPACE.s2 },
  eyebrow: { fontSize: TYPE.meta, fontWeight: "700", color: COLORS.brandPrimaryDeep },
  title: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.textPrimary },
  note: { fontSize: TYPE.sm, lineHeight: 20, color: COLORS.textSecondary },
  fact: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.textPrimary },
  meta: { fontSize: TYPE.caption, lineHeight: 18, color: COLORS.textSecondary },
  question: { fontSize: TYPE.sm, fontWeight: "600", color: COLORS.textPrimary },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  primary: { minHeight: 44, paddingHorizontal: SPACE.s3, justifyContent: "center", alignItems: "center", borderRadius: 16, backgroundColor: COLORS.brandPrimaryDeep },
  primaryText: { fontSize: TYPE.sm, fontWeight: "700", color: COLORS.textInverse },
  secondary: { minHeight: 44, paddingHorizontal: SPACE.s3, justifyContent: "center", alignItems: "center", borderRadius: 16, backgroundColor: COLORS.surfaceRaised },
  secondaryText: { fontSize: TYPE.sm, fontWeight: "600", color: COLORS.textPrimary },
  sourceAction: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  sourceDisabled: { opacity: 0.55 },
  sourceText: { fontSize: TYPE.sm, fontWeight: "700", color: COLORS.brandPrimaryDeep },
  evidenceList: { gap: SPACE.s2, padding: SPACE.s2, borderRadius: 16, backgroundColor: COLORS.surfaceRaised },
  evidenceHeader: { gap: SPACE.s2, paddingHorizontal: SPACE.s2, paddingVertical: SPACE.s2 },
  evidenceLegend: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  evidenceLegendCurrent: { fontSize: TYPE.caption, fontWeight: "700", color: COLORS.brandPrimaryDeep, backgroundColor: COLORS.brandSoft, borderRadius: 15, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s2 },
  evidenceLegendHistorical: { fontSize: TYPE.caption, fontWeight: "700", color: COLORS.textSecondary, backgroundColor: COLORS.stageWarmBase, borderRadius: 15, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s2 },
  evidenceText: { fontSize: TYPE.caption, lineHeight: 21, color: COLORS.textSecondary, padding: SPACE.s3, borderRadius: 14 },
  evidenceCurrentText: { backgroundColor: COLORS.brandSoft },
  evidenceHistoricalText: { backgroundColor: COLORS.stageWarmBase },
  evidenceProgress: { fontSize: TYPE.caption, lineHeight: 18, color: COLORS.textSecondary },
  error: { fontSize: TYPE.sm, color: COLORS.danger },
  warning: { fontSize: TYPE.sm, lineHeight: 21, color: COLORS.textPrimary, backgroundColor: COLORS.brandSoft, padding: SPACE.s3, borderRadius: 12 },
  decisionStatus: { fontSize: TYPE.sm, lineHeight: 21, color: COLORS.brandPrimaryDeep, backgroundColor: COLORS.brandSoft, padding: SPACE.s3, borderRadius: 12 },
});
