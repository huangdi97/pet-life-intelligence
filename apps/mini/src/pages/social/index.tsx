import { useEffect, useState } from "react";
import { Button, Input, Picker, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, type LifeEvent, type Pet } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { eventTypeLabel } from "../../utils/labels";
import { fmtTime } from "../../utils/format";

interface SocialProfile {
  profile?: Record<string, string | undefined>;
}
interface PetFriend {
  request_id: string;
  friend_pet_id: string;
  status: string;
}

const PROFILE_ROWS = [
  ["good_with_dogs", "对狗"],
  ["good_with_cats", "对猫"],
  ["good_with_kids", "对孩子"],
  ["good_with_strangers", "对陌生人"],
] as const;
const QUALITY = [
  { value: "GOOD", label: "顺利" },
  { value: "NEUTRAL", label: "平静" },
  { value: "TENSE", label: "紧张" },
  { value: "BAD", label: "冲突" },
];

function relationLabel(value: string | undefined): string {
  if (!value) return "未知";
  if (value === "GOOD") return "很好";
  if (value === "OK") return "可以";
  if (value === "CAUTION") return "需注意";
  if (value === "NO") return "不适合";
  if (value === "UNKNOWN") return "未知";
  return "已记录";
}

function friendStatusLabel(status: string): string {
  if (status === "ACTIVE" || status === "ACCEPTED") return "已添加";
  if (status === "PENDING") return "待确认";
  if (status === "BLOCKED") return "已屏蔽";
  return "已记录";
}

export default function Social() {
  const { pets, petId } = usePets();
  const current = pets?.find((p) => p.id === petId) ?? pets?.[0];
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [friends, setFriends] = useState<PetFriend[]>([]);
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [friendPetId, setFriendPetId] = useState("");
  const [quality, setQuality] = useState("NEUTRAL");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!petId) return;
    setState("loading");
    Promise.allSettled([
      api.get<SocialProfile>(`/pets/${petId}/social-profile`),
      api.get<PetFriend[]>(`/pets/${petId}/friends`),
      api.get<Pet[]>("/pets"),
      api.get<{ events: LifeEvent[] }>(`/pets/${petId}/events?limit=30&event_type=social.interaction_logged`),
    ]).then(([p, f, ap, ev]) => {
      if (p.status === "fulfilled") setProfile(p.value);
      if (f.status === "fulfilled") setFriends(f.value);
      if (ap.status === "fulfilled") setAllPets(ap.value);
      if (ev.status === "fulfilled") setEvents(ev.value.events);
      setState(p.status === "rejected" && f.status === "rejected" && ev.status === "rejected" ? "error" : "ready");
    });
  }, [petId, version]);

  const candidates = allPets.filter((p) => p.id !== petId);
  const selectedIndex = Math.max(0, candidates.findIndex((p) => p.id === friendPetId));
  const qualityIndex = Math.max(0, QUALITY.findIndex((q) => q.value === quality));

  async function record() {
    if (!petId || !friendPetId || busy) return;
    setBusy(true);
    try {
      await api.post(`/pets/${petId}/social-interactions`, {
        friend_pet_id: friendPetId,
        quality,
        duration_minutes: Number(duration) || 0,
        notes: notes.trim(),
      });
      setNotes("");
      setVersion((v) => v + 1);
      Taro.showToast({ title: "已记录互动", icon: "success" });
    } catch {
      Taro.showToast({ title: "记录失败", icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="page">
      <View className="h1">{current ? `${current.name}的社交` : "社交"}</View>
      <View className="sub">关系与真实互动记录，不做伪精确兼容度。</View>

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && <View className="state state-error">暂时连接不上，稍后重试。</View>}

      <View className="open-section">
        <View className="section-title">关系</View>
        {profile?.profile ? PROFILE_ROWS.map(([key, label]) => (
          <View className="life-row" key={key}>
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{label}</Text>
                <Text className="life-row-time">{relationLabel(profile.profile?.[key])}</Text>
              </View>
            </View>
          </View>
        )) : <View className="life-empty-note">关系档案还在形成中，真实互动会慢慢充实这里。</View>}
      </View>

      <View className="open-section">
        <View className="section-title">宠物好友</View>
        {friends.length ? friends.map((f) => {
          const name = allPets.find((p) => p.id === f.friend_pet_id)?.name ?? "宠物朋友";
          return (
            <View className="life-row" key={f.request_id}>
              <View className="life-dot" />
              <View className="life-row-body">
                <View className="life-row-head">
                  <Text className="life-row-type">{name}</Text>
                  <Text className="life-row-time">{friendStatusLabel(f.status)}</Text>
                </View>
              </View>
            </View>
          );
        }) : <View className="life-empty-note">还没有好友关系。</View>}
      </View>

      <View className="open-section">
        <View className="section-title">最近互动</View>
        {events.length ? events.slice(0, 6).map((e) => (
          <View className="life-row" key={e.event_id}>
            <View className="life-dot" />
            <View className="life-row-body">
              <View className="life-row-head">
                <Text className="life-row-type">{eventTypeLabel(e.event_type)}</Text>
                <Text className="life-row-time">{fmtTime(e.occurred_at)}</Text>
              </View>
            </View>
          </View>
        )) : <View className="life-empty-note">还没有互动记录。</View>}
      </View>

      <View className="open-section">
        <View className="section-title">记录互动</View>
        {candidates.length ? (
          <>
            <View className="field">
              <Text>和谁互动</Text>
              <Picker
                mode="selector"
                range={candidates.map((p) => p.name)}
                value={selectedIndex}
                onChange={(e) => setFriendPetId(candidates[Number(e.detail.value)]?.id ?? "")}
              >
                <View className="input">{candidates[selectedIndex]?.name ?? "选择宠物"}</View>
              </Picker>
            </View>
            <View className="field">
              <Text>互动状态</Text>
              <Picker
                mode="selector"
                range={QUALITY.map((q) => q.label)}
                value={qualityIndex}
                onChange={(e) => setQuality(QUALITY[Number(e.detail.value)]?.value ?? "NEUTRAL")}
              >
                <View className="input">{QUALITY[qualityIndex]?.label ?? "平静"}</View>
              </Picker>
            </View>
            <View className="field">
              <Text>持续时间（分钟）</Text>
              <Input className="input" type="number" value={duration} onInput={(e) => setDuration(e.detail.value)} />
            </View>
            <View className="field">
              <Text>备注</Text>
              <Input className="input" value={notes} onInput={(e) => setNotes(e.detail.value)} placeholder="只记录真实发生的事" />
            </View>
            <Button className="btn btn-primary" disabled={busy || !friendPetId} onClick={record}>
              {busy ? "记录中…" : "记录互动"}
            </Button>
          </>
        ) : <View className="life-empty-note">添加另一只宠物后，就可以记录彼此的互动。</View>}
      </View>
    </View>
  );
}
