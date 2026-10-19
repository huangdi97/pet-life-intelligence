/** R8AK: complete owner-readable Case history with bounded search + paging.
 *
 * The list is not a diagnosis feed. Every row keeps the frozen recorded values,
 * sample size and current evidence-validity state, and opens the immutable
 * source/review detail for that exact Case and pet.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useIsFocused, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { humanizeError } from "../api";
import { usePets } from "../context";
import type { StackParamList } from "../navigation";
import { COLORS, SPACE, TYPE } from "../tokens";
import {
  caseHistoryMetric, caseHistoryStatus, type LifeChangeCaseSummary,
} from "../components/life/ownerCaseHistory";
import { listCaseHistory, type CaseHistoryPage } from "../components/life/caseHistoryApi";

const PAGE = 10;
const FILTERS: Array<{ key: string | null; label: string }> = [
  { key: null, label: "全部" },
  { key: "walk_minutes_per_day", label: "散步" },
  { key: "meal_count_per_day", label: "进食" },
  { key: "sleep_minutes_per_day", label: "睡眠" },
];

const VALIDITY_FILTERS: Array<{ key: "VALID" | "INVALID" | null; label: string }> = [
  { key: null, label: "全部来源" },
  { key: "VALID", label: "来源有效" },
  { key: "INVALID", label: "已失效" },
];

function dayText(value: string): string {
  const instant = new Date(value);
  return Number.isFinite(instant.getTime())
    ? instant.toLocaleString("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    })
    : "时间待核实";
}

export function LifeChangeHistoryScreen() {
  const route = useRoute<RouteProp<StackParamList, "LifeChangeHistory">>();
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();
  const isFocused = useIsFocused();
  const { petId, pets } = usePets();
  const requestedPetId = route.params.petId;
  const matchedPet = petId === requestedPetId;
  const [metric, setMetric] = useState<string | null>(null);
  const [validity, setValidity] = useState<"VALID" | "INVALID" | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<LifeChangeCaseSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Identity changes must hide stale owner Cases in the SAME render, not
  // later when an effect clears state. All five dimensions are security
  // relevant: selected pet, route owner, metric, search and source validity.
  const scopeKey = JSON.stringify([petId, requestedPetId, metric, query.trim(), validity]);
  const [resultScopeKey, setResultScopeKey] = useState<string | null>(null);
  const scopeReady = isFocused && matchedPet && resultScopeKey === scopeKey;
  const visibleRows = scopeReady ? rows : [];
  const visibleCursor = scopeReady ? cursor : null;
  const visibleHasMore = scopeReady ? hasMore : false;
  const visibleTotal = scopeReady ? total : null;
  const visibleError = scopeReady ? error : null;
  const visibleLoading = loading || !scopeReady;

  // One generation per first-page scope and one in-flight page-2 request.
  // Cleanup advances the generation, so a response after unmount or pet
  // switch cannot append a previous pet's Case history.
  const generation = useRef(0);
  const moreInFlight = useRef(false);

  const load = useCallback(async (nextCursor: string | null, append: boolean) => {
    if (!matchedPet || (append && (!nextCursor || moreInFlight.current))) return;
    const epoch = append ? generation.current : ++generation.current;
    if (append) moreInFlight.current = true;
    else {
      moreInFlight.current = false;
      setResultScopeKey(null);
      setRows([]);
      setCursor(null);
      setHasMore(false);
      setTotal(null);
    }
    setLoading(true);
    setError(null);
    try {
      const page: CaseHistoryPage = await listCaseHistory(requestedPetId, {
        limit: PAGE, cursor: nextCursor, metric, q: query, validity,
      });
      if (epoch !== generation.current) return;
      setRows((before) => {
        if (!append) return page.cases;
        const seen = new Set(before.map((item) => item.case_id));
        return [...before, ...page.cases.filter((item) => !seen.has(item.case_id))];
      });
      setCursor(page.next_cursor);
      setHasMore(page.has_more);
      setTotal(page.total);
      setResultScopeKey(scopeKey);
    } catch (e: unknown) {
      if (epoch !== generation.current) return;
      setError(
        e instanceof Error && e.message === "HISTORY_PET_MISMATCH"
          ? "返回的历史不属于当前宠物，已停止显示。"
          : humanizeError(e),
      );
      setResultScopeKey(scopeKey);
    } finally {
      if (epoch === generation.current) {
        moreInFlight.current = false;
        setLoading(false);
      }
    }
  }, [matchedPet, metric, query, requestedPetId, scopeKey, validity]);

  // A stacked history screen remains mounted under Case Detail. Returning
  // after a source correction/retraction must fetch new server-derived truth,
  // even when pet/filter/search did not change. useFocusEffect runs on every
  // actual navigation refocus and invalidates background HTTP completions.
  useFocusEffect(useCallback(() => {
    if (matchedPet) void load(null, false);
    else {
      generation.current += 1;
      moreInFlight.current = false;
      setResultScopeKey(null);
      setRows([]);
      setCursor(null);
      setHasMore(false);
      setTotal(null);
      setError(null);
      setLoading(false);
    }
    return () => {
      generation.current += 1;
      moreInFlight.current = false;
    };
  }, [matchedPet, load]));

  // Mask old history BEFORE the next focus render. Focus cleanup alone cannot
  // prove a mounted screen has discarded a result before it becomes visible.
  // The navigation blur event occurs while the child Case detail takes focus;
  // the synchronous render guard also refuses data while out of focus.
  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      generation.current += 1;
      moreInFlight.current = false;
      setResultScopeKey(null);
    });
    return unsubscribe;
  }, [navigation]);

  const petName = pets?.find((p) => p.id === requestedPetId)?.name ?? "宠物";

  const openCase = (caseId: string) => {
    if (!matchedPet) return;
    navigation.navigate("LifeChangeCase", { petId: requestedPetId, caseId });
  };

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <Pressable
          testID="pli.r8.history.back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.touch}
        >
          <Text style={styles.link}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.pageTitle}>生活观察档案</Text>
      </View>
      {!matchedPet ? (
        <View style={styles.block} testID="pli.r8.history.pet-mismatch">
          <Text style={styles.heading}>已切换到其他宠物</Text>
          <Text style={styles.caption}>不同宠物的观察档案不会混在一起。请回到对应宠物再打开。</Text>
        </View>
      ) : (
        <ScrollView
          testID="pli.r8.history"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>{petName} · 持续记忆</Text>
            <Text style={styles.title}>有来源的生活观察</Text>
            <Text style={styles.caption}>
              这里保留主人核对过的记录变化。今天不再提示，不代表宠物已经恢复或没有问题。
              {visibleTotal != null ? ` 共 ${visibleTotal} 条档案。` : ""}
            </Text>
          </View>

          <View style={styles.filters}>
            {FILTERS.map((item) => {
              const active = metric === item.key;
              return (
                <Pressable
                  key={item.key ?? "all"}
                  testID={`pli.r8.history.filter.${item.key ?? "all"}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setMetric(item.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.filters}>
            {VALIDITY_FILTERS.map((item) => {
              const active = validity === item.key;
              return (
                <Pressable
                  key={item.key ?? "all"}
                  testID={`pli.r8.history.validity.${item.key ?? "all"}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setValidity(item.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.searchRow}>
            <TextInput
              testID="pli.r8.history.search"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => setQuery(draft)}
              placeholder="按生活记录搜索，例如 散步"
              placeholderTextColor={COLORS.textSecondary}
              returnKeyType="search"
              style={styles.search}
              accessibilityLabel="搜索生活观察档案"
            />
            <Pressable
              testID="pli.r8.history.search-submit"
              accessibilityRole="button"
              onPress={() => setQuery(draft)}
              style={styles.searchAction}
            >
              <Text style={styles.link}>搜索</Text>
            </Pressable>
          </View>

          {visibleError ? (
            <View style={styles.block} testID="pli.r8.history.error">
              <Text style={styles.warning}>{visibleError}</Text>
              <Pressable
                testID="pli.r8.history.retry"
                accessibilityRole="button"
                onPress={() => void load(null, false)}
                style={styles.touch}
              >
                <Text style={styles.link}>重新读取</Text>
              </Pressable>
            </View>
          ) : null}

          {!visibleLoading && !visibleError && visibleRows.length === 0 ? (
            <View style={styles.block} testID="pli.r8.history.empty">
              <Text style={styles.body}>还没有符合条件的观察档案。</Text>
              <Text style={styles.caption}>空不代表没有记录；只是这里还没有主人核对过的变化。</Text>
            </View>
          ) : null}

          {visibleRows.map((item) => {
            const itemMetric = caseHistoryMetric(item.metric);
            const unit = itemMetric.unit ? ` ${itemMetric.unit}` : "";
            const status = caseHistoryStatus(item);
            return (
              <Pressable
                key={item.case_id}
                testID={`pli.r8.history.case.${item.case_id}`}
                accessibilityRole="button"
                accessibilityLabel={`${itemMetric.name}记录 · ${status} · 当时已记录 ${item.current_value}${unit} · 同期参考 ${item.baseline_value}${unit} · ${item.sample_days} 天参考 · ${item.evidence_event_ids.length} 条来源`}
                onPress={() => openCase(item.case_id)}
                style={styles.card}
              >
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>{itemMetric.name}记录</Text>
                  <Text style={[styles.status, (!item.source_valid || item.follow_up_source_valid === false) && styles.warn]}>
                    {status}
                  </Text>
                </View>
                <Text style={styles.facts}>
                  当时已记录 {item.current_value}{unit} · 同期参考 {item.baseline_value}{unit}
                </Text>
                <Text style={styles.caption}>
                  {item.sample_days} 天可比参考 · {item.evidence_event_ids.length} 条冻结来源 · 非健康诊断
                </Text>
                <Text style={styles.caption}>Case ID {item.case_id}</Text>
                <Text style={styles.open}>查看来源与主人反馈 →</Text>
              </Pressable>
            );
          })}

          {visibleLoading ? <Text style={styles.caption} testID="pli.r8.history.loading">正在核对档案…</Text> : null}
          {visibleHasMore && !visibleLoading ? (
            <Pressable
              testID="pli.r8.history.more"
              accessibilityRole="button"
              onPress={() => void load(visibleCursor, true)}
              style={styles.touch}
            >
              <Text style={styles.link}>继续查看更早的档案</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  header: {
    flexDirection: "row", alignItems: "center", gap: SPACE.s3,
    paddingHorizontal: SPACE.s4, backgroundColor: COLORS.surface,
  },
  pageTitle: { color: COLORS.textPrimary, fontSize: TYPE.section, fontWeight: "700" },
  content: { padding: SPACE.s4, gap: SPACE.s3, paddingBottom: SPACE.s12 },
  intro: { gap: SPACE.s2, padding: SPACE.s4, borderRadius: 20, backgroundColor: COLORS.stageWarmBase },
  eyebrow: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.meta, fontWeight: "700" },
  title: { color: COLORS.textPrimary, fontSize: TYPE.pageTitle, fontWeight: "700" },
  heading: { color: COLORS.textPrimary, fontSize: TYPE.section, fontWeight: "700" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2 },
  chip: {
    minHeight: 40, paddingHorizontal: SPACE.s3, justifyContent: "center",
    borderRadius: 20, backgroundColor: COLORS.surfaceRaised,
  },
  chipActive: { backgroundColor: COLORS.brandPrimaryDeep },
  chipText: { fontSize: TYPE.sm, fontWeight: "600", color: COLORS.textPrimary },
  chipTextActive: { color: COLORS.textInverse },
  searchRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2 },
  search: {
    flex: 1, minHeight: 44, borderRadius: 14, paddingHorizontal: SPACE.s3,
    backgroundColor: COLORS.surface, color: COLORS.textPrimary,
  },
  searchAction: { minHeight: 44, justifyContent: "center", paddingHorizontal: SPACE.s2 },
  card: { padding: SPACE.s4, borderRadius: 18, backgroundColor: COLORS.stageWarmBase, gap: SPACE.s2 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: SPACE.s2 },
  cardTitle: { color: COLORS.textPrimary, fontSize: TYPE.bodyStrong, fontWeight: "700" },
  status: { flexShrink: 1, textAlign: "right", fontSize: TYPE.sm, fontWeight: "600", color: COLORS.brandPrimaryDeep },
  warn: { color: COLORS.danger },
  facts: { color: COLORS.textPrimary, fontSize: TYPE.sm },
  caption: { color: COLORS.textSecondary, fontSize: TYPE.sm, lineHeight: 19 },
  body: { color: COLORS.textPrimary, fontSize: TYPE.body, lineHeight: 21 },
  open: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.sm, fontWeight: "700" },
  block: { padding: SPACE.s4, borderRadius: 18, backgroundColor: COLORS.surface, gap: SPACE.s2 },
  warning: { color: COLORS.danger, fontSize: TYPE.body, fontWeight: "700" },
  link: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.body, fontWeight: "700" },
  touch: { minHeight: 44, justifyContent: "center" },
});
