/**
 * SearchScreen — contextual record search under Timeline (R5.5 §7).
 *
 * Searches only the current pet's real event index. No generated history and
 * no second first-level IA. Assistant remains the place for Ask/Explain/Plan.
 */
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError } from "../api";
import { usePets } from "../context";
import { fmtTime } from "../format";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { EmptyState, InlineError } from "../components/feedback/Feedback";
import { eventTypeLabel } from "./ui_labels";

interface SearchHit {
  event_id: string;
  event_type: string;
  occurred_at: string;
  payload: Record<string, unknown>;
}

function payloadSummary(payload: Record<string, unknown>): string {
  for (const key of ["note", "description", "title", "behavior", "chief_complaint"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "已记录事件";
}

export function SearchScreen() {
  const { pets, petId } = usePets();
  const pet = pets?.find((row) => row.id === petId) ?? pets?.[0] ?? null;
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    const value = query.trim();
    if (!petId || !value || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.get<{ hits: SearchHit[] }>(
        `/pets/${petId}/search?q=${encodeURIComponent(value)}`,
      );
      setHits(result.hits);
    } catch (e: unknown) {
      setError(humanizeError(e));
      setHits(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head} testID="pli.search.identity">
          <Text style={styles.title}>搜索记录</Text>
          <Text style={styles.sub}>
            {pet ? `只查找${pet.name}已经存在的生活记录` : "选择宠物后查找已有记录"}
          </Text>
        </View>

        <View style={styles.searchSurface}>
          <TextInput
            testID="pli.search.input"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void search()}
            returnKeyType="search"
            placeholder="如：猫砂盆、疫苗、散步"
            placeholderTextColor={COLORS.textTertiary}
            style={styles.input}
          />
          <Pressable
            testID="pli.search.action"
            accessibilityRole="button"
            accessibilityLabel="搜索宠物记录"
            accessibilityState={{ disabled: busy || !petId || !query.trim() }}
            disabled={busy || !petId || !query.trim()}
            onPress={() => void search()}
            style={[styles.searchButton, (busy || !petId || !query.trim()) && styles.disabled]}
          >
            <Text style={styles.searchButtonText}>{busy ? "查找中…" : "搜索"}</Text>
          </Pressable>
        </View>

        {error ? <InlineError message={error} /> : null}

        {hits === null && !busy && !error ? (
          <View style={styles.hint}>
            <Text style={styles.hintTitle}>从真实记录开始</Text>
            <Text style={styles.hintBody}>搜索只返回已经记录过的事实；没有匹配时会明确告诉你没有找到。</Text>
          </View>
        ) : null}

        {hits !== null ? (
          <View style={styles.results} testID="pli.search.results">
            <View style={styles.resultsHead}>
              <Text style={styles.resultsTitle}>搜索结果</Text>
              <Text style={styles.resultsCount}>{hits.length} 条</Text>
            </View>
            {hits.length === 0 ? (
              <EmptyState
                title="没有找到匹配记录"
                body="换一个关键词试试；这里不会为了给出结果而生成历史。"
              />
            ) : (
              hits.map((hit, index) => (
                <View key={hit.event_id} style={[styles.row, index > 0 && styles.rowDivider]}>
                  <View style={styles.rowHead}>
                    <Text style={styles.rowType}>{eventTypeLabel(hit.event_type)}</Text>
                    <Text style={styles.rowTime}>{fmtTime(hit.occurred_at)}</Text>
                  </View>
                  <Text style={styles.rowBody}>{payloadSummary(hit.payload)}</Text>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  head: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 2, lineHeight: 20 },
  searchSurface: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s4, gap: SPACE.s2 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.dividerStrong,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACE.s3,
    fontSize: TYPE.body,
    color: COLORS.textPrimary,
  },
  searchButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.brandPrimary,
  },
  searchButtonText: { fontSize: TYPE.button, color: COLORS.textInverse, fontWeight: "600" },
  disabled: { opacity: 0.45 },
  hint: {
    marginHorizontal: SPACE.s4,
    marginTop: SPACE.s5,
    padding: SPACE.s4,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.brandSoftGreen,
  },
  hintTitle: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary },
  hintBody: { marginTop: SPACE.s1, fontSize: TYPE.sm, lineHeight: 20, color: COLORS.textSecondary },
  results: { marginHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  resultsHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultsTitle: { fontSize: TYPE.section, fontWeight: "700", color: COLORS.textPrimary },
  resultsCount: { fontSize: TYPE.meta, color: COLORS.textTertiary },
  row: { paddingVertical: SPACE.s3 },
  rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  rowHead: { flexDirection: "row", justifyContent: "space-between", gap: SPACE.s3 },
  rowType: { flex: 1, fontSize: TYPE.body, fontWeight: "600", color: COLORS.textPrimary },
  rowTime: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  rowBody: { marginTop: SPACE.s1, fontSize: TYPE.sm, lineHeight: 20, color: COLORS.textSecondary },
});
