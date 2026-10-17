/** R8AJ: owner-readable, read-only frozen change-case journal. */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { api, humanizeError } from "../api";
import { usePets } from "../context";
import type { StackParamList } from "../navigation";
import { COLORS, SPACE, TYPE } from "../tokens";
import { caseHistoryMetric, caseHistoryStatus, type LifeChangeCaseSummary } from "../components/life/ownerCaseHistory";

interface CaseReview {
  review_id: string;
  reviewed_at: string;
  decision: string;
  note: string;
  related_event_ids: string[];
  related_sources_valid: boolean | null;
}
interface CaseDetail extends LifeChangeCaseSummary {
  computed_at: string;
  evidence_role_by_event_id: Record<string, "CURRENT" | "HISTORICAL"> | null;
  evidence_role_source: "FROZEN_AT_CREATION" | "LEGACY_DATE_DERIVED";
  uncertainty: string;
  truth_note: string;
  reviews: CaseReview[];
}
const decisions: Record<string, string> = {
  RECORD_OBSERVATION: "已关联真实后续观察",
  FOLLOW_UP_LATER: "主人选择稍后关注",
  NOT_RELEVANT: "主人选择暂不关注",
  CORRECT_SOURCE: "主人要求重新核对来源",
};
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
    setSnapshot(null);
    setResult(null);
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

  return <SafeAreaView style={styles.page}>
    <View style={styles.header}>
      <Pressable testID="pli.r8.case-detail.back" accessibilityRole="button"
        onPress={() => navigation.goBack()} style={styles.touch}>
        <Text style={styles.link}>‹ 返回</Text>
      </Pressable>
      <Text style={styles.heading}>生活观察档案</Text>
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
        <Text style={styles.body}>当时已记录 {detail.current_value}{unit} · 同期参考 {detail.baseline_value}{unit}</Text>
        <Text style={styles.caption}>{detail.sample_days} 天可比参考 · ${detail.evidence_event_ids.length} 条原始来源</Text>
        <Text style={styles.caption}>对比时间 {dateText(detail.computed_at)} · 不能据此推断疾病或已恢复</Text>
      </View>

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
            {review.related_event_ids.map((id) => <Text key={id} style={styles.id}
              testID={`pli.r8.case-detail.followup.${id}`}>后续事件 ID：{id}</Text>)}
            {review.note?.trim() ? <Text style={styles.body}>主人备注：{review.note}</Text> : null}
          </View>)}
      </View>

      <View style={styles.section} testID="pli.r8.case-detail.evidence">
        <Text style={styles.heading}>当时依据什么？</Text>
        <Text style={detail.source_valid ? styles.body : styles.warning}>
          {detail.source_valid ? "原始记录目前有效。" : "原始记录已改变，这次旧对比已失效。"}
        </Text>
        <Text style={styles.caption}>{detail.evidence_role_source === "FROZEN_AT_CREATION"
          ? "当日与同期来源角色由服务器创建时冻结。" :
          "旧版没有冻结来源角色，不能事后冒充当时分类。"}</Text>
        {detail.evidence_event_ids.map((id) => {
          const role = detail.evidence_role_source === "FROZEN_AT_CREATION"
            ? detail.evidence_role_by_event_id?.[id] : null;
          return <View style={styles.source} key={id}
            testID={`pli.r8.case-detail.source.${id}`}>
            <Text style={styles.label}>{role === "CURRENT" ? "当日依据" :
              role === "HISTORICAL" ? "同期参考" : "来源角色待核实"}</Text>
            <Text style={styles.id} selectable>{id}</Text>
          </View>;
        })}
      </View>

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
  content: { padding: SPACE.s4, gap: SPACE.s4, paddingBottom: SPACE.s12 },
  hero: { borderRadius: 22, padding: SPACE.s5, backgroundColor: COLORS.stageWarmBase, gap: SPACE.s2 },
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
  source: { padding: SPACE.s3, backgroundColor: COLORS.canvas, borderRadius: 12, gap: SPACE.s1 },
  warning: { fontSize: TYPE.body, fontWeight: "700", color: COLORS.danger },
});
