/**
 * SocialScreen — 关系优先 (Stage R.2 §49): 关系 → 最近互动 → 互动历史 →
 * (记录互动 last). 真实互动学习，不做伪精确兼容度。
 */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
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
  const [friendPetId, setFriendPetId] = useState("");
  const [quality, setQuality] = useState("NEUTRAL");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const pet = pets?.find((p) => p.id === petId) ?? pets?.[0] ?? null;

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      api.get<SocialProfile>(`/pets/${petId}/social-profile`),
      api.get<PetFriend[]>(`/pets/${petId}/friends`),
      api.get<Pet[]>("/pets"),
      api.get<{ events: LifeEvent[] }>(`/pets/${petId}/events?limit=40${INTERACTION_EVENT_TYPES.map((w) => `&event_type=${w}`).join("")}`),
    ]).then(([p, f, ap, ev]) => {
      if (!alive) return;
      if (p.status === "fulfilled") setProfile(p.value);
      if (f.status === "fulfilled") setFriends(f.value);
      if (ap.status === "fulfilled") setAllPets(ap.value);
      if (ev.status === "fulfilled") setEvents(ev.value.events);
      setLoading(false);
      setError(p.status === "rejected" && f.status === "rejected" && ev.status === "rejected");
    });
    return () => {
      alive = false;
    };
  }, [petId, version]);

  const friendName = (id: string) => allPets.find((p) => p.id === id)?.name ?? id.slice(0, 8);
  const friendCandidates = allPets.filter((p) => p.id !== petId);
  const p = profile?.profile;

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
        <View style={styles.head}>
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
            <OpenSection title="关系">
              {p ? (
                PROFILE_LABELS.map((row) => (
                  <View key={row.key} style={styles.profileRow}>
                    <Text style={styles.profileLabel}>{row.label}</Text>
                    <Text style={styles.profileValue}>{(p as Record<string, string | undefined>)[row.key] ?? "未知"}</Text>
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

            <OpenSection title="宠物好友">
              {friends.length === 0 ? (
                <Text style={styles.emptyText}>还没有好友关系。</Text>
              ) : (
                friends.map((f) => (
                  <View key={f.request_id} style={styles.friendRow}>
                    <Text style={styles.friendName}>{friendName(f.friend_pet_id)}</Text>
                    <View style={styles.friendPill}>
                      <Text style={styles.friendPillText}>{friendStatusLabel(f.status)}</Text>
                    </View>
                  </View>
                ))
              )}
            </OpenSection>

            <OpenSection title="最近互动">
              {events.length === 0 ? (
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
              <Text style={styles.formLabel}>记录互动</Text>
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function friendStatusLabel(status: string): string {
  if (status === "ACCEPTED") return "已添加";
  if (status === "PENDING") return "待确认";
  if (status === "BLOCKED") return "已屏蔽";
  return status;
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
  formLabel: { fontSize: TYPE.section, fontWeight: "600", color: COLORS.textPrimary, marginBottom: SPACE.s2 },
});
