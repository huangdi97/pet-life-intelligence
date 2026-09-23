"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type LifeEvent, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage, t } from "../../lib/i18n";
import { FriendsPanel } from "./_components/FriendsPanel";
import { InteractionsPanel } from "./_components/InteractionsPanel";
import { RecordInteractionPanel } from "./_components/RecordInteractionPanel";
import { RelationsPanel } from "./_components/RelationsPanel";
import type { PetFriend, SocialProfile } from "./_components/types";

const QUALITY_LABELS: Record<string, string> = {
  UNKNOWN: "未知",
  GOOD: "顺利",
  NEUTRAL: "平静",
  TENSE: "紧张",
  BAD: "冲突",
};

/** OWN-012 Social（Stage H §27-28）：关系图谱 + 互动历史 + 安全 + 反馈，不是传统 Feed。 */
export default function SocialPage() {
  const { petId } = useCurrentPet();
  const [friendPetId, setFriendPetId] = useState("");
  const [quality, setQuality] = useState("NEUTRAL");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const profile = useAsync<SocialProfile>(
    () => (petId ? api.get(`/pets/${petId}/social-profile`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const friends = useAsync<PetFriend[]>(
    () => (petId ? api.get(`/pets/${petId}/friends`) : Promise.reject(new Error("NO_PET_SELECTED"))),
    [petId],
  );
  const pets = useAsync<Pet[]>(
    () => api.get<Pet[]>("/pets"),
    [],
  );
  const events = useAsync<{ events: LifeEvent[] }>(
    () =>
      petId
        ? api.get(
            `/pets/${petId}/events?limit=40&event_type=social.interaction_logged&event_type=social.friend_requested&event_type=social.blocked`,
          )
        : Promise.reject(new Error("NO_PET_SELECTED")),
    [petId],
  );

  const friendName = (id: string) => pets.data?.find((p) => p.id === id)?.name ?? id.slice(0, 8);

  async function recordInteraction() {
    if (!petId || !friendPetId) return;
    setBusy(true);
    setMsg(null);
    try {
      await api.post(`/pets/${petId}/social-interactions`, {
        friend_pet_id: friendPetId,
        quality,
        duration_minutes: Number(duration) || 0,
        notes,
      });
      setMsg("已记录互动");
      events.reload();
      setNotes("");
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg(mapErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <h1>{t("social.title")}</h1>
      <p className="sub">{t("social.sub")}</p>
      {msg && <div className="alert info">{msg}</div>}

      {/* 关系图谱（列表式 + 倾向标注，非 Feed） */}
      <RelationsPanel profile={profile} />

      {/* 伙伴关系 */}
      <FriendsPanel friends={friends} friendName={friendName} />

      {/* 互动历史 */}
      <InteractionsPanel events={events} friendName={friendName} />

      {/* 记录互动 */}
      <RecordInteractionPanel
        pets={pets.data}
        petId={petId}
        friendPetId={friendPetId}
        onFriendChange={setFriendPetId}
        quality={quality}
        onQualityChange={setQuality}
        duration={duration}
        onDurationChange={setDuration}
        notes={notes}
        onNotesChange={setNotes}
        busy={busy}
        onRecord={recordInteraction}
      />

      <div className="row" style={{ marginTop: 8 }}>
        <Link href="/" className="btn">
          回到今日
        </Link>
      </div>
    </main>
  );
}
