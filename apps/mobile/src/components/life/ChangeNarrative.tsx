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
}

export function ChangeNarrative({ summary, evidenceHint, onWhy }: Props) {
  if (!summary) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.summary}>{summary}</Text>
      {evidenceHint ? <Text style={styles.evidence}>{evidenceHint}</Text> : null}
      {onWhy ? (
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
  summary: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary },
  evidence: { fontSize: TYPE.meta, color: COLORS.textTertiary, marginTop: 2 },
  why: {
    alignSelf: "flex-start",
    marginTop: SPACE.s2,
    backgroundColor: COLORS.brandSoftGreen,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  whyText: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
});