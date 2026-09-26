/**
 * AttentionPanel — the One Attention layer (Stage R.2 §24).
 * calm: no notable change (success tone). attention: one deterministic
 * hint (amber). danger: only for backend URGENT/EMERGENCY triage (red).
 * A screen renders at most ONE AttentionPanel.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACE, TYPE } from "../../tokens";

type AttentionKind = "calm" | "attention" | "danger";

interface AttentionPanelProps {
  kind: AttentionKind;
  title?: string;
  body: string;
  footer?: string;
  onPress?: () => void;
}

const TONE: Record<AttentionKind, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  calm: { bg: COLORS.successBg, fg: COLORS.success, icon: "checkmark-circle" },
  attention: { bg: COLORS.attentionBg, fg: COLORS.attention, icon: "alert-circle-outline" },
  danger: { bg: COLORS.dangerBg, fg: COLORS.danger, icon: "warning" },
};

export function AttentionPanel({ kind, title, body, footer, onPress }: AttentionPanelProps) {
  const tone = TONE[kind];
  const inner = (
    <>
      <View style={styles.iconWrap}>
        <Ionicons name={tone.icon} size={22} color={tone.fg} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: tone.fg }]}>{title ?? (kind === "danger" ? "需要关注" : kind === "attention" ? "值得关注" : "一切如常")}</Text>
        <Text style={styles.body}>{body}</Text>
        {footer ? <Text style={styles.footer}>{footer}</Text> : null}
      </View>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.panel, { backgroundColor: tone.bg }, pressed && styles.pressed]}
        onPress={onPress}
      >
        {inner}
      </Pressable>
    );
  }
  return (
    <View style={[styles.panel, { backgroundColor: tone.bg }]} accessibilityLabel={body}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE.s3,
    borderRadius: RADIUS.xl,
    padding: SPACE.s4,
    marginHorizontal: SPACE.s4,
    marginTop: SPACE.s3,
  },
  iconWrap: { paddingTop: 1 },
  textWrap: { flex: 1 },
  title: { fontSize: TYPE.bodyStrong, fontWeight: "700" },
  body: { fontSize: TYPE.body, color: COLORS.textPrimary, marginTop: 2 },
  footer: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: SPACE.s2 },
  pressed: { opacity: 0.9 },
});
