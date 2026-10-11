/**
 * SocialScreen — 关系优先 (Stage R.2 §49): 关系 → 最近互动 → 互动历史 →
 * (记录互动 last). 真实互动学习，不做伪精确兼容度。
 */
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePets } from "../context";
import { api, humanizeError, type LifeEvent, type Pet, type PetFriend, type SocialProfile } from "../api";
import { fmtTime } from "../format";
import { COLORS, SPACE, TYPE } from "../tokens";
import { OpenSection } from "../components/feedback/OpenSection";
import { EmptyState, InlineError, Skeleton } from "../components/feedback/Feedback";
import { eventTypeLabel } from "./ui_labels";
import { SocialRecordForm } from "./social_form";

const INTERACTION_EVENT_TYPES = ["social.interaction_logged", "social.friend_requested", "social.blocked"];

const PROFILE_LABELS: Array<{ key: string; label: string }> = [
  { key: "good_with_dogs", label: "对狗" },
  { key: "good_with_cats", label: "对猫" },
  { key: "good_with_kids", label: "对孩子" },
  { key: "good_with_strangers", label: "对陌生人" },
];

export function SocialScreen() {
  const { pets, petId } = usePets();
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [friends, setFriends] = useState<PetFriend[]>([]);
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [profileState, setProfileState] = useState<"loading" | "ready" | "error">("loading");
  const [friendsState, setFriendsState] = useState<"loading" | "ready" | "error">("loading");
  const [eventsState, setEventsState] = useState<"loading" | "ready" | "error">("loading");
  const [friendPetId, setFriendPetId] = useState("");
  const [quality, setQuality] = useState("NEUTRAL");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [version, setVersion] = useState(0);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    setProfileState("loading");
    setFriendsState("loading");
    setEventsState("loading");
    Promise.allSettled([
      api.get<SocialProfile>(`/pets/${petId}/social-profile`),
      api.get<PetFriend[]>(`/pets/${petId}/friends`),
      api.get<Pet[]>("/pets"),
      api.get<{ events: LifeEvent[] }>(`/pets/${petId}/events?limit=40${INTERACTION_EVENT_TYPES.map((w) => `&event_type=${w}`).join("")}`),
    ]).then(([p, f, ap, ev]) => {
      if (!alive) return;
      if (p.status === "fulfilled") {
        setProfile(p.value);
        setProfileState("ready");
      } else {
        setProfileState("error");
      }
      if (f.status === "fulfilled") {
        setFriends(f.value);
        setFriendsState("ready");
      } else {
        setFriendsState("error");
      }
      if (ap.status === "fulfilled") setAllPets(ap.value);
      if (ev.status === "fulfilled") {
        setEvents(ev.value.events);
        setEventsState("ready");
      } else {
        setEventsState("error");
      }
      setLoading(false);
      setError(p.status === "rejected" && f.status === "rejected" && ev.status === "rejected");
    });
    return () => {
      alive = false;
    };
  }, [petId, version]);

  const friendName = (id: string) => allPets.find((p) => p.id === id)?.name ?? "宠物朋友";
  const friendCandidates = allPets.filter((p) => p.id !== petId);
  const p = profile?.profile;
  const relationLabel = (value: string | undefined) => {
    if (!value || value === "UNKNOWN") return "未知";
    if (value === "GOOD") return "很好";
    if (value === "OK") return "可以";
    if (value === "CAUTION") return "需注意";
    if (value === "NO") return "不适合";
    return "已记录";
  };

  async function recordInteraction() {
    if (!petId || !friendPetId || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.post(`/pets/${petId}/social-interactions`, {
        friend_pet_id: friendPetId,
        quality,
        duration_minutes: Number(duration) || 0,
        notes,
      });
      setMsg("已记录互动。");
      setNotes("");
      setFormOpen(false);
      setVersion((v) => v + 1);
    } catch (e: unknown) {
      setMsg(humanizeError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.page} edges={["top", "bottom"]}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head} testID="pli.social.identity">
          <Text style={styles.title}>{pet ? `${pet.name}的社交` : "社交"}</Text>
          <Text style={styles.sub}>关系与真实互动记录，不做伪精确兼容度。</Text>
        </View>

        {error ? <InlineError message="暂时连接不上，已展示已有内容" /> : null}
        {loading ? (
          <View style={styles.loadingWrap}>
            <Skeleton rows={3} />
          </View>
        ) : (
          <>
            <OpenSection title="关系" testID="pli.social.preferences">
              {profileState === "loading" ? (
                <Text style={styles.emptyText}>正在读取关系档案……</Text>
              ) : profileState === "error" ? (
                <Text style={styles.emptyText}>关系档案暂时没有加载成功；不会把加载失败显示成“尚未形成”。</Text>
              ) : p ? (
                PROFILE_LABELS.map((row) => (
                  <View key={row.key} style={styles.profileRow}>
                    <Text style={styles.profileLabel}>{row.label}</Text>
                    <Text style={styles.profileValue}>{relationLabel((p as Record<string, string | undefined>)[row.key])}</Text>
                  </View>
                ))
              ) : (
                <EmptyState
                  title="关系档案尚未形成"
                  body="记录与其它宠物的真实互动后，这里会慢慢充实。"
                />
              )}
              {p?.notes ? <Text style={styles.notes}>{p.notes}</Text> : null}
            </OpenSection>

            <OpenSection title="宠物好友" testID="pli.social.friends">
              {friendsState === "loading" ? (
                <Text style={styles.emptyText}>正在读取宠物关系……</Text>
              ) : friendsState === "error" ? (
                <Text style={styles.emptyText}>宠物关系暂时没有加载成功；不会把未知关系显示成“没有好友”。</Text>
              ) : friends.length === 0 ? (
                <Text style={styles.emptyText}>还没有好友关系。</Text>
              ) : (
                friends.map((f) => (
                  <View key={f.request_id} testID={`pli.social.friend.${f.friend_pet_id}`} style={styles.friendRow}>
                    <Text style={styles.friendName}>{friendName(f.friend_pet_id)}</Text>
                    <View style={styles.friendPill}>
                      <Text style={styles.friendPillText}>{friendStatusLabel(f.status)}</Text>
                    </View>
                  </View>
                ))
              )}
            </OpenSection>

            <OpenSection title="最近互动" testID="pli.social.interactions">
              {eventsState === "loading" ? (
                <Text style={styles.emptyText}>正在读取最近互动……</Text>
              ) : eventsState === "error" ? (
                <Text style={styles.emptyText}>最近互动暂时没有加载成功；不会把加载失败显示成“没有互动”。</Text>
              ) : events.length === 0 ? (
                <EmptyState
                  title="还没有互动记录"
                  body="记录一起玩耍或散步，历史会从这里开始。"
                />
              ) : (
                events.slice(0, 6).map((e, i) => (
                  <View key={e.event_id} style={[styles.eventRow, i > 0 && styles.eventDivider]}>
                    <Text style={styles.eventType}>{eventTypeLabel(e.event_type)}</Text>
                    <Text style={styles.eventTime}>{fmtTime(e.occurred_at)}</Text>
                  </View>
                ))
              )}
            </OpenSection>

            <View style={styles.formSection}>
              <Pressable
                testID="pli.social.action"
                accessibilityRole="button"
                accessibilityLabel={formOpen ? "收起互动记录表单" : "记录一次互动"}
                accessibilityState={{ expanded: formOpen }}
                onPress={() => setFormOpen((value) => !value)}
                style={({ pressed }) => [styles.formToggle, pressed && styles.pressed]}
              >
                <View style={styles.formToggleCopy}>
                  <Text style={styles.formLabel}>补充一次互动</Text>
                  <Text style={styles.formHint}>先看关系与最近互动；需要时再记录真实发生的这一次。</Text>
                </View>
                <Text style={styles.formToggleAction}>{formOpen ? "收起" : "记录"}</Text>
              </Pressable>
              {formOpen ? (
                <View style={styles.formWrap}>
                  <SocialRecordForm
                    candidates={friendCandidates}
                    friendPetId={friendPetId}
                    onFriendChange={setFriendPetId}
                    quality={quality}
                    onQualityChange={setQuality}
                    duration={duration}
                    onDurationChange={setDuration}
                    notes={notes}
                    onNotesChange={setNotes}
                    busy={busy}
                    msg={msg}
                    onRecord={() => void recordInteraction()}
                  />
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function friendStatusLabel(status: string): string {
  if (status === "ACTIVE" || status === "ACCEPTED") return "已添加";
  if (status === "PENDING") return "待确认";
  if (status === "BLOCKED") return "已屏蔽";
  if (status === "DECLINED") return "已拒绝";
  return "已记录";
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.canvas },
  flex: { flex: 1 },
  content: { paddingBottom: SPACE.s8 },
  head: { paddingHorizontal: SPACE.s4, paddingTop: SPACE.s3 },
  title: { fontSize: TYPE.pageTitle, fontWeight: "700", color: COLORS.textPrimary },
  sub: { fontSize: TYPE.sm, color: COLORS.textTertiary, marginTop: 2 },
  loadingWrap: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  profileRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  profileLabel: { fontSize: TYPE.body, color: COLORS.textPrimary, fontWeight: "500" },
  profileValue: { fontSize: TYPE.sm, color: COLORS.textSecondary },
  notes: { fontSize: TYPE.caption, color: COLORS.textTertiary, marginTop: SPACE.s2 },
  friendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  friendName: { fontSize: TYPE.body, color: COLORS.textPrimary },
  friendPill: { backgroundColor: COLORS.brandSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  friendPillText: { fontSize: TYPE.caption, color: COLORS.textSecondary, fontWeight: "600" },
  eventRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  eventDivider: { borderTopWidth: 1, borderTopColor: COLORS.dividerSubtle },
  eventType: { fontSize: TYPE.body, color: COLORS.textPrimary },
  eventTime: { fontSize: TYPE.caption, color: COLORS.textTertiary },
  emptyText: { fontSize: TYPE.body, color: COLORS.textTertiary },
  formSection: { paddingHorizontal: SPACE.s4, marginTop: SPACE.s5 },
  formToggle: { minHeight: 66, borderRadius: 20, backgroundColor: COLORS.brandSoftGreen, paddingHorizontal: SPACE.s4, paddingVertical: SPACE.s3, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACE.s3 },
  formToggleCopy: { flex: 1 },
  formLabel: { fontSize: TYPE.section, fontWeight: "700", color: COLORS.textPrimary },
  formHint: { fontSize: TYPE.caption, color: COLORS.textTertiary, lineHeight: 18, marginTop: 3 },
  formToggleAction: { fontSize: TYPE.sm, color: COLORS.brandPrimaryDeep, fontWeight: "700" },
  formWrap: { marginTop: SPACE.s3 },
  pressed: { opacity: 0.84 },
});
