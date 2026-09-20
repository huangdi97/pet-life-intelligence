/** MeScreen — 我的: household/session info from the current-pet context,
 *  links (通知/健康), settings placeholders (隐私/数据), logout when a
 *  session exists. */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { usePets } from "../context";
import { getDevUserId, getToken, setDevUserId, setToken } from "../storage/session";
import { COLORS, SPACE, TYPE } from "../tokens";
import type { StackParamList } from "../navigation";
import { Card, CardTitle, GhostButton, MutedText, PrimaryButton, ScreenTitle } from "./ui";

type StackNav = NativeStackNavigationProp<StackParamList>;

type SessionKind = "dev" | "token" | "none" | null;

export function MeScreen() {
  const { pets, petId } = usePets();
  const navigation = useNavigation<StackNav>();
  const [sessionKind, setSessionKind] = useState<SessionKind>(null);

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

  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const householdId = pets && pets.length > 0 ? pets[0].household_id : null;
  const hasSession = sessionKind === "dev" || sessionKind === "token";

  async function logout() {
    await setToken(null);
    await setDevUserId(null);
    setSessionKind("none");
  }

  return (
    <SafeAreaView style={styles.page} edges={["top"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle title="我的" sub="账号、隐私与设置" />

        <Card>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>当前宠物</Text>
            <Text style={styles.rowValue}>{current ? current.name : "未选择"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>家庭</Text>
            <Text style={styles.rowValue}>{householdId ? "已加入" : "未加入"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>会话</Text>
            <Text style={styles.rowValue}>
              {sessionKind === "dev" ? "开发模式登录" : sessionKind === "token" ? "已登录" : "未登录"}
            </Text>
          </View>
        </Card>

        <Card>
          <CardTitle>快捷入口</CardTitle>
          <View style={styles.linksRow}>
            <GhostButton label="通知" onPress={() => navigation.navigate("Notifications")} />
            <GhostButton label="健康" onPress={() => navigation.navigate("Health")} />
          </View>
        </Card>

        <Card>
          <CardTitle>设置</CardTitle>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>隐私</Text>
            <Text style={styles.rowValue}>即将开放</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>数据</Text>
            <Text style={styles.rowValue}>即将开放</Text>
          </View>
        </Card>

        {hasSession && <PrimaryButton label="退出登录" onPress={() => void logout()} />}

        <MutedText>开发模式认证 · 生产环境将接入真实账号系统</MutedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: SPACE.s2 },
  rowLabel: { fontSize: TYPE.sm, color: COLORS.inkMuted },
  rowValue: { fontSize: TYPE.sm, color: COLORS.inkPrimary },
  linksRow: { flexDirection: "row", gap: SPACE.s2, marginTop: SPACE.s2 },
});
