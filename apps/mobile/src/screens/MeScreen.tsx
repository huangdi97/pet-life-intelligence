/**
 * MeScreen — 我的 (Stage R.2 §58): Owner identity → Household → My Pets →
 * Notifications → Privacy & Data → App / About. 开发模式登录 moved into
 * Developer Settings, visible only on demo/internal builds.
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { usePets } from "../context";
import { breedLabel } from "../format";
import { api, devLogin, humanizeError } from "../api";
import { getDevUserId, getToken, setDevUserId, setToken } from "../storage/session";
import { COLORS, DEMO_ENV, RADIUS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { OpenSection } from "../components/feedback/OpenSection";
import { PetAvatar } from "../components/media/PetAvatar";
import { resolvePetMediaUri } from "../components/media/demoPetVisual";

type StackNav = NativeStackNavigationProp<StackParamList>;

const SHOW_DEVELOPER_SETTINGS = DEMO_ENV || __DEV__;

const FEEDBACK_CATEGORIES = [
  { key: "bug", label: "出错" },
  { key: "confusing", label: "看不懂" },
  { key: "missing", label: "缺少内容" },
  { key: "feature_request", label: "功能建议" },
  { key: "privacy", label: "隐私担忧" },
  { key: "other", label: "其他" },
] as const;

export function MeScreen() {
  const { pets, petId, choose, reload, reset } = usePets();
  const navigation = useNavigation<StackNav>();
  const [sessionKind, setSessionKind] = useState<"dev" | "token" | "none" | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const [email, setEmail] = useState("owner@pli.demo");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [feedbackCategory, setFeedbackCategory] = useState<(typeof FEEDBACK_CATEGORIES)[number]["key"]>("confusing");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const dev = await getDevUserId();
      const token = await getToken();
      if (!alive) return;
      setSessionKind(dev ? "dev" : token ? "token" : "none");
    })();
    return () => {
      alive = false;
    };
  }, []);

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;
  const hasSession = sessionKind === "dev" || sessionKind === "token";

  async function login() {
    const e = email.trim();
    if (!e || loginBusy) return;
    setLoginBusy(true);
    setLoginError(null);
    try {
      await devLogin(e);
      setSessionKind("dev");
      reload();
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "登录失败，请稍后重试。");
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    await setToken(null);
    await setDevUserId(null);
    setSessionKind("none");
    reset();
  }

  async function sendFeedback() {
    const message = feedbackMessage.trim();
    if (!message || feedbackBusy || !hasSession) return;
    setFeedbackBusy(true);
    setFeedbackStatus(null);
    try {
      await api.post("/pilot/feedback", {
        category: feedbackCategory,
        message,
        page_url: "mobile://me",
        pet_id: current?.id ?? null,
        client: "android",
        extra: { surface: "me" },
      });
      setFeedbackMessage("");
      setFeedbackStatus("反馈已提交，感谢你帮助我们改进。");
    } catch (error: unknown) {
      setFeedbackStatus(humanizeError(error));
    } finally {
      setFeedbackBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head} testID="pli.me.owner">
          <View style={styles.avatarWrap}>
            <PetAvatar pet={current} uri={resolvePetMediaUri(current)} size={64} />
          </View>
          <View style={styles.headText}>
            <Text style={styles.title}>我的</Text>
            <Text style={styles.sub}>{current ? `当前宠物：${current.name}` : "还没有选择宠物"}</Text>
          </View>
        </View>

        <OpenSection title="家庭" testID="pli.me.care-network">
          <Row label="当前宠物" value={current ? current.name : "未选择"} />
          <Row label="家庭" value={pets && pets.length > 0 ? "已加入" : "未加入"} />
          <Pressable accessibilityRole="button" style={[styles.linkRow, styles.rowDivider]} onPress={() => navigation.navigate("Care")}>
            <Ionicons name="people-outline" size={18} color={COLORS.brandPrimaryDeep} />
            <Text style={styles.linkText}>照护协作</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </Pressable>
        </OpenSection>

        <OpenSection title="我的宠物" testID="pli.me.pets">
          {(pets ?? []).map((p, i) => (
            <Pressable
              key={p.id}
              testID={`pli.me.pets.row.${p.id}`}
              accessibilityRole="button"
              onPress={() => void choose(p.id)}
              style={[styles.petRow, i > 0 && styles.rowDivider]}
            >
              <PetAvatar pet={p} uri={resolvePetMediaUri(p)} size={36} />
              <Text style={styles.petName}>{p.name}</Text>
              <Text style={styles.petMeta}>{breedLabel(p.breed) || "宠物"}</Text>
            </Pressable>
          ))}
        </OpenSection>

        <OpenSection title="通知与设备">
          <Pressable testID="pli.me.notifications" accessibilityRole="button" style={styles.linkRow} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={18} color={COLORS.brandPrimaryDeep} />
            <Text style={styles.linkText}>通知</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </Pressable>
          <Pressable accessibilityRole="button" style={[styles.linkRow, styles.rowDivider]} onPress={() => navigation.navigate("Monitoring")}>
            <Ionicons name="hardware-chip-outline" size={18} color={COLORS.brandPrimaryDeep} />
            <Text style={styles.linkText}>在家与设备</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </Pressable>
        </OpenSection>

        <OpenSection title="隐私与数据" testID="pli.me.privacy">
          <Row label="隐私" value="仅向你展示必要信息" />
          <View testID="pli.me.data"><Row label="数据" value="由你记录，可随时导出" /></View>
        </OpenSection>

        <OpenSection title="试点反馈" testID="pli.me.feedback">
          <Text style={styles.feedbackLead}>告诉我们哪里出错、难懂或缺少内容；请不要填写病历全文或联系方式。</Text>
          <View style={styles.feedbackChips} accessibilityLabel="反馈类别">
            {FEEDBACK_CATEGORIES.map((category) => {
              const selected = feedbackCategory === category.key;
              return (
                <Pressable
                  key={category.key}
                  testID={`pli.me.feedback.category.${category.key}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setFeedbackCategory(category.key)}
                  style={[styles.feedbackChip, selected && styles.feedbackChipSelected]}
                >
                  <Text style={[styles.feedbackChipText, selected && styles.feedbackChipTextSelected]}>{category.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            testID="pli.me.feedback.message"
            style={[styles.input, styles.feedbackInput]}
            value={feedbackMessage}
            onChangeText={setFeedbackMessage}
            multiline
            maxLength={4000}
            textAlignVertical="top"
            placeholder="描述你遇到的问题或建议"
            placeholderTextColor={COLORS.textTertiary}
          />
          <Pressable
            testID="pli.me.feedback.submit"
            accessibilityRole="button"
            accessibilityLabel={hasSession ? "提交试点反馈" : "登录后可提交试点反馈"}
            accessibilityState={{ disabled: feedbackBusy || !feedbackMessage.trim() || !hasSession }}
            disabled={feedbackBusy || !feedbackMessage.trim() || !hasSession}
            onPress={() => void sendFeedback()}
            style={[styles.feedbackSubmit, (feedbackBusy || !feedbackMessage.trim() || !hasSession) && styles.controlDisabled]}
          >
            <Text style={styles.feedbackSubmitText}>{feedbackBusy ? "提交中…" : hasSession ? "提交反馈" : "登录后可提交"}</Text>
          </Pressable>
          {feedbackStatus ? <Text style={styles.feedbackStatus} accessibilityLiveRegion="polite">{feedbackStatus}</Text> : null}
        </OpenSection>

        <OpenSection title="应用" testID="pli.me.help">
          <Row label="版本" value="预览构建" />
          <Row label="关于" value="Pet Life Intelligence" />
        </OpenSection>

        {SHOW_DEVELOPER_SETTINGS ? (
          <OpenSection title="开发者设置" testID="pli.me.settings">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={devOpen ? "收起演示环境登录" : "展开演示环境登录"}
              accessibilityState={{ expanded: devOpen }}
              style={styles.linkRow}
              onPress={() => setDevOpen((v) => !v)}
            >
              <Ionicons name="bug-outline" size={18} color={COLORS.textTertiary} />
              <Text style={styles.linkText}>演示环境登录</Text>
              <Ionicons name={devOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textTertiary} />
            </Pressable>
            {devOpen ? (
              <View style={styles.devForm}>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="demo 邮箱" placeholderTextColor={COLORS.textTertiary} />
                <Pressable accessibilityRole="button" accessibilityLabel="登录" accessibilityState={{ disabled: loginBusy }} onPress={() => void login()} disabled={loginBusy} style={[styles.devLoginBtn, loginBusy && styles.controlDisabled]}>
                  <Text style={styles.devLoginText}>{loginBusy ? "登录中…" : "登录"}</Text>
                </Pressable>
                {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}
                <Text style={styles.devNote}>仅演示与内部构建可见 · 生产构建无此入口</Text>
              </View>
            ) : null}
          </OpenSection>
        ) : null}

        {hasSession ? (
          <Pressable accessibilityRole="button" accessibilityLabel="退出登录" onPress={() => void logout()} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>退出登录</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  head: { flexDirection: "row", alignItems: "center", gap: SPACE.s3, paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  avatarWrap: { width: 64, height: 64 },
  headText: { flex: 1 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 2 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  rowLabel: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "500" },
  rowValue: { fontSize: TYPE.sm, color: COLORS.textTertiary },
  petRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s3, paddingVertical: 8 },
  petName: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "600" },
  petMeta: { fontSize: TYPE.meta, color: COLORS.textTertiary, marginLeft: "auto" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: SPACE.s3, paddingVertical: 12 },
  linkText: { fontSize: TYPE.body, color: COLORS.textPrimary, flex: 1 },
  devForm: { marginTop: SPACE.s2, gap: SPACE.s2 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.dividerStrong,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACE.s3,
    paddingVertical: SPACE.s2,
    fontSize: TYPE.body,
    color: COLORS.textPrimary,
  },
  devLoginBtn: { minHeight: 48, justifyContent: "center", backgroundColor: COLORS.brandPrimary, borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  devLoginText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  devNote: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  errorText: { fontSize: TYPE.sm, color: COLORS.danger },
  feedbackLead: { fontSize: TYPE.sm, color: COLORS.textTertiary, lineHeight: 20 },
  feedbackChips: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginTop: SPACE.s3 },
  feedbackChip: { minHeight: 44, justifyContent: "center", paddingHorizontal: SPACE.s3, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceRaised, borderWidth: 1, borderColor: COLORS.dividerSubtle },
  feedbackChipSelected: { backgroundColor: COLORS.brandSoftGreen, borderColor: COLORS.brandPrimary },
  feedbackChipText: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  feedbackChipTextSelected: { color: COLORS.brandPrimaryDeep, fontWeight: "600" },
  feedbackInput: { minHeight: 88, marginTop: SPACE.s3 },
  feedbackSubmit: { minHeight: 48, justifyContent: "center", alignItems: "center", marginTop: SPACE.s3, borderRadius: RADIUS.pill, backgroundColor: COLORS.brandPrimary },
  feedbackSubmitText: { fontSize: TYPE.button, color: COLORS.textInverse, fontWeight: "600" },
  feedbackStatus: { marginTop: SPACE.s2, fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  logoutBtn: { minHeight: 48, justifyContent: "center", marginHorizontal: SPACE.s4, marginTop: SPACE.s5, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: COLORS.dividerStrong, alignItems: "center" },
  controlDisabled: { opacity: 0.5 },
  logoutText: { fontSize: TYPE.button, color: COLORS.textSecondary, fontWeight: "600" },
});
