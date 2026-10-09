/**
 * LivingModeSwitcher — canonical Life View bottom bar: 此刻 / 趋势 / 时间线 / 外观.
 * Timeline remains the canonical event surface; this bar links to it rather
 * than duplicating historical content inside Life View. Segmented, ≥44dp targets,
 * reduced-motion safe (no animation). Modes only change panel content —
 * the pet stage stays the dominant visual.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACE, TYPE } from "../../tokens";

export type LivingMode = "now" | "trend" | "look";

const MODES: Array<{ id: LivingMode; label: string }> = [
  { id: "now", label: "此刻" },
  { id: "trend", label: "趋势" },
  { id: "look", label: "外观" },
];

interface Props {
  value: LivingMode;
  onChange: (m: LivingMode) => void;
  onTimeline: () => void;
}

export function LivingModeSwitcher({ value, onChange, onTimeline }: Props) {
  // "look" is the internal appearance-mode id; the machine-readable id uses
  // the canonical "appearance" key from the blind-UI contract.
  const idOf = (id: LivingMode) => (id === "look" ? "appearance" : id);
  return (
    <View accessibilityRole="tablist" testID={`pli.lifeview.mode.${idOf(value)}`} style={styles.bar}>
      {MODES.map((m) => {
        const active = m.id === value;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={m.label}
            testID={`pli.lifeview.mode.${idOf(m.id)}`}
            onPress={() => onChange(m.id)}
            style={[styles.item, active && styles.itemActive]}
          >
            <Text style={[styles.itemText, active && styles.itemTextActive]}>{m.label}</Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: false }}
        accessibilityLabel="时间线"
        testID="pli.lifeview.mode.timeline"
        onPress={onTimeline}
        style={styles.item}
      >
        <Text style={styles.itemText}>时间线</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    marginHorizontal: SPACE.s4,
    marginTop: SPACE.s4,
    backgroundColor: COLORS.surfaceRaised,
    borderRadius: RADIUS.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.dividerSubtle,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 999,
    minHeight: 44,
  },
  itemActive: { backgroundColor: COLORS.brandPrimary },
  itemText: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "600" },
  itemTextActive: { color: COLORS.textInverse },
});