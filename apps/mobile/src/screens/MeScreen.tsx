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
import { devLogin } from "../api";
import { getDevUserId, getToken, setDevUserId, setToken } from "../storage/session";
import { COLORS, DEMO_ENV, RADIUS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { OpenSection } from "../components/feedback/OpenSection";
import { PetAvatar } from "../components/media/PetAvatar";
import { resolvePetMediaUri } from "../components/media/demoPetVisual";

type StackNav = NativeStackNavigationProp<StackParamList>;

const SHOW_DEVELOPER_SETTINGS = DEMO_ENV || __DEV__;

export function MeScreen() {
  const { pets, petId, reload, reset } = usePets();
  const navigation = useNavigation<StackNav>();
  const [sessionKind, setSessionKind] = useState<"dev" | "token" | "none" | null>(null);
  const [devOpen, setDevOpen] = useState(false);
  const [email, setEmail] = useState("owner@pli.demo");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <View style={styles.avatarWrap}>
            <PetAvatar pet={current} uri={resolvePetMediaUri(current)} size={64} />
          </View>
          <View style={styles.headText}>
            <Text style={styles.title}>我的</Text>
            <Text style={styles.sub}>{current ? `当前宠物：${current.name}` : "还没有选择宠物"}</Text>
          </View>
        </View>

        <OpenSection title="家庭">
          <Row label="当前宠物" value={current ? current.name : "未选择"} />
          <Row label="家庭" value={pets && pets.length > 0 ? "已加入" : "未加入"} />
          <Row label="会话" value={sessionKind === "dev" ? "开发模式" : sessionKind === "token" ? "已登录" : "未登录"} />
        </OpenSection>

        <OpenSection title="我的宠物">
          {(pets ?? []).map((p, i) => (
            <View key={p.id} style={[styles.petRow, i > 0 && styles.rowDivider]}>
              <PetAvatar pet={p} uri={resolvePetMediaUri(p)} size={36} />
              <Text style={styles.petName}>{p.name}</Text>
              <Text style={styles.petMeta}>{p.breed || "宠物"}</Text>
            </View>
          ))}
        </OpenSection>

        <OpenSection title="常用">
          <Pressable accessibilityRole="button" style={styles.linkRow} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={18} color={COLORS.brandPrimaryDeep} />
            <Text style={styles.linkText}>通知</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </Pressable>
          <Pressable accessibilityRole="button" style={[styles.linkRow, styles.rowDivider]} onPress={() => navigation.navigate("Health")}>
            <Ionicons name="medkit-outline" size={18} color={COLORS.brandPrimaryDeep} />
            <Text style={styles.linkText}>健康</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </Pressable>
          <Pressable accessibilityRole="button" style={[styles.linkRow, styles.rowDivider]} onPress={() => navigation.navigate("LifeView")}>
            <Ionicons name="planet-outline" size={18} color={COLORS.brandPrimaryDeep} />
            <Text style={styles.linkText}>生命视图</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </Pressable>
        </OpenSection>

        <OpenSection title="隐私与数据">
          <Row label="隐私" value="仅向你展示必要信息" />
          <Row label="数据" value="由你记录，可随时导出" />
        </OpenSection>

        <OpenSection title="应用">
          <Row label="版本" value="v0.2.0 · Internal / Pre-Pilot" />
          <Row label="关于" value="Pet Life Intelligence" />
        </OpenSection>

        {SHOW_DEVELOPER_SETTINGS ? (
          <OpenSection title="开发者设置">
            <Pressable
              accessibilityRole="button"
              style={styles.linkRow}
              onPress={() => setDevOpen((v) => !v)}
            >
              <Ionicons name="bug-outline" size={18} color={COLORS.textTertiary} />
              <Text style={styles.linkText}>开发模式登录</Text>
              <Ionicons name={devOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.textTertiary} />
            </Pressable>
            {devOpen ? (
              <View style={styles.devForm}>
                <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="demo 邮箱" placeholderTextColor={COLORS.textTertiary} />
                <Pressable accessibilityRole="button" accessibilityLabel="登录" onPress={() => void login()} disabled={loginBusy} style={styles.devLoginBtn}>
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
  devLoginBtn: { backgroundColor: COLORS.brandPrimary, borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  devLoginText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  devNote: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  errorText: { fontSize: TYPE.sm, color: COLORS.danger },
  logoutBtn: { marginHorizontal: SPACE.s4, marginTop: SPACE.s5, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: COLORS.dividerStrong, alignItems: "center" },
  logoutText: { fontSize: TYPE.button, color: COLORS.textSecondary, fontWeight: "600" },
});
