/**
 * Feedback surfaces (Stage R.2 §59-61): unified error / offline / retry /
 * partial / empty states. User language only — technical detail stays in logs.
 */
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, RADIUS, SPACE, TYPE } from "../../tokens";

/** Empty state with meaning + a concrete next action. */
export function EmptyState({
  icon = "leaf-outline",
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap} accessibilityLabel={`${title}，${body}`}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={COLORS.brandSecondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Inline error inside a page (user language, no raw codes). */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.inline} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={16} color={COLORS.textTertiary} />
      <Text style={styles.inlineText}>{message}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" accessibilityLabel="重试" onPress={onRetry} hitSlop={10}>
          <Text style={styles.retryLink}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Full-page error with a retry action. */
export function FullPageError({
  title = "暂时连接不上",
  body = "你的本地操作不会丢失",
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.full}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={32} color={COLORS.textTertiary} />
      </View>
      <Text style={styles.fullTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.action}>
          <Text style={styles.actionText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Slim offline banner pinned above content while requests fail. */
export function OfflineBanner({ visible, onRetry }: { visible: boolean; onRetry?: () => void }) {
  if (!visible) return null;
  return (
    <View style={styles.banner} accessibilityLiveRegion="polite">
      <Ionicons name="wifi-outline" size={14} color={COLORS.textInverse} />
      <Text style={styles.bannerText}>暂时连接不上 · 已保存的内容仍在</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" accessibilityLabel="重试" onPress={onRetry} hitSlop={10}>
          <Text style={styles.bannerRetry}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Retry state for partial sections. */
export function RetryState({ onRetry, label = "加载失败" }: { onRetry: () => void; label?: string }) {
  return (
    <View style={styles.retryWrap}>
      <Text style={styles.inlineText}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.smallAction}>
        <Text style={styles.actionText}>重新加载</Text>
      </Pressable>
    </View>
  );
}

/** Partial-data notice shown under an incomplete section. */
export function PartialDataState({ note = "部分内容暂不可用" }: { note?: string }) {
  return (
    <Text style={styles.partial} accessibilityLiveRegion="polite">
      {note}
    </Text>
  );
}

/** Static skeleton blocks (reduced-motion safe: no pulsing animation). */
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View accessibilityLabel="加载中">
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.skeletonRow} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingHorizontal: SPACE.s8, paddingVertical: SPACE.s10 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.brandSoftAmber,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: TYPE.bodyStrong, fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACE.s4, textAlign: "center" },
  body: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: SPACE.s2, textAlign: "center", lineHeight: 20 },
  action: {
    marginTop: SPACE.s4,
    backgroundColor: COLORS.brandPrimary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACE.s5,
    paddingVertical: 10,
  },
  actionText: { color: COLORS.textInverse, fontSize: TYPE.sm, fontWeight: "600" },
  smallAction: { marginTop: SPACE.s2, padding: SPACE.s2 },
  inline: { flexDirection: "row", alignItems: "center", gap: SPACE.s2, padding: SPACE.s3, marginHorizontal: SPACE.s4, marginTop: SPACE.s3 },
  inlineText: { fontSize: TYPE.sm, color: COLORS.textTertiary, flex: 1 },
  retryLink: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  full: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACE.s8 },
  fullTitle: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary, marginTop: SPACE.s4 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE.s2,
    backgroundColor: COLORS.surfaceDark,
    paddingHorizontal: SPACE.s4,
    paddingVertical: 8,
  },
  bannerText: { color: COLORS.textOnDark, fontSize: TYPE.sm, flex: 1 },
  bannerRetry: { color: COLORS.brandSoftAmber, fontSize: TYPE.sm, fontWeight: "600" },
  retryWrap: { alignItems: "center", padding: SPACE.s4 },
  partial: { fontSize: TYPE.caption, color: COLORS.textTertiary, textAlign: "center", paddingVertical: SPACE.s2 },
  skeletonRow: { height: 64, borderRadius: RADIUS.lg, backgroundColor: COLORS.brandSoft, marginBottom: SPACE.s3 },
});
