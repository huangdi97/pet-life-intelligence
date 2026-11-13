/**
 * QuickAction — the Action layer (§25): one primary CTA + a small set of
 * secondary contextual actions. Not a navigation replacement row.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACE, TYPE } from "../../tokens";

export function PrimaryAction({
  label,
  icon = "add-circle-outline",
  onPress,
  disabled,
  testID,
  compact = false,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  /** Machine-readable testID (blind-UI acceptance). */
  testID?: string;
  /** Same primary hierarchy with reduced vertical chrome for Today first fold. */
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, compact && styles.primaryCompact, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <Ionicons name={icon} size={20} color={COLORS.textInverse} />
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={16} color={COLORS.brandPrimaryDeep} />
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function ActionRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.s2,
    backgroundColor: COLORS.brandPrimary,
    borderRadius: RADIUS.pill,
    minHeight: 52,
    paddingVertical: 14,
    marginHorizontal: SPACE.s4,
    marginTop: SPACE.s4,
    shadowColor: COLORS.brandPrimaryDark,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primaryCompact: { minHeight: 44, paddingVertical: 10, marginTop: SPACE.s2, shadowOpacity: 0.08, elevation: 1 },
  primaryText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surfaceGlass,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.dividerSubtle,
    paddingHorizontal: SPACE.s4,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
  },
  secondaryText: { color: COLORS.brandPrimaryDeep, fontSize: TYPE.sm, fontWeight: "600" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginHorizontal: SPACE.s4, marginTop: SPACE.s3 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
