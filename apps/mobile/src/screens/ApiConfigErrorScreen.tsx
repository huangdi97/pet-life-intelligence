/** Fail-safe screen — Stage R.1: a build that was shipped without a valid
 *  injected API URL must explain itself instead of showing infinite loading.
 *  Renders instead of the whole app while getApiConfigIssue() != null. */
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { COLORS, TYPE } from "../tokens";
import { API_URL_ENV, describeApiConfigIssue, type ApiConfigIssue } from "../apiConfig";

export function ApiConfigErrorScreen({
  issue,
  onRetry,
}: {
  issue: ApiConfigIssue;
  onRetry: () => void;
}): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>环境配置</Text>
        </View>
        <Text style={styles.title}>无法连接服务</Text>
        <Text style={styles.desc}>{describeApiConfigIssue(issue)}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>查找方式</Text>
          <Text style={styles.mono}>构建时注入：{API_URL_ENV}=http://&lt;局域网IP&gt;:8800</Text>
          <Text style={styles.mono}>例如：http://192.168.0.103:8800</Text>
        </View>

        <Text style={styles.hint}>
          当前为内部测试构建，未包含服务地址。请使用带 API 地址的构建包，或在开发模式通过环境变量启动。
        </Text>

        <View
          style={styles.button}
          onStartShouldSetResponder={() => true}
          onResponderRelease={onRetry}
          accessibilityRole="button"
          accessibilityLabel="重新检查环境配置"
        >
          <Text style={styles.buttonText}>重新检查</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bgCanvas },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.noticeBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: { color: COLORS.notice, fontSize: TYPE.sm, fontWeight: TYPE.weightSemibold },
  title: { color: COLORS.inkPrimary, fontSize: TYPE.xxxl, fontWeight: TYPE.weightBold, marginBottom: 12 },
  desc: { color: COLORS.inkSecondary, fontSize: TYPE.base, lineHeight: 22, marginBottom: 24 },
  card: {
    backgroundColor: COLORS.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lineDefault,
    padding: 16,
    marginBottom: 20,
  },
  cardLabel: {
    color: COLORS.inkMuted,
    fontSize: TYPE.xs,
    fontWeight: TYPE.weightMedium,
    marginBottom: 8,
  },
  mono: {
    color: COLORS.inkPrimary,
    fontSize: TYPE.sm,
    fontWeight: TYPE.weightMedium,
    marginBottom: 6,
  },
  hint: { color: COLORS.inkMuted, fontSize: TYPE.sm, lineHeight: 20, marginBottom: 28 },
  button: {
    backgroundColor: COLORS.primary600,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#FFFFFF", fontSize: TYPE.md, fontWeight: TYPE.weightSemibold },
});