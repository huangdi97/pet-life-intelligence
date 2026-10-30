/** A persisted Case remains visible AFTER a day's change hint disappears.
 * This is a compact read-only journal; review actions and original clinical
 * contents are deliberately not reconstructed from a dashboard summary.
 */
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, SPACE, TYPE } from "../../tokens";
import {
  caseHistoryMetric, caseHistoryNeedsAttention, caseHistoryNextAction, caseHistoryStatus,
  type LifeChangeCaseSummary,
} from "./ownerCaseHistory";

export function OwnerChangeHistory({
  petId, cases, onOpenTimeline, onOpenCase, onOpenHistory, onRecordObservation,
}: {
  petId: string;
  cases: LifeChangeCaseSummary[];
  onOpenTimeline: () => void;
  onOpenCase: (caseId: string) => void;
  onOpenHistory?: () => void;
  onRecordObservation?: (item: LifeChangeCaseSummary) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Even if a server response is accidentally stale, never paint pet A's
  // immutable case references on pet B's Today surface.
  const own = cases.filter((c) => c.pet_id === petId);
  if (own.length === 0) return null;
  const visible = expanded ? own : own.slice(0, 2);

  return (
    <View testID="pli.r8.owner-history" style={styles.section}>
      <Text style={styles.eyebrow}>持续记忆</Text>
      <Text style={styles.title}>最近的生活观察回顾</Text>
      <Text style={styles.intro}>
        已创建的核对会保留。今天不再显示变化提示，不代表宠物已经恢复或没有问题。
      </Text>
      <View style={styles.entries}>
        {visible.map((c) => {
          const metric = caseHistoryMetric(c.metric);
          const status = caseHistoryStatus(c);
          const unit = metric.unit ? ` ${metric.unit}` : "";
          const next = caseHistoryNextAction(c);
          return (
            <View key={c.case_id} style={styles.entry}>
              <Pressable
                testID={`pli.r8.owner-history.case.${c.case_id}`}
                accessibilityRole="button"
                onPress={() => onOpenCase(c.case_id)}
                accessible
                accessibilityLabel={`${metric.name}记录核对 · ${status} · 当前观察 ${c.current_value}${unit} · 个人同期记录 ${c.baseline_value}${unit} · ${c.sample_days} 天参考 · ${c.evidence_event_ids.length} 条原始来源 · Case ${c.case_id}`}
                style={styles.summary}
              >
                <View style={styles.entryHead}>
                  <Text style={styles.metric}>{metric.name}记录</Text>
                  <Text style={[styles.status, caseHistoryNeedsAttention(c) && styles.warn]}>{status}</Text>
                </View>
                <Text style={styles.facts}>
                  当时已记录 {c.current_value}{unit} · 同期参考 {c.baseline_value}{unit}
                </Text>
                <Text style={styles.provenance}>
                  {c.sample_days} 天可比参考 · {c.evidence_event_ids.length} 条冻结来源 · 非健康诊断
                </Text>
                <Text style={styles.openDetail}>查看完整档案 →</Text>
              </Pressable>
              {next.kind === "RECORD_OBSERVATION" && onRecordObservation ? (
                <Pressable
                  testID={`pli.r8.owner-history.next-record.${c.case_id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${next.label}。${next.note}`}
                  onPress={() => onRecordObservation(c)}
                  style={styles.nextAction}
                >
                  <Text style={styles.nextTitle}>{next.label} →</Text>
                  <Text style={styles.nextNote}>{next.note}</Text>
                </Pressable>
              ) : next.kind === "OPEN_CASE" ? (
                <Pressable
                  testID={`pli.r8.owner-history.next-open.${c.case_id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${next.label}。${next.note}`}
                  onPress={() => onOpenCase(c.case_id)}
                  style={styles.nextAction}
                >
                  <Text style={styles.nextTitle}>{next.label} →</Text>
                  <Text style={styles.nextNote}>{next.note}</Text>
                </Pressable>
              ) : (
                <View testID={`pli.r8.owner-history.next-none.${c.case_id}`} style={styles.nextStatic}>
                  <Text style={styles.nextTitle}>{next.label}</Text>
                  <Text style={styles.nextNote}>{next.note}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      {own.length > 2 ? (
        <Pressable
          testID="pli.r8.owner-history.more"
          accessibilityRole="button"
          onPress={() => setExpanded((prior) => !prior)}
          style={styles.action}
        >
          <Text style={styles.link}>{expanded ? "收起历史核对" : `展开其余 ${own.length - 2} 条核对`}</Text>
        </Pressable>
      ) : null}
      {onOpenHistory ? (
        <Pressable
          testID="pli.r8.owner-history.all"
          accessibilityRole="button"
          accessibilityLabel={`查看全部 ${own.length} 条生活观察档案`}
          onPress={onOpenHistory}
          style={styles.action}
        >
          <Text style={styles.link}>查看全部观察档案 →</Text>
        </Pressable>
      ) : null}
      <Pressable
        testID="pli.r8.owner-history.timeline"
        accessibilityRole="button"
        onPress={onOpenTimeline}
        style={styles.action}
      >
        <Text style={styles.link}>回看真实生活时间线</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginHorizontal: SPACE.s5, marginTop: SPACE.s6, gap: SPACE.s2 },
  eyebrow: { fontSize: TYPE.meta, fontWeight: "700", color: COLORS.brandPrimaryDeep },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  intro: { fontSize: TYPE.sm, lineHeight: 19, color: COLORS.textSecondary },
  entries: { gap: SPACE.s3, marginTop: SPACE.s2 },
  entry: { borderRadius: 17, backgroundColor: COLORS.stageWarmBase, padding: SPACE.s4, gap: SPACE.s3 },
  summary: { gap: SPACE.s2 },
  entryHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: SPACE.s2 },
  metric: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.textPrimary },
  status: { flexShrink: 1, fontSize: TYPE.sm, fontWeight: "600", color: COLORS.brandPrimaryDeep, textAlign: "right" },
  warn: { color: COLORS.danger },
  facts: { fontSize: TYPE.sm, color: COLORS.textPrimary },
  provenance: { fontSize: TYPE.caption, lineHeight: 18, color: COLORS.textSecondary },
  openDetail: { fontSize: TYPE.sm, fontWeight: "700", color: COLORS.brandPrimaryDeep },
  nextAction: {
    minHeight: 44, justifyContent: "center", gap: 2, paddingTop: SPACE.s2,
    borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle,
  },
  nextStatic: { gap: 2, paddingTop: SPACE.s2, borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  nextTitle: { fontSize: TYPE.sm, fontWeight: "700", color: COLORS.brandPrimaryDeep },
  nextNote: { fontSize: TYPE.caption, lineHeight: 18, color: COLORS.textSecondary },
  action: { minHeight: 44, alignSelf: "flex-start", justifyContent: "center" },
  link: { fontSize: TYPE.sm, fontWeight: "700", color: COLORS.brandPrimaryDeep },
});
