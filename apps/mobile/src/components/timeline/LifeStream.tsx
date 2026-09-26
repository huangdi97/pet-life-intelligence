/**
 * LifeStream — Timeline as a life stream (§37-39): day groups with a time
 * spine, semantic event rows (icon + copy + source + optional media + outcome).
 * No per-event white Cards.
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Pet } from "../../services/types";
import { COLORS, SPACE, TYPE } from "../../tokens";
import { PetMedia } from "../media/PetMedia";
import { OpenSection } from "../feedback/OpenSection";

export interface LifeStreamRow {
  id: string;
  time: string;
  typeLabel: string;
  meta?: string;
  sourceLabel?: string;
  outcome?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  mediaUri?: string | null;
  mediaPet?: Pet | null;
}

export interface LifeStreamDay {
  id: string;
  label: string;
  isToday?: boolean;
  rows: LifeStreamRow[];
}

export function LifeStream({ days }: { days: LifeStreamDay[] }) {
  return (
    <View>
      {days.map((day) => (
        <View key={day.id}>
          <View style={styles.dayHead}>
            <Text style={styles.dayLabel}>{day.label}</Text>
            {day.isToday ? (
              <View style={styles.todayChip}>
                <Text style={styles.todayChipText}>今天</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.spine}>
            {day.rows.map((row) => (
              <LifeStreamEvent key={row.id} row={row} last={row.id === day.rows[day.rows.length - 1].id} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function LifeStreamEvent({ row, last }: { row: LifeStreamRow; last: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        <Text style={styles.time}>{row.time}</Text>
      </View>
      <View style={styles.nodeCol}>
        <View style={styles.node} />
        {!last ? <View style={styles.line} /> : null}
      </View>
      <View style={styles.content}>
        <View style={styles.contentHead}>
          <Ionicons name={row.icon} size={15} color={COLORS.brandPrimaryDeep} />
          <Text style={styles.type}>{row.typeLabel}</Text>
          {row.sourceLabel ? (
            <View style={styles.sourceChip}>
              <Text style={styles.sourceText}>{row.sourceLabel}</Text>
            </View>
          ) : null}
        </View>
        {row.meta ? <Text style={styles.meta}>{row.meta}</Text> : null}
        {row.outcome ? <Text style={styles.outcome}>{row.outcome}</Text> : null}
        {row.mediaUri ? (
          <View style={styles.thumb}>
            <PetMedia pet={row.mediaPet ?? null} uri={row.mediaUri} variant="timeline" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dayHead: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, paddingHorizontal: SPACE.s4, paddingTop: SPACE.s5, paddingBottom: SPACE.s2 },
  dayLabel: { fontSize: TYPE.section, fontWeight: "600", color: COLORS.textPrimary },
  todayChip: { backgroundColor: COLORS.brandSoftGreen, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  todayChipText: { fontSize: TYPE.caption, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  spine: { paddingHorizontal: SPACE.s4 },
  row: { flexDirection: "row", minHeight: 58 },
  timeCol: { width: 56, paddingTop: 2 },
  time: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  nodeCol: { width: 22, alignItems: "center" },
  node: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.brandPrimary, marginTop: 5 },
  line: { width: 1, flex: 1, backgroundColor: COLORS.dividerSubtle, marginTop: 2 },
  content: { flex: 1, paddingBottom: SPACE.s4, paddingLeft: SPACE.s2 },
  contentHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  type: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary },
  sourceChip: { backgroundColor: COLORS.brandSoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 2 },
  sourceText: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  meta: { fontSize: TYPE.sm, color: COLORS.textSecondary, marginTop: 2 },
  outcome: { fontSize: TYPE.caption, color: COLORS.success, marginTop: 2 },
  thumb: { marginTop: SPACE.s2, width: 64 },
});
