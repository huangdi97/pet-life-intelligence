/**
 * today_sections — TodayScreen-only presentational fragments (health summary,
 * offline state, no-pet empty state). Extracted so TodayScreen stays under the
 * 300-line production limit. All copy derives from real API facts; nothing
 * invents health state.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { HealthEventRow } from "../api";
import { COLORS, SPACE, TYPE } from "../tokens";
import { InlineError } from "../components/feedback/Feedback";
import { PetSpeciesGlyph } from "../components/pet/PetSpeciesGlyph";

interface HealthSummaryProps {
  health: HealthEventRow[];
  hint: { hints: string[]; rule: string } | null;
}

/** One honest health line under the living stage (danger → change → stable → none). */
export function TodayHealthSummary({ health, hint }: HealthSummaryProps) {
  const danger = health.find((r) => r.latest_triage_level === "URGENT" || r.latest_triage_level === "EMERGENCY");
  const abnormal = hint?.hints.find((x) => !x.includes("无明显异常"));
  let text: string;
  if (danger) text = `健康：${danger.chief_complaint ?? "1 项需要留意"}`;
  else if (abnormal) text = "健康：有值得留意的变化";
  else if (health.length > 0 || hint !== null) text = "健康状态：总体稳定";
  else text = "健康状态：暂无记录";
  return (
    <View testID="pli.today.health-summary" style={styles.summaryWrap}>
      <Text style={styles.summaryText}>{text}</Text>
    </View>
  );
}

interface OfflineProps {
  cachedAt: number | null;
  onRetry: () => void;
}

/** Offline state: honest retry + last-sync line (or "还没有缓存内容"). */
export function TodayOffline({ cachedAt, onRetry }: OfflineProps) {
  return (
    <View testID="pli.offline.state">
      <InlineError message="暂时连接不上，已展示已有内容" />
      <View style={styles.offlineRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="重试"
          testID="pli.offline.retry"
          onPress={onRetry}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>重试</Text>
        </Pressable>
        <Text
          testID={cachedAt !== null ? "pli.offline.last-sync" : "pli.offline.cached"}
          style={styles.offlineMeta}
        >
          {cachedAt !== null
            ? `上次同步：${new Date(cachedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`
            : "还没有缓存内容"}
        </Text>
      </View>
    </View>
  );
}

/** No-pet presence state (pets resolved to an empty list). */
export function TodayEmptyPet({ onAction }: { onAction: () => void }) {
  return (
    <View style={styles.emptyWrap} testID="pli.today.identity" accessible accessibilityLabel="今日 · 还没有宠物">
      <View testID="pli.empty.pet">
        <PetSpeciesGlyph glyph="paw" size={96} />
      </View>
      <Text testID="pli.empty.why" style={styles.emptyWhy}>
        还没有宠物，先添加第一只宠物开始记录。
      </Text>
      <Pressable
        testID="pli.empty.action"
        accessibilityRole="button"
        accessibilityLabel="重新加载"
        onPress={onAction}
        style={styles.emptyAction}
      >
        <Text style={styles.emptyActionText}>重新加载</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { alignItems: "center", paddingHorizontal: SPACE.s8, paddingVertical: SPACE.s10 },
  emptyWhy: { fontSize: TYPE.body, color: COLORS.textSecondary, textAlign: "center", marginTop: SPACE.s4, lineHeight: 22 },
  emptyAction: { marginTop: SPACE.s4, backgroundColor: COLORS.brandSoftGreen, borderRadius: 999, paddingHorizontal: SPACE.s5, paddingVertical: 10 },
  emptyActionText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  summaryWrap: { marginHorizontal: SPACE.s4, marginTop: SPACE.s3 },
  summaryText: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  offlineRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s3, paddingHorizontal: SPACE.s4, marginTop: SPACE.s1 },
  retryBtn: { backgroundColor: COLORS.brandSoftGreen, borderRadius: 999, paddingHorizontal: SPACE.s3, paddingVertical: 6 },
  retryText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  offlineMeta: { fontSize: TYPE.caption, color: COLORS.textTertiary, flex: 1 },
});
