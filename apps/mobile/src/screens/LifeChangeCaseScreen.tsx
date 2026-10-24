/** R8AJ/R8AK: owner-readable, immutable change-case journal + continue review.
 *
 * The detail view is read-only except for explicit append-only owner reviews.
 * It never creates a Case, never invents a diagnosis and never claims a pet
 * recovered; every source keeps its own recorded value, both timestamps and
 * current validity.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, humanizeError } from "../api";
import { usePets } from "../context";
import type { StackParamList } from "../navigation";
import { COLORS, SPACE, TYPE } from "../tokens";
import {
  caseHistoryMetric, caseHistoryNextAction, caseHistoryStatus, type LifeChangeCaseSummary,
} from "../components/life/ownerCaseHistory";
import { CaseSourceList } from "../components/life/CaseSourceList";
import { FollowUpSourceEvidence } from "../components/life/FollowUpSourceEvidence";
import { CaseReviewActions } from "../components/life/CaseReviewActions";
import { CaseOutcomePanel, type OwnerOutcomeRow } from "../components/life/CaseOutcomePanel";

interface CaseReview {
  review_id: string;
  reviewed_at: string;
  decision: string;
  note: string;
  related_event_ids: string[];
  related_evidence_shape_valid?: boolean;
  related_sources_valid: boolean | null;
}
interface CaseDetail extends LifeChangeCaseSummary {
  computed_at: string;
  evidence_role_by_event_id: Record<string, "CURRENT" | "HISTORICAL"> | null;
  evidence_role_source: "FROZEN_AT_CREATION" | "LEGACY_DATE_DERIVED";
  evidence_role_shape_valid?: boolean;
  evidence_shape_valid?: boolean;
  uncertainty: string;
  truth_note: string;
  owner_can_review: boolean;
  latest_review_id: string | null;
  reviews: CaseReview[];
  outcomes: OwnerOutcomeRow[];
  latest_outcome_id: string | null;
}
const decisions: Record<string, string> = {
  RECORD_OBSERVATION: "已关联真实后续观察",
  FOLLOW_UP_LATER: "主人选择稍后关注",
  NOT_RELEVANT: "主人选择暂不关注",
  CORRECT_SOURCE: "主人要求重新核对来源",
};
const METRICS = new Set([
  "walk_minutes_per_day", "meal_count_per_day", "sleep_minutes_per_day",
]);
function dateText(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "时间待核实" : d.toLocaleString("zh-CN", { hour12: false });
}

export function LifeChangeCaseScreen() {
  const route = useRoute<RouteProp<StackParamList, "LifeChangeCase">>();
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();
  const { petId, pets } = usePets();
  const { petId: requestedPetId, caseId } = route.params;
  const matchedPet = petId === requestedPetId;
  const scope = `${petId ?? "none"}:${requestedPetId}:${caseId}`;
  const renderScope = useRef(scope);
  const generation = useRef(0);
  if (renderScope.current !== scope) {
    renderScope.current = scope;
    generation.current += 1;
  }
  const [snapshot, setSnapshot] = useState<{ scope: string; generation: number; data: CaseDetail } | null>(null);
  const [result, setResult] = useState<{ scope: string; generation: number; error: string | null } | null>(null);
  const [reload, setReload] = useState(0);
  const hadFocus = useRef(false);
  useFocusEffect(useCallback(() => {
    if (hadFocus.current) setReload((n) => n + 1);
    else hadFocus.current = true;
  }, []));

  useEffect(() => {
    if (!matchedPet) return;
    let alive = true;
    const epoch = generation.current;
    // A reload (after an owner review) must not unmount the whole journal:
    // doing so erased the just-shown confirmation and dropped scroll context.
    // Keep the same-scope snapshot until the refreshed one replaces it; a
    // different pet/Case still clears immediately via the scope check.
    setSnapshot((before) => (before && before.scope === scope ? before : null));
    setResult((before) => (before && before.scope === scope ? before : null));
    api.get<CaseDetail>(`/pets/${requestedPetId}/life-change-cases/${caseId}`)
      .then((data) => {
        if (!alive || epoch !== generation.current || renderScope.current !== scope) return;
        if (data.pet_id !== requestedPetId || data.case_id !== caseId) {
          setResult({ scope, generation: epoch, error: "返回的档案不属于当前宠物，已停止显示。" });
          return;
        }
        setSnapshot({ scope, generation: epoch, data });
        setResult({ scope, generation: epoch, error: null });
      })
      .catch((error: unknown) => {
        if (alive && epoch === generation.current && renderScope.current === scope) {
          setResult({ scope, generation: epoch, error: humanizeError(error) });
        }
      });
    return () => { alive = false; };
  }, [matchedPet, requestedPetId, caseId, scope, reload]);

  const detail = matchedPet && snapshot?.scope === scope &&
    snapshot.generation === generation.current ? snapshot.data : null;
  const error = matchedPet && result?.scope === scope &&
    result.generation === generation.current ? result.error : null;
  const petName = pets?.find((p) => p.id === requestedPetId)?.name ?? "宠物";
  const metric = detail ? caseHistoryMetric(detail.metric) : null;
  const unit = metric?.unit ? ` ${metric.unit}` : "";
  const nextAction = detail ? caseHistoryNextAction(detail) : null;

  const recordObservation = () => {
    if (!detail || !METRICS.has(detail.metric)) return;
    navigation.navigate("QuickLog", {
      lifeChangeCaseId: detail.case_id,
      lifeChangePetId: requestedPetId,
      lifeChangeMetric: detail.metric as "walk_minutes_per_day" | "meal_count_per_day" | "sleep_minutes_per_day",
    });
  };

  return <SafeAreaView style={styles.page}>
    <View style={styles.header}>
      <Pressable testID="pli.r8.case-detail.back" accessibilityRole="button"
        onPress={() => navigation.goBack()} style={styles.touch}>
        <Text style={styles.link}>‹ 返回</Text>
      </Pressable>
      <Text style={styles.heading}>生活观察档案</Text>
      <Pressable
        testID="pli.r8.case-detail.history"
        accessibilityRole="button"
        accessibilityLabel="查看全部生活观察档案"
        onPress={() => navigation.navigate("LifeChangeHistory", { petId: requestedPetId })}
        style={styles.headerAction}
      >
        <Text style={styles.link}>全部档案</Text>
      </Pressable>
    </View>
    {!matchedPet ? <View style={styles.section} testID="pli.r8.case-detail.pet-mismatch">
      <Text style={styles.heading}>已切换到其他宠物</Text>
      <Text style={styles.body}>请返回对应宠物的历史入口。不同宠物的观察记录不会混用。</Text>
    </View> : error ? <View style={styles.section} testID="pli.r8.case-detail.error">
      <Text style={styles.body}>{error}</Text>
      <Pressable testID="pli.r8.case-detail.retry" accessibilityRole="button"
        onPress={() => setReload((n) => n + 1)} style={styles.touch}>
        <Text style={styles.link}>重新读取</Text>
      </Pressable>
    </View> : !detail ? <View style={styles.section} testID="pli.r8.case-detail.loading">
      <Text style={styles.body}>正在核对冻结来源与主人反馈…</Text>
    </View> : <ScrollView testID="pli.r8.case-detail.scroll" contentContainerStyle={styles.content}>
      <View style={styles.hero} testID="pli.r8.case-detail.identity">
        <Text style={styles.eyebrow}>{petName} · 有来源的生活观察</Text>
        <Text style={styles.title}>{metric?.name ?? "生活"}变化回顾</Text>
        <Text style={styles.link} testID="pli.r8.case-detail.status">{caseHistoryStatus(detail)}</Text>
        {nextAction?.kind === "RECORD_OBSERVATION" ? (
          <Pressable
            testID="pli.r8.case-detail.next-record"
            accessibilityRole="button"
            accessibilityLabel={`${nextAction.label}。${nextAction.note}`}
            onPress={recordObservation}
            style={styles.nextAction}
          >
            <Text style={styles.nextActionTitle}>下一步 · {nextAction.label} →</Text>
            <Text style={styles.caption}>{nextAction.note}</Text>
          </Pressable>
        ) : nextAction ? (
          <View testID={`pli.r8.case-detail.next-${nextAction.kind === "NONE" ? "none" : "review"}`} style={styles.nextStatic}>
            <Text style={styles.nextActionTitle}>下一步 · {nextAction.label}</Text>
            <Text style={styles.caption}>{nextAction.note}</Text>
          </View>
        ) : null}
        <Text style={styles.body}>当时已记录 {detail.current_value}{unit} · 同期参考 {detail.baseline_value}{unit}</Text>
        <Text style={styles.caption}>{detail.sample_days} 天可比参考 · {detail.evidence_event_ids.length} 条原始来源</Text>
        <Text style={styles.caption}>对比时间 {dateText(detail.computed_at)} · 不能据此推断疾病或已恢复</Text>
        {(detail.evidence_shape_valid === false || detail.evidence_role_shape_valid === false) ? (
          <Text style={styles.body} testID="pli.r8.case-detail.frozen-integrity">
            历史来源或角色字段格式异常，无法确认所有依据已核对。
          </Text>
        ) : null}
      </View>

      <CaseReviewActions
        petId={requestedPetId}
        caseId={detail.case_id}
        ownerCanReview={detail.owner_can_review === true}
        latestReviewId={detail.latest_review_id ?? null}
        sourceValid={detail.source_valid}
        onReviewed={() => setReload((n) => n + 1)}
        onRecord={recordObservation}
      />

      <View style={styles.section} testID="pli.r8.case-detail.reviews">
        <Text style={styles.heading}>主人反馈历程</Text>
        <Text style={styles.caption}>历次决定按时间保留。来源后来失效，不会改写原本的主人选择。</Text>
        {detail.reviews.length === 0 ? <Text style={styles.body}>还没有主人反馈。</Text> :
          detail.reviews.map((review) => <View key={review.review_id} style={styles.review}
            testID={`pli.r8.case-detail.review.${review.review_id}`}>
            <Text style={styles.label}>{decisions[review.decision] ?? "已保存的主人决定"}</Text>
            <Text style={styles.caption}>{dateText(review.reviewed_at)}</Text>
            {review.decision === "RECORD_OBSERVATION" ?
              <Text style={review.related_sources_valid === false ? styles.warning : styles.body}>
                {review.related_sources_valid === true ? "后续记录目前有效" :
                  review.related_sources_valid === false ? "后续记录已撤回或修正，需重新核对" : "后续记录有效性待核实"}
              </Text> : null}
            {review.related_evidence_shape_valid === false ? (
              <Text style={styles.warning} testID={`pli.r8.case-detail.followup-integrity.${review.review_id}`}>
                历史后续来源格式异常，部分原始事件标识无法核对。
              </Text>
            ) : null}
            {review.related_event_ids.map((id) => <Text key={id} style={styles.id}
              testID={`pli.r8.case-detail.followup.${id}`}>后续事件 ID：{id}</Text>)}
            {review.decision === "RECORD_OBSERVATION" ? (
              <FollowUpSourceEvidence
                petId={requestedPetId}
                caseId={detail.case_id}
                reviewId={review.review_id}
                expectedSourceIds={review.related_event_ids}
                ownerCanRetract={detail.owner_can_review === true && detail.source_valid}
                onSourceChanged={() => setReload((n) => n + 1)}
              />
            ) : null}
            {review.note?.trim() ? <Text style={styles.body}>主人备注：{review.note}</Text> : null}
          </View>)}
      </View>

      <CaseOutcomePanel
        petId={requestedPetId}
        caseId={detail.case_id}
        ownerCanWrite={detail.owner_can_review === true && detail.source_valid}
        observationReviewId={
          [...detail.reviews].reverse().find(
            (review) => review.decision === "RECORD_OBSERVATION" && review.related_sources_valid === true,
          )?.review_id ?? null
        }
        latestReviewId={detail.latest_review_id ?? null}
        latestOutcomeId={detail.latest_outcome_id ?? null}
        outcomes={detail.outcomes ?? []}
        onRecorded={() => setReload((n) => n + 1)}
      />

      <CaseSourceList
        petId={requestedPetId}
        caseId={detail.case_id}
        computedAt={detail.computed_at}
        expectedSourceIds={detail.evidence_event_ids}
        frozenRoles={detail.evidence_role_by_event_id}
        roleSource={detail.evidence_role_source}
        roleIntegrityValid={detail.evidence_role_shape_valid !== false}
        metric={detail.metric}
        ownerCanRetract={detail.owner_can_review === true}
        onRetracted={() => setReload((n) => n + 1)}
      />

      <View style={styles.section}>
        <Text style={styles.heading}>解释边界</Text>
        <Text style={styles.body}>{detail.truth_note}</Text>
        <Text style={styles.caption}>{detail.uncertainty}</Text>
        <Pressable testID="pli.r8.case-detail.timeline" accessibilityRole="button"
          style={styles.touch} onPress={() => navigation.navigate("Tabs", { screen: "Timeline" })}>
          <Text style={styles.link}>回看真实生活时间线 →</Text>
        </Pressable>
      </View>
      <Text style={styles.id} testID="pli.r8.case-detail.case-id">Case ID：{detail.case_id}</Text>
    </ScrollView>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  header: { flexDirection: "row", alignItems: "center", gap: SPACE.s3, paddingHorizontal: SPACE.s4, backgroundColor: COLORS.surface },
  headerAction: { marginLeft: "auto", minHeight: 44, justifyContent: "center" },
  content: { padding: SPACE.s4, gap: SPACE.s4, paddingBottom: SPACE.s12 },
  hero: { borderRadius: 22, padding: SPACE.s5, backgroundColor: COLORS.stageWarmBase, gap: SPACE.s2 },
  nextAction: {
    minHeight: 52, justifyContent: "center", gap: 2, marginTop: SPACE.s1,
    paddingVertical: SPACE.s2, borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle,
  },
  nextStatic: {
    gap: 2, marginTop: SPACE.s1, paddingVertical: SPACE.s2,
    borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle,
  },
  nextActionTitle: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.bodyStrong, fontWeight: "700" },
  section: { margin: SPACE.s4, backgroundColor: COLORS.surface, borderRadius: 18, padding: SPACE.s4, gap: SPACE.s3 },
  heading: { color: COLORS.textPrimary, fontSize: TYPE.section, fontWeight: "700" },
  title: { color: COLORS.textPrimary, fontSize: TYPE.pageTitle, fontWeight: "700" },
  eyebrow: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.meta, fontWeight: "700" },
  label: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.bodyStrong, fontWeight: "700" },
  link: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.body, fontWeight: "700" },
  body: { color: COLORS.textPrimary, fontSize: TYPE.body, lineHeight: 21 },
  caption: { color: COLORS.textSecondary, fontSize: TYPE.sm, lineHeight: 19 },
  id: { color: COLORS.textSecondary, fontSize: TYPE.caption, lineHeight: 18 },
  touch: { minHeight: 44, justifyContent: "center" },
  review: { paddingLeft: SPACE.s3, borderLeftWidth: 3, borderLeftColor: COLORS.brandSoftGreen, gap: SPACE.s2 },
  warning: { fontSize: TYPE.body, fontWeight: "700", color: COLORS.danger },
});
