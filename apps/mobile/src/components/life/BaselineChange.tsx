/**
 * BaselineChange — the Change layer of Today (§23): how today compares with
 * the pet's own recent baseline, always traceable to evidence. When the
 * baseline is insufficient it renders "数据还不足以比较" instead of guessing.
 */
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACE, TYPE } from "../../tokens";
import { OpenSection } from "../feedback/OpenSection";

export type DeltaDirection = "down" | "up" | "flat" | "insufficient";

interface BaselineChangeProps {
  title?: string;
  summary: string;
  direction?: DeltaDirection;
  evidenceHint?: string;
  onViewEvidence?: () => void;
}

export function BaselineChange({
  title = "与它自己相比",
  summary,
  direction = "insufficient",
  evidenceHint,
  onViewEvidence,
}: BaselineChangeProps) {
  const tone =
    direction === "down"
      ? { fg: COLORS.attention, icon: "arrow-down-circle-outline" as const }
      : direction === "up"
        ? { fg: COLORS.success, icon: "arrow-up-circle-outline" as const }
        : direction === "flat"
          ? { fg: COLORS.textTertiary, icon: "remove-circle-outline" as const }
          : { fg: COLORS.textTertiary, icon: "information-circle-outline" as const };

  return (
    <OpenSection title={title}>
      <View style={styles.row}>
        <Ionicons name={tone.icon} size={20} color={tone.fg} />
        <Text style={[styles.summary, direction === "insufficient" && styles.insufficient]}>{summary}</Text>
      </View>
      {evidenceHint ? <Text style={styles.hint}>{evidenceHint}</Text> : null}
      {onViewEvidence ? (
        <Text accessibilityRole="button" style={styles.link} onPress={onViewEvidence}>
          为什么 · 查看依据 · 来源
        </Text>
      ) : null}
    </OpenSection>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, marginTop: SPACE.s1 },
  summary: { fontSize: TYPE.body, fontWeight: "600", color: COLORS.textPrimary, flex: 1 },
  insufficient: { fontWeight: "400", color: COLORS.textTertiary },
  hint: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: SPACE.s2 },
  link: { fontSize: TYPE.caption, color: COLORS.brandPrimaryDeep, fontWeight: "600", marginTop: SPACE.s2 },
});
