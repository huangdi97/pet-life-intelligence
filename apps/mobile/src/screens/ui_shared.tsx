/** Shared screen primitives for the Stage H mobile screens (Card / Chip /
 *  Badge / buttons / titles / loading states). All styling values come from
 *  tokens.ts — colors are never hardcoded outside tokens.ts. */
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function ScreenTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={s.titleWrap}>
      <Text style={s.title}>{title}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.section}>{children}</Text>;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={s.cardTitle}>{children}</Text>;
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && s.chipActiveText]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={[s.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

/** PROTOTYPE tag — rendered on every prototype / feature-flagged control. */
export function ProtoTag() {
  return <Badge text="PROTOTYPE" color={COLORS.accent600} bg={COLORS.accent50} />;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.primaryBtn, disabled && s.btnDisabled, pressed && !disabled && s.btnPressed]}
    >
      <Text style={s.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, small }: { label: string; onPress: () => void; small?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.ghostBtn, small && s.ghostBtnSmall, pressed && s.btnPressed]}>
      <Text style={[s.ghostBtnText, small && s.ghostBtnTextSmall]}>{label}</Text>
    </Pressable>
  );
}

export function MutedText({ children }: { children: React.ReactNode }) {
  return <Text style={s.muted}>{children}</Text>;
}

export function EmptyText({ children }: { children: React.ReactNode }) {
  return <Text style={s.empty}>{children}</Text>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <Text style={s.error}>{children}</Text>;
}

export function Loading() {
  return <ActivityIndicator style={s.loading} color={COLORS.primary500} />;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.lineDefault,
    padding: SPACE.s4,
    marginVertical: SPACE.s2,
  },
  titleWrap: { marginTop: SPACE.s2, marginBottom: SPACE.s3 },
  title: { fontSize: TYPE.xxl, fontWeight: TYPE.weightBold, color: COLORS.inkPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.inkMuted, marginTop: SPACE.s1 },
  section: {
    fontSize: TYPE.md,
    fontWeight: TYPE.weightSemibold,
    color: COLORS.inkPrimary,
    marginTop: SPACE.s5,
    marginBottom: SPACE.s2,
  },
  cardTitle: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  chip: {
    paddingHorizontal: SPACE.s4,
    paddingVertical: SPACE.s2,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bgSurfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.lineDefault,
  },
  chipActive: { backgroundColor: COLORS.primary100, borderColor: COLORS.primary500 },
  chipText: { fontSize: TYPE.base, color: COLORS.inkMuted },
  chipActiveText: { color: COLORS.primary800, fontWeight: TYPE.weightSemibold },
  badge: {
    paddingHorizontal: SPACE.s2,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: TYPE.xs, fontWeight: TYPE.weightMedium },
  primaryBtn: {
    backgroundColor: COLORS.primary500,
    borderRadius: RADIUS.md,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s5,
    alignItems: "center",
    marginTop: SPACE.s3,
  },
  primaryBtnText: { color: COLORS.bgSurface, fontSize: TYPE.base, fontWeight: TYPE.weightSemibold },
  ghostBtn: {
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.lineStrong,
    borderRadius: RADIUS.md,
    paddingVertical: SPACE.s3,
    paddingHorizontal: SPACE.s5,
    alignItems: "center",
  },
  ghostBtnSmall: { paddingVertical: SPACE.s2, paddingHorizontal: SPACE.s3 },
  ghostBtnText: { color: COLORS.inkPrimary, fontSize: TYPE.base },
  ghostBtnTextSmall: { fontSize: TYPE.sm, color: COLORS.inkSecondary },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  muted: { fontSize: TYPE.sm, color: COLORS.inkMuted, marginTop: SPACE.s2 },
  empty: { fontSize: TYPE.base, color: COLORS.inkMuted, textAlign: "center", paddingVertical: SPACE.s6 },
  error: { fontSize: TYPE.base, color: COLORS.danger, marginVertical: SPACE.s2 },
  loading: { marginVertical: SPACE.s6 },
});
