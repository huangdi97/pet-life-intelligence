/**
 * PetStateAnchor — a state chip anchored around the pet on the Living Stage
 * (R2-P3D §19/§46.8): label + value + optional personal-baseline delta.
 * Glass foreground layer; interactive anchors expose a ≥44dp touch target;
 * values always come from real API facts. Read-only anchors may stay visually
 * compact so the pet remains the visual center.
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
        style={[styles.chip, styles.chipInteractive, dark && styles.chipDark]}
        onPress={anchor.onPress}
      >
        {inner}
      </Pressable>
    );
  }
  return <View testID={anchor.testID} style={[styles.chip, dark && styles.chipDark]}>{inner}</View>;
}


const styles = StyleSheet.create({
  chip: { flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: "transparent", borderWidth: 0, borderRadius: RADIUS.md, paddingHorizontal: 3, paddingVertical: 5, minHeight: 58 },
  chipInteractive: { minHeight: 44 },
  chipDark: {
    backgroundColor: COLORS.anchorGlassDark,
    borderColor: COLORS.anchorGlassBorderDark,
    shadowOpacity: 0.3,
  },
  iconWrap: { display: "none" },
  iconWrapDark: { backgroundColor: COLORS.anchorIconBgDark },
  textWrap: { minWidth: 0, alignItems: "center" },
  label: { fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 15 },
  labelDark: { color: COLORS.textOnStageSecondary },
  value: { fontSize: TYPE.sm, fontWeight: "700", color: COLORS.textPrimary, lineHeight: 18, textAlign: "center" },
  valueDark: { color: COLORS.textOnStage },
  delta: { fontSize: TYPE.caption, color: COLORS.attention, fontWeight: "600" },
});