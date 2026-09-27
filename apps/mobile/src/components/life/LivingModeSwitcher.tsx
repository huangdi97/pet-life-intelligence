/**
 * LivingModeSwitcher — Life View bottom mode bar: 此刻 (default) / 趋势 /
 * 时间线 / 外观 (v3.4 §34.3, R2-P §20). Segmented, ≥48dp targets,
 * reduced-motion safe (no animation). Modes only change panel content —
 * the pet stage stays the dominant visual.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACE, TYPE } from "../../tokens";

export type LivingMode = "now" | "trend" | "timeline" | "look";

const MODES: Array<{ id: LivingMode; label: string }> = [
  { id: "now", label: "此刻" },
  { id: "trend", label: "趋势" },
  { id: "timeline", label: "时间线" },
  { id: "look", label: "外观" },
];

interface Props {
  value: LivingMode;
  onChange: (m: LivingMode) => void;
}

export function LivingModeSwitcher({ value, onChange }: Props) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {MODES.map((m) => {
        const active = m.id === value;
        return (
          <Pressable
            key={m.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={m.label}
            onPress={() => onChange(m.id)}
            style={[styles.item, active && styles.itemActive]}
          >
            <Text style={[styles.itemText, active && styles.itemTextActive]}>{m.label}</Text>
          </Pressable>
        );
      })}
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