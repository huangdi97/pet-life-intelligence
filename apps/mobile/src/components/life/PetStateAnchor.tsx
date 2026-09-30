/**
 * PetStateAnchor — a state chip anchored around the pet on the Living Stage
 * (R2-P3D §19/§46.8): label + value + optional personal-baseline delta.
 * Glass foreground layer; ≥48dp touch; values always real API facts. On the
 * warm-charcoal 3D stage the chip flips to dark glass so the pet stays the
 * visual center.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACE, TYPE } from "../../tokens";

export interface PetAnchor {
  id: string;
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Optional baseline comparison, e.g. "-18%". */
  delta?: string;
  onPress?: () => void;
  /** Machine-readable testID (blind-UI acceptance). */
  testID?: string;
}

export function PetStateAnchor({ anchor, dark = false }: { anchor: PetAnchor; dark?: boolean }) {
  const inner = (
    <>
      <View style={[styles.iconWrap, dark && styles.iconWrapDark]}>
        <Ionicons name={anchor.icon} size={14} color={dark ? COLORS.anchorIconDark : COLORS.brandPrimaryDeep} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.label, dark && styles.labelDark]}>{anchor.label}</Text>
        <Text style={[styles.value, dark && styles.valueDark]}>
          {anchor.value || "—"}
          {anchor.delta ? <Text style={styles.delta}> {anchor.delta}</Text> : null}
        </Text>
      </View>
    </>
  );
  if (anchor.onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${anchor.label} ${anchor.value || "—"}`}
        testID={anchor.testID}
        style={[styles.chip, dark && styles.chipDark]}
        onPress={anchor.onPress}
      >
        {inner}
      </Pressable>
    );
  }
  return <View testID={anchor.testID} style={[styles.chip, dark && styles.chipDark]}>{inner}</View>;
}


const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.s2,
    backgroundColor: COLORS.anchorGlass,
    borderWidth: 1,
    borderColor: COLORS.anchorGlassBorder,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s3,
    paddingVertical: 8,
    minHeight: 44,
    shadowColor: COLORS.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chipDark: {
    backgroundColor: COLORS.anchorGlassDark,
    borderColor: COLORS.anchorGlassBorderDark,
    shadowOpacity: 0.3,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.brandSoftGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapDark: { backgroundColor: COLORS.anchorIconBgDark },
  textWrap: { flexShrink: 1 },
  label: { fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 13 },
  labelDark: { color: COLORS.textOnStageSecondary },
  value: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary, lineHeight: 18 },
  valueDark: { color: COLORS.textOnStage },
  delta: { fontSize: TYPE.caption, color: COLORS.attention, fontWeight: "600" },
});