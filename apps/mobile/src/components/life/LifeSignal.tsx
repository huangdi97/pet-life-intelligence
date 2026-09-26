/**
 * LifeSignal — the "Now" layer of Today (Stage R.2): a compact current-life
 * summary (进食/饮水/活动...) derived from real API events. Never invents
 * values: when the API has no data it renders "今天还没有足够记录".
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, SPACE, TYPE } from "../../tokens";
import { OpenSection } from "../feedback/OpenSection";

export interface LifeSignalRow {
  id: string;
  label: string;
  value: string;
}

interface LifeSignalProps {
  title?: string;
  rows: LifeSignalRow[];
  empty?: boolean;
  emptyNote?: string;
}

export function LifeSignal({ title = "此刻", rows, empty = false, emptyNote }: LifeSignalProps) {
  if (empty) {
    return (
      <OpenSection title={title}>
        <Text style={styles.emptyNote}>{emptyNote ?? "今天还没有足够记录"}</Text>
      </OpenSection>
    );
  }
  return (
    <OpenSection title={title}>
      <View style={styles.rowWrap}>
        {rows.map((r, i) => (
          <View key={r.id} style={[styles.metric, i > 0 && styles.metricDivider]}>
            <Text style={styles.value}>{r.value}</Text>
            <Text style={styles.label}>{r.label}</Text>
          </View>
        ))}
      </View>
    </OpenSection>
  );
}

const styles = StyleSheet.create({
  rowWrap: { flexDirection: "row", marginTop: SPACE.s2 },
  metric: { flex: 1, paddingHorizontal: SPACE.s3 },
  metricDivider: { borderLeftWidth: 1, borderLeftColor: COLORS.dividerSubtle },
  value: { fontSize: TYPE.metric, fontWeight: "700", color: COLORS.textPrimary },
  label: { fontSize: TYPE.meta, color: COLORS.textTertiary, marginTop: 2 },
  emptyNote: { fontSize: TYPE.body, color: COLORS.textTertiary, marginTop: SPACE.s2 },
});
