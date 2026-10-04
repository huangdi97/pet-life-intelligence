import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError } from "../api";
import { usePets } from "../context";
import { COLORS, RADIUS, SPACE, TYPE } from "../tokens";
import { OpenSection } from "../components/feedback/OpenSection";
import { EmptyState, InlineError, Skeleton } from "../components/feedback/Feedback";

interface Grant {
  grant_id?: string;
  id?: string;
  user_id: string;
  user_label?: string;
  scopes: string[];
  expires_at: string | null;
  status: string;
}
interface Handoff {
  handoff_id: string;
  caregiver_user_id: string;
  caregiver_label?: string;
  scope: string[];
  start_at: string;
  end_at: string | null;
  status: string;
}
const SCOPE_LABELS: Record<string, string> = {
  "daily:read": "查看日常",
  "daily:write": "记录日常",
  "medical:read": "查看健康",
  "medical:write": "记录健康",
  "card:read": "查看照护卡",
};
function statusLabel(status: string): string {
  if (status === "ACTIVE") return "生效中";
  if (status === "PENDING") return "待确认";
  if (status === "EXPIRED") return "已到期";
  if (status === "ENDED" || status === "REVOKED") return "已结束";
  return "已记录";
}
function timeLabel(value: string | null): string {
  return value ? new Date(value).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "手动结束";
}

export function CareScreen() {
  const { pets, petId } = usePets();
  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;
  const [grants, setGrants] = useState<Grant[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [caregiver, setCaregiver] = useState("");
  const [hours, setHours] = useState("48");
  const [card, setCard] = useState<{ token: string; expires_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      api.get<Grant[]>(`/pets/${petId}/grants`),
      api.get<Handoff[]>(`/pets/${petId}/handoffs`),
    ]).then(([g, h]) => {
      if (!alive) return;
      if (g.status === "fulfilled") setGrants(g.value);
      if (h.status === "fulfilled") setHandoffs(h.value);
      setError(g.status === "rejected" && h.status === "rejected" ? "暂时连接不上照护网络。" : null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [petId, version]);

  async function createHandoff() {
    if (!petId || !caregiver.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/pets/${petId}/handoffs`, {
        caregiver_user_id: caregiver.trim(),
        scopes: ["daily:read", "daily:write"],
        end_at: new Date(Date.now() + Math.max(1, Number(hours) || 48) * 3600_000).toISOString(),
        reason: "care handoff",
      });
      setCaregiver("");
      setVersion((v) => v + 1);
    } catch (e: unknown) { setError(humanizeError(e)); }
    finally { setBusy(false); }
  }
  async function endHandoff(id: string) {
    setBusy(true); setError(null);
    try {
      await api.post(`/handoffs/${id}/end`, {});
      setVersion((v) => v + 1);
    } catch (e: unknown) { setError(humanizeError(e)); }
    finally { setBusy(false); }
  }
  async function issueCard() {
    if (!petId || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await api.post<{ token: string; expires_at: string }>(`/pets/${petId}/care-cards`, { expires_in_hours: 72 });
      setCard(result);
    } catch (e: unknown) { setError(humanizeError(e)); }
    finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.title}>{pet ? `${pet.name}的照护网络` : "照护网络"}</Text>
          <Text style={styles.sub}>家庭成员、临时交接与照护卡。权限按人、用途与时间清楚管理。</Text>
        </View>
        {error ? <InlineError message={error} /> : null}
        {loading ? <View style={styles.loading}><Skeleton rows={3} /></View> : (
          <>
            <OpenSection title="正在进行的交接">
              {handoffs.length === 0 ? (
                <EmptyState title="目前没有照护交接" body="需要他人临时照护时，可以创建一个限时、限定范围的交接。" />
              ) : handoffs.map((handoff) => (
                <View key={handoff.handoff_id} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{handoff.caregiver_label || "临时照护人"} · {statusLabel(handoff.status)}</Text>
                    <Text style={styles.rowBody}>{handoff.scope.map((s) => SCOPE_LABELS[s] ?? "限定权限").join(" · ")}</Text>
                    <Text style={styles.meta}>至 {timeLabel(handoff.end_at)}</Text>
                  </View>
                  {handoff.status === "ACTIVE" ? (
                    <Pressable accessibilityRole="button" onPress={() => void endHandoff(handoff.handoff_id)} style={styles.secondary}>
                      <Text style={styles.secondaryText}>结束</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </OpenSection>

            <OpenSection title="权限记录">
              {grants.length ? grants.map((grant) => (
                <View key={grant.grant_id ?? grant.id ?? grant.user_id} style={styles.record}>
                  <Text style={styles.rowTitle}>{grant.user_label || "已授权成员"} · {statusLabel(grant.status)}</Text>
                  <Text style={styles.rowBody}>{grant.scopes.map((s) => SCOPE_LABELS[s] ?? "限定权限").join(" · ")}</Text>
                  <Text style={styles.meta}>{grant.expires_at ? `到期 ${timeLabel(grant.expires_at)}` : "长期有效"}</Text>
                </View>
              )) : <Text style={styles.emptyLine}>还没有授权记录。</Text>}
            </OpenSection>
          </>
        )}

        <OpenSection title="发起临时交接" caption="默认仅日常权限">
          <Text style={styles.note}>临时照护人默认只获得日常查看与记录权限；到期自动失效，不能转授管理权限。</Text>
          <TextInput style={styles.input} value={caregiver} onChangeText={setCaregiver} placeholder="临时照护人成员标识" placeholderTextColor={COLORS.textTertiary} />
          <TextInput style={styles.input} value={hours} onChangeText={setHours} keyboardType="number-pad" placeholder="有效小时数" placeholderTextColor={COLORS.textTertiary} />
          <Pressable accessibilityRole="button" disabled={busy || !caregiver.trim()} onPress={() => void createHandoff()} style={[styles.primary, (busy || !caregiver.trim()) && styles.disabled]}>
            <Text style={styles.primaryText}>{busy ? "处理中…" : "创建交接"}</Text>
          </Pressable>
        </OpenSection>

        <OpenSection title="照护卡">
          <Text style={styles.note}>只分享喂养、用药、禁忌与紧急联系人等最小必要信息，不包含完整医疗历史。</Text>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void issueCard()} style={styles.primary}>
            <Text style={styles.primaryText}>生成 72 小时照护卡</Text>
          </Pressable>
          {card ? (
            <View style={styles.cardResult}>
              <Text style={styles.rowTitle}>照护卡已生成</Text>
              <Text style={styles.rowBody}>分享链接已创建；请在支持分享的客户端打开。72 小时后自动失效。</Text>
            </View>
          ) : null}
        </OpenSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  content: { paddingBottom: SPACE.s8 },
  head: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { marginTop: 3, fontSize: TYPE.sm, color: COLORS.textTertiary, lineHeight: 20 },
  loading: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s4 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: SPACE.s2, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.dividerSubtle },
  rowText: { flex: 1 },
  rowTitle: { fontSize: TYPE.bodyStrong, fontWeight: "600", color: COLORS.textPrimary },
  rowBody: { marginTop: 3, fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20 },
  meta: { marginTop: 3, fontSize: TYPE.caption, color: COLORS.textTertiary },
  secondary: { backgroundColor: COLORS.brandSoft, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 7 },
  secondaryText: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "600" },
  record: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.dividerSubtle },
  emptyLine: { fontSize: TYPE.body, color: COLORS.textTertiary, paddingVertical: 8 },
  note: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACE.s2 },
  input: { marginTop: SPACE.s2, borderWidth: 1, borderColor: COLORS.dividerStrong, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, paddingHorizontal: SPACE.s3, paddingVertical: 10, fontSize: TYPE.body, color: COLORS.textPrimary },
  primary: { marginTop: SPACE.s3, backgroundColor: COLORS.brandPrimary, borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: "center" },
  primaryText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  cardResult: { marginTop: SPACE.s3, backgroundColor: COLORS.brandSoftGreen, borderRadius: RADIUS.xl, padding: SPACE.s3 },
});
