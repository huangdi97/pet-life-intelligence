/**
 * ChangeNarrative — the "与它自己相比" baseline line + [为什么] explain entry
 * (R2-P §16 / v3.4 §46.6). One calm sentence driven by real API facts; the Why
 * entry routes to Explain-space (Timeline evidence in P0).
 */
import React from "react";
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
  if (!summary) return null;
  return (
    <View style={[styles.block, compact && styles.blockCompact]}>
      <View style={styles.summaryRow}>
        <Text style={[styles.summary, compact && styles.summaryCompact]}>{summary}</Text>
        {onWhy && compact ? (
          <Pressable accessibilityRole="button" accessibilityLabel="为什么" style={styles.whyCompact} onPress={onWhy}>
            <Text style={styles.whyText}>为什么</Text>
          </Pressable>
        ) : null}
      </View>
      {evidenceHint ? <Text style={[styles.evidence, compact && styles.evidenceCompact]}>{evidenceHint}</Text> : null}
      {onWhy && !compact ? (
        <Pressable accessibilityRole="button" accessibilityLabel="为什么" style={styles.why} onPress={onWhy}>
          <Text style={styles.whyText}>为什么</Text>
        </Pressable>
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
});