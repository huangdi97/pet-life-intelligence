/** SocialScreen — 社交 (OWN-012 mobile port of apps/web/app/social):
 *  关系倾向 + 宠物好友 + 互动事件记录（安全筛选 + 真实互动学习，不做
 *  伪精确兼容度）。好友/互动均来自既有后端路由。 */
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, humanizeError, type LifeEvent, type Pet, type PetFriend, type SocialProfile } from "../api";
import { usePets } from "../context";
import { fmtTime } from "../format";
import { COLORS, SPACE, TYPE } from "../tokens";
import { Badge, Card, EmptyText, ErrorText, Loading, MutedText, ScreenTitle, SectionTitle } from "./ui";
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
  const { petId } = usePets();
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [friends, setFriends] = useState<PetFriend[]>([]);
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friendPetId, setFriendPetId] = useState("");
  const [quality, setQuality] = useState("NEUTRAL");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!petId) return;
    let alive = true;
    setLoading(true);
    api
      .get<SocialProfile>(`/pets/${petId}/social-profile`)
      .then((r) => {
        if (alive) setProfile(r);
      })
      .catch((e: unknown) => {
        if (alive) setError(humanizeError(e));
      });
    api
      .get<PetFriend[]>(`/pets/${petId}/friends`)
      .then((r) => {
        if (alive) setFriends(r);
      })
      .catch(() => {
        if (alive) setFriends([]);
      });
    api
      .get<Pet[]>("/pets")
      .then((r) => {
        if (alive) setAllPets(r);
      })
      .catch(() => {
        if (alive) setAllPets([]);
      });
    api
      .get<{ events: LifeEvent[] }>(
        `/pets/${petId}/events?limit=40${INTERACTION_EVENT_TYPES.map((w) => `&event_type=${w}`).join("")}`,
      )
      .then((r) => {
        if (alive) setEvents(r.events);
      })
      .catch(() => {
        if (alive) setEvents([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
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
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ScreenTitle title="社交" sub="关系图谱 + 互动历史 + 安全。真实互动学习，不做伪精确兼容度。" />

        {error && <ErrorText>{error}</ErrorText>}
        {loading && <Loading />}

        <Card>
          <SectionTitle>社交倾向</SectionTitle>
          {p ? (
            PROFILE_LABELS.map((row) => (
              <View key={row.key} style={styles.domainRow}>
                <Text style={styles.domainLabel}>{row.label}</Text>
                <Text style={styles.domainValue}>{(p as Record<string, string | undefined>)[row.key] ?? "未知"}</Text>
              </View>
            ))
          ) : (
            <MutedText>档案尚未形成。</MutedText>
          )}
          {p?.notes ? <MutedText>{p.notes}</MutedText> : null}
        </Card>

        <Card>
          <SectionTitle>宠物好友</SectionTitle>
          {friends.length === 0 ? (
            <MutedText>还没有好友关系。</MutedText>
          ) : (
            friends.map((f) => (
              <View key={f.request_id} style={styles.domainRow}>
                <Text style={styles.domainLabel}>{friendName(f.friend_pet_id)}</Text>
                <Badge text={friendStatusLabel(f.status)} color={COLORS.inkSecondary} bg={COLORS.bgSurfaceMuted} />
              </View>
            ))
          )}
        </Card>

        <Card>
          <SectionTitle>记录互动</SectionTitle>
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
        </Card>

        <SectionTitle>互动历史</SectionTitle>
        {events.length === 0 ? (
          <EmptyText>还没有互动记录。</EmptyText>
        ) : (
          events.map((e) => (
            <Card key={e.event_id}>
              <View style={styles.eventHead}>
                <Text style={styles.eventType}>{eventTypeLabel(e.event_type)}</Text>
                <Text style={styles.eventTime}>{fmtTime(e.occurred_at)}</Text>
              </View>
            </Card>
          ))
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
  page: { flex: 1, backgroundColor: COLORS.bgCanvas },
  flex: { flex: 1 },
  content: { padding: SPACE.s4, paddingBottom: SPACE.s8 },
  domainRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: SPACE.s1 },
  domainLabel: { fontSize: TYPE.sm, color: COLORS.inkSecondary },
  domainValue: { fontSize: TYPE.sm, color: COLORS.inkPrimary },
  eventHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eventType: { fontSize: TYPE.base, fontWeight: TYPE.weightSemibold, color: COLORS.inkPrimary },
  eventTime: { fontSize: TYPE.xs, color: COLORS.inkMuted },
});