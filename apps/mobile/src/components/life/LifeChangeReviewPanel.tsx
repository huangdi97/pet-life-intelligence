/** R8 owner-reviewed change: never a diagnosis or an automatic owner action. */
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { api, humanizeError } from "../../api";
import { COLORS, SPACE, TYPE } from "../../tokens";

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
  state: string;
  human_question: string;
}

interface LifeCaseDetail extends LifeCase {
  reviews: Array<{ review_id: string; decision: string }>;
}

interface EvidenceEvent {
  event_id: string;
  event_type: string;
  occurred_at: string;
  recorded_at: string;
  source_type: string;
}

type Decision = "FOLLOW_UP_LATER" | "NOT_RELEVANT" | "CORRECT_SOURCE";

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

export function LifeChangeReviewPanel({
  petId, change, onRecord,
}: {
  petId: string;
  change: NotableRecordedChange;
  onRecord: (caseId: string, metric: LifeMetric) => void;
}) {
  const [record, setRecord] = useState<LifeCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceEvent[] | null>(null);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  useEffect(() => {
    let alive = true;
    setRecord(null);
    setMessage(null);
    setEvidence(null);
    setShowEvidence(false);
    api.get<{ cases: LifeCase[] }>(`/pets/${petId}/life-change-cases`)
      .then((result) => {
        if (!alive) return;
        const matched = result.cases.find((c) =>
          c.metric === change.metric && c.source_valid &&
          c.current_value === change.current_value &&
          c.baseline_value === change.same_time_baseline,
        );
        if (matched) setRecord(matched);
      })
      .catch(() => { /* No old Case required to show the owner invitation. */ });
    return () => { alive = false; };
  }, [petId, change.metric, change.current_value, change.same_time_baseline]);

  const create = async () => {
    if (loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const saved = await api.post<LifeCase>(
        `/pets/${petId}/life-change-cases`, { metric: change.metric },
      );
      if (saved.pet_id !== petId) throw new Error("CASE_PET_MISMATCH");
      setRecord(saved);
    } catch (e: unknown) {
      setMessage(humanizeError(e));
    } finally {
      setLoading(false);
    }
  };

  const review = async (decision: Decision) => {
    if (!record || loading) return;
    setLoading(true);
    setMessage(null);
    try {
      const details = await api.get<LifeCaseDetail>(
        `/pets/${petId}/life-change-cases/${record.case_id}`,
      );
      if (!details.source_valid || details.pet_id !== petId) {
        setMessage("原始记录已经变化，请刷新后重新核对。");
        return;
      }
      const last = details.reviews[details.reviews.length - 1];
      await api.post(
        `/pets/${petId}/life-change-cases/${record.case_id}/reviews`,
        { decision, expected_latest_review_id: last?.review_id ?? null },
      );
      const updated = await api.get<LifeCaseDetail>(
        `/pets/${petId}/life-change-cases/${record.case_id}`,
      );
      setRecord(updated);
      setMessage(
        decision === "NOT_RELEVANT"
          ? "已记录你的判断；不代表宠物健康状态已被证明正常。"
          : decision === "CORRECT_SOURCE"
            ? "已记录需要核对来源；请在记录详情中完成真正的修正。"
            : "已记录稍后观察；没有自动创建医疗任务。",
      );
    } catch (e: unknown) {
      setMessage(humanizeError(e));
    } finally {
      setLoading(false);
    }
  };

  const inspectEvidence = async () => {
    if (!record || loading) return;
    if (showEvidence) { setShowEvidence(false); return; }
    setShowEvidence(true);
    if (evidence) return;
    setEvidenceError(null);
    setLoading(true);
    try {
      const rows = await Promise.all(
        record.evidence_event_ids.slice(0, 8).map((id) =>
          api.get<EvidenceEvent>(`/events/${id}`),
        ),
      );
      setEvidence(rows);
    } catch (e: unknown) {
      setEvidenceError(humanizeError(e));
    } finally {
      setLoading(false);
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
          disabled={loading}
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
            {record.sample_days} 天可比记录 · {record.evidence_event_ids.length} 条来源 · {record.state === "PROPOSED" ? "等待主人确认" : "已有主人反馈"}
          </Text>
          <Text style={styles.question}>{record.human_question}</Text>
          <Pressable
            testID="pli.r8.owner-review.sources"
            accessibilityRole="button"
            onPress={() => void inspectEvidence()}
            style={styles.sourceAction}
            disabled={loading}
          >
            <Text style={styles.sourceText}>{showEvidence ? "收起记录来源" : "查看原始记录来源"}</Text>
          </Pressable>
          {showEvidence && evidence ? (
            <View style={styles.evidenceList} testID="pli.r8.owner-review.evidence">
              {evidence.map((e) => (
                <Text key={e.event_id} style={styles.evidenceText}>
                  {e.event_type} · {e.occurred_at.slice(0, 10)} · {e.source_type} · ID {e.event_id.slice(0, 8)}
                </Text>
              ))}
              {record.evidence_event_ids.length > 8 ? (
                <Text style={styles.meta}>还有 {record.evidence_event_ids.length - 8} 条来源，可在时间线继续查看。</Text>
              ) : null}
            </View>
          ) : null}
          {evidenceError ? <Text style={styles.error}>{evidenceError}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              testID="pli.r8.owner-review.record"
              style={styles.primary}
              onPress={() => onRecord(record.case_id, record.metric)}
              disabled={loading}
            >
              <Text style={styles.primaryText}>补充真实观察</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="pli.r8.owner-review.later"
              style={styles.secondary}
              onPress={() => void review("FOLLOW_UP_LATER")}
              disabled={loading}
            >
              <Text style={styles.secondaryText}>稍后关注</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="pli.r8.owner-review.correct"
              style={styles.secondary}
              onPress={() => void review("CORRECT_SOURCE")}
              disabled={loading}
            >
              <Text style={styles.secondaryText}>来源不准确</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              testID="pli.r8.owner-review.dismiss"
              style={styles.secondary}
              onPress={() => void review("NOT_RELEVANT")}
              disabled={loading}
            >
              <Text style={styles.secondaryText}>暂不关注</Text>
            </Pressable>
          </View>
        </>
      )}
      {message ? <Text style={styles.meta} accessibilityLiveRegion="polite">{message}</Text> : null}
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
  sourceText: { fontSize: TYPE.sm, fontWeight: "700", color: COLORS.brandPrimaryDeep },
  evidenceList: { gap: SPACE.s1, padding: SPACE.s3, borderRadius: 12, backgroundColor: COLORS.surfaceRaised },
  evidenceText: { fontSize: TYPE.caption, lineHeight: 18, color: COLORS.textSecondary },
  error: { fontSize: TYPE.sm, color: COLORS.danger },
});
