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
interface HouseholdMember {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
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
const HANDOFF_SCOPES = ["daily:read", "daily:write", "medical:read", "medical:write", "card:read"] as const;
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
  if (status === "ENDED") return "已结束";
  if (status === "REVOKED") return "已撤销";
  return "已记录";
}
function roleLabel(role: string): string {
  if (role === "OWNER") return "主人";
  if (role === "CO_OWNER") return "共同主人";
  if (role === "FAMILY") return "家庭成员";
  if (role === "CAREGIVER") return "照护人";
  return "成员";
}
function timeLabel(value: string | null): string {
  return value ? new Date(value).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "手动结束";
}

export function CareScreen() {
  const { pets, petId } = usePets();
  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;
  const [grants, setGrants] = useState<Grant[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [grantsState, setGrantsState] = useState<"loading" | "ready" | "error">("loading");
  const [handoffsState, setHandoffsState] = useState<"loading" | "ready" | "error">("loading");
  const [caregiver, setCaregiver] = useState("");
  const [scopes, setScopes] = useState<string[]>(["daily:read", "daily:write"]);
  const [hours, setHours] = useState("48");
  const [card, setCard] = useState<{ token_id: string; token: string; expires_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    setGrantsState("loading");
    setHandoffsState("loading");
    Promise.allSettled([
      api.get<Grant[]>(`/pets/${petId}/grants`),
      api.get<Handoff[]>(`/pets/${petId}/handoffs`),
      pet?.household_id
        ? api.get<HouseholdMember[]>(`/households/${pet.household_id}/members`)
        : Promise.resolve([] as HouseholdMember[]),
    ]).then(([g, h, m]) => {
      if (!alive) return;
      if (g.status === "fulfilled") {
        setGrants(g.value);
        setGrantsState("ready");
      } else {
        setGrantsState("error");
      }
      if (h.status === "fulfilled") {
        setHandoffs(h.value);
        setHandoffsState("ready");
      } else {
        setHandoffsState("error");
      }
      if (m.status === "fulfilled") {
        setMembers(m.value.filter((member) => member.status === "ACTIVE"));
      } else {
        setMembers([]);
      }
      setError(g.status === "rejected" && h.status === "rejected" ? "暂时连接不上照护网络。" : null);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [petId, pet?.household_id, version]);

  async function createHandoff() {
    if (!petId || !caregiver.trim() || scopes.length === 0 || busy) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/pets/${petId}/handoffs`, {
        caregiver_user_id: caregiver.trim(),
        scopes,
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
  async function revokeGrant(id: string) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await api.del(`/grants/${id}`);
      setVersion((v) => v + 1);
    } catch (e: unknown) { setError(humanizeError(e)); }
    finally { setBusy(false); }
  }
  async function issueCard() {
    if (!petId || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await api.post<{ token_id: string; token: string; expires_at: string }>(`/pets/${petId}/care-cards`, { expires_in_hours: 72 });
      setCard(result);
    } catch (e: unknown) { setError(humanizeError(e)); }
    finally { setBusy(false); }
  }
  async function revokeCard() {
    if (!card?.token_id || busy) return;
    setBusy(true); setError(null);
    try {
      await api.del(`/share-tokens/${card.token_id}`);
      setCard(null);
    } catch (e: unknown) { setError(humanizeError(e)); }
    finally { setBusy(false); }
  }

  const carePeople = new Map<string, { user_id: string; label: string; role: string }>();
  for (const member of members) {
    carePeople.set(member.user_id, {
      user_id: member.user_id,
      label: member.display_name || member.email || "家庭成员",
      role: roleLabel(member.role),
    });
  }
  for (const grant of grants) {
    if (!carePeople.has(grant.user_id)) {
      carePeople.set(grant.user_id, {
        user_id: grant.user_id,
        label: grant.user_label || "曾授权照护人",
        role: "曾授权照护人",
      });
    }
  }
  for (const handoff of handoffs) {
    if (!carePeople.has(handoff.caregiver_user_id)) {
      carePeople.set(handoff.caregiver_user_id, {
        user_id: handoff.caregiver_user_id,
        label: handoff.caregiver_label || "曾参与照护的人",
        role: "曾参与照护",
      });
    }
  }
  const caregiverOptions = [...carePeople.values()];

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
              {handoffsState === "error" ? (
                <Text style={styles.emptyLine}>照护交接暂时没有加载成功；不会把未知状态显示成“没有交接”。</Text>
              ) : handoffs.length === 0 ? (
                <EmptyState title="目前没有照护交接" body="需要他人临时照护时，可以创建一个限时、限定范围的交接。" />
              ) : handoffs.map((handoff) => (
                <View key={handoff.handoff_id} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{handoff.caregiver_label || "临时照护人"} · {statusLabel(handoff.status)}</Text>
                    <Text style={styles.rowBody}>{handoff.scope.map((s) => SCOPE_LABELS[s] ?? "限定权限").join(" · ")}</Text>
                    <Text style={styles.meta}>至 {timeLabel(handoff.end_at)}</Text>
                  </View>
                  {handoff.status === "ACTIVE" ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`结束${handoff.caregiver_label || "临时照护人"}的照护交接`} accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void endHandoff(handoff.handoff_id)} style={[styles.secondary, busy && styles.disabled]}>
                      <Text style={styles.secondaryText}>结束</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </OpenSection>

            <OpenSection title="权限记录">
              {grantsState === "error" ? (
                <Text style={styles.emptyLine}>权限记录暂时没有加载成功；不会把未知状态显示成“没有授权”。</Text>
              ) : grants.length ? grants.map((grant) => (
                <View key={grant.grant_id ?? grant.id ?? grant.user_id} style={styles.record}>
                  <Text style={styles.rowTitle}>{grant.user_label || "已授权成员"} · {statusLabel(grant.status)}</Text>
                  <Text style={styles.rowBody}>{grant.scopes.map((s) => SCOPE_LABELS[s] ?? "限定权限").join(" · ")}</Text>
                  <Text style={styles.meta}>{grant.expires_at ? `到期 ${timeLabel(grant.expires_at)}` : "未设置到期时间"}</Text>
                  {grant.status === "ACTIVE" && (grant.grant_id ?? grant.id) ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`撤销${grant.user_label || "该成员"}的权限`}
                      accessibilityState={{ disabled: busy }}
                      disabled={busy}
                      onPress={() => void revokeGrant(String(grant.grant_id ?? grant.id))}
                      style={[styles.secondary, styles.revokeInline, busy && styles.disabled]}
                    >
                      <Text style={styles.secondaryText}>撤销权限</Text>
                    </Pressable>
                  ) : null}
                </View>
              )) : <Text style={styles.emptyLine}>还没有授权记录。</Text>}
            </OpenSection>
          </>
        )}

        <OpenSection title="发起临时交接" caption="默认仅日常权限">
          <Text style={styles.note}>临时照护人默认只获得日常查看与记录权限；到期自动失效，不能转授管理权限。</Text>
          {caregiverOptions.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberRail}>
              {caregiverOptions.map((person) => {
                const selected = caregiver === person.user_id;
                return (
                  <Pressable
                    key={person.user_id}
                    accessibilityRole="button"
                    accessibilityLabel={`选择临时照护人：${person.label}`}
                    accessibilityState={{ selected }}
                    onPress={() => setCaregiver(person.user_id)}
                    style={[styles.memberChoice, selected && styles.memberChoiceActive]}
                  >
                    <Text style={[styles.memberChoiceName, selected && styles.memberChoiceNameActive]}>
                      {person.label}
                    </Text>
                    <Text style={styles.memberChoiceRole}>{person.role}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.emptyLine}>还没有可选择的照护人；请先完成家庭邀请。</Text>
          )}
          <Text style={styles.memberHint}>新照护人通过家庭邀请进入；这里不会要求输入内部用户 ID。</Text>
          <Text style={styles.scopeTitle}>允许临时照护人做什么</Text>
          <View style={styles.scopeWrap}>
            {HANDOFF_SCOPES.map((scope) => {
              const selected = scopes.includes(scope);
              return (
                <Pressable
                  key={scope}
                  accessibilityRole="button"
                  accessibilityLabel={SCOPE_LABELS[scope]}
                  accessibilityState={{ selected }}
                  onPress={() =>
                    setScopes((old) =>
                      selected ? old.filter((value) => value !== scope) : [...old, scope],
                    )
                  }
                  style={[styles.scopeChoice, selected && styles.scopeChoiceActive]}
                >
                  <Text style={[styles.scopeChoiceText, selected && styles.scopeChoiceTextActive]}>
                    {SCOPE_LABELS[scope]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput style={styles.input} value={hours} onChangeText={setHours} keyboardType="number-pad" placeholder="有效小时数" placeholderTextColor={COLORS.textTertiary} />
          <Pressable accessibilityRole="button" accessibilityLabel="创建临时照护交接" accessibilityState={{ disabled: busy || !caregiver.trim() || scopes.length === 0 }} disabled={busy || !caregiver.trim() || scopes.length === 0} onPress={() => void createHandoff()} style={[styles.primary, (busy || !caregiver.trim() || scopes.length === 0) && styles.disabled]}>
            <Text style={styles.primaryText}>{busy ? "处理中…" : "创建交接"}</Text>
          </Pressable>
        </OpenSection>

        <OpenSection title="照护卡">
          <Text style={styles.note}>只分享喂养、用药、禁忌与紧急联系人等最小必要信息，不包含完整医疗历史。</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="生成 72 小时照护卡" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void issueCard()} style={[styles.primary, busy && styles.disabled]}>
            <Text style={styles.primaryText}>生成 72 小时照护卡</Text>
          </Pressable>
          {card ? (
            <View style={styles.cardResult}>
              <Text style={styles.rowTitle}>照护卡已生成</Text>
              <Text style={styles.rowBody}>分享链接已创建；请在支持分享的客户端打开。72 小时后自动失效。</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="撤销当前照护卡分享链接" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => void revokeCard()} style={[styles.secondary, styles.revokeInline, busy && styles.disabled]}>
                <Text style={styles.secondaryText}>撤销分享链接</Text>
              </Pressable>
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
  secondary: { minHeight: 44, justifyContent: "center", backgroundColor: COLORS.brandSoft, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 7 },
  secondaryText: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "600" },
  revokeInline: { alignSelf: "flex-start", marginTop: SPACE.s2 },
  record: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.dividerSubtle },
  memberRail: { gap: SPACE.s2, paddingVertical: SPACE.s2, paddingRight: SPACE.s4 },
  memberChoice: { minWidth: 132, minHeight: 58, justifyContent: "center", backgroundColor: COLORS.surfaceRaised, borderRadius: RADIUS.xl, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s2 },
  memberChoiceActive: { backgroundColor: COLORS.brandSoftGreen },
  memberChoiceName: { fontSize: TYPE.sm, color: COLORS.textPrimary, fontWeight: "600" },
  memberChoiceNameActive: { color: COLORS.brandPrimaryDeep },
  memberChoiceRole: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: 2 },
  memberHint: { fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 18, marginTop: SPACE.s1 },
  scopeTitle: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "600", marginTop: SPACE.s3 },
  scopeWrap: { flexDirection: "row", flexWrap: "wrap", gap: SPACE.s2, marginTop: SPACE.s2 },
  scopeChoice: { minHeight: 44, justifyContent: "center", borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceRaised, paddingHorizontal: SPACE.s3, paddingVertical: SPACE.s2 },
  scopeChoiceActive: { backgroundColor: COLORS.brandSoftGreen },
  scopeChoiceText: { fontSize: TYPE.sm, color: COLORS.textSecondary, fontWeight: "500" },
  scopeChoiceTextActive: { color: COLORS.brandPrimaryDeep, fontWeight: "700" },
  emptyLine: { fontSize: TYPE.body, color: COLORS.textTertiary, paddingVertical: 8 },
  note: { fontSize: TYPE.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACE.s2 },
  input: { marginTop: SPACE.s2, borderWidth: 1, borderColor: COLORS.dividerStrong, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, paddingHorizontal: SPACE.s3, paddingVertical: 10, fontSize: TYPE.body, color: COLORS.textPrimary },
  primary: { minHeight: 48, justifyContent: "center", marginTop: SPACE.s3, backgroundColor: COLORS.brandPrimary, borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: "center" },
  primaryText: { color: COLORS.textInverse, fontSize: TYPE.button, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  cardResult: { marginTop: SPACE.s3, backgroundColor: COLORS.brandSoftGreen, borderRadius: RADIUS.xl, padding: SPACE.s3 },
});
