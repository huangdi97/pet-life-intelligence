/**
 * ChangeNarrative — the "与它自己相比" baseline line + [为什么] explain entry
 * (R2-P §16 / v3.4 §46.6). One calm sentence driven by real API facts; the Why
 * entry routes to Explain-space (Timeline evidence in P0).
 */
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACE, TYPE } from "../../tokens";

interface Props {
  summary?: string;
  /** Evidence hint text (real rule label) shown as secondary. */
  evidenceHint?: string;
  onWhy?: () => void;
  /** Today first-fold variant: same facts, less card chrome and vertical space. */
  compact?: boolean;
}

export function ChangeNarrative({ summary, evidenceHint, onWhy, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (!summary) return null;
  const openWhy = () => {
    if (onWhy) onWhy();
    else setExpanded((value) => !value);
  };
  return (
    <View style={[styles.block, compact && styles.blockCompact]}>
      <View style={styles.summaryRow}>
        <Text style={[styles.summary, compact && styles.summaryCompact]}>{summary}</Text>
        {(onWhy || evidenceHint) && compact ? (
          <Pressable accessibilityRole="button" accessibilityLabel="为什么" accessibilityState={{ expanded }} style={styles.whyCompact} onPress={openWhy}>
            <Text style={styles.whyText}>为什么</Text>
          </Pressable>
        ) : null}
      </View>
      {evidenceHint ? <Text style={[styles.evidence, compact && styles.evidenceCompact]}>{evidenceHint}</Text> : null}
      {(onWhy || evidenceHint) && !compact ? (
        <Pressable accessibilityRole="button" accessibilityLabel="为什么" accessibilityState={{ expanded }} style={styles.why} onPress={openWhy}>
          <Text style={styles.whyText}>为什么</Text>
        </Pressable>
      ) : null}
      {!onWhy && expanded ? (
        <View testID="pli.today.change.explain" style={styles.explain}>
          <Text style={styles.explainTitle}>为什么会这样</Text>
          <Text style={styles.explainLabel}>事实</Text>
          <Text style={styles.explainBody}>{summary}</Text>
          <Text style={styles.explainLabel}>比较依据</Text>
          <Text style={styles.explainBody}>{evidenceHint ?? "只比较已经记录的事实。"}</Text>
          <Text style={styles.explainLabel}>不确定性</Text>
          <Text style={styles.explainBody}>这里只说明与它自己的已记录常态的差异，不能据此判断疾病、疼痛或情绪。</Text>
          <Text style={styles.explainLabel}>下一步</Text>
          <Text style={styles.explainBody}>继续记录饮水、进食、活动和睡眠；如果变化持续或出现明确健康信号，再进入健康页查看。</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginHorizontal: SPACE.s4,
    marginTop: SPACE.s3,
    paddingHorizontal: SPACE.s4,
    paddingVertical: SPACE.s3,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: RADIUS.xl,
  },
  blockCompact: {
    marginTop: SPACE.s2,
    paddingHorizontal: SPACE.s4,
    paddingVertical: 9,
    borderRadius: RADIUS.lg,
    backgroundColor: "transparent",
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s2 },
  summary: { flex: 1, fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary },
  summaryCompact: { fontSize: TYPE.sm, lineHeight: 19 },
  evidence: { fontSize: TYPE.meta, color: COLORS.textTertiary, marginTop: 2 },
  evidenceCompact: { marginTop: 1, lineHeight: 16 },
  why: {
    alignSelf: "flex-start",
    marginTop: SPACE.s2,
    backgroundColor: COLORS.brandSoftGreen,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  whyCompact: { minHeight: 32, justifyContent: "center", paddingHorizontal: 8 },
  whyText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  explain: { marginTop: SPACE.s2, paddingTop: SPACE.s2, borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  explainTitle: { fontSize: TYPE.bodyStrong, color: COLORS.textPrimary, fontWeight: "700", marginBottom: SPACE.s1 },
  explainLabel: { marginTop: 6, fontSize: TYPE.caption, color: COLORS.brandPrimaryDeep, fontWeight: "700" },
  explainBody: { marginTop: 2, fontSize: TYPE.sm, lineHeight: 19, color: COLORS.textSecondary },
});