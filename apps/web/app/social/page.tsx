"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type LifeEvent, type Pet } from "@pli/api-client";
import { useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage } from "../../lib/i18n";
import { FriendsPanel } from "./_components/FriendsPanel";
import { InteractionsPanel } from "./_components/InteractionsPanel";
import { RecordInteractionPanel } from "./_components/RecordInteractionPanel";
import { RelationsPanel } from "./_components/RelationsPanel";
import type { PetFriend, SocialProfile } from "./_components/types";

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

  const friendName = (id: string) => pets.data?.find((p) => p.id === id)?.name ?? "未命名伙伴";

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
    <main className="v4-main v5-domain-page">
      <div className="v4-topline v5-page-lede" data-testid="pli.social.identity">
        <h1>社交与伙伴</h1>
        <p className="sub">它和谁熟悉、最近发生了什么互动，以及有哪些需要留意的相处情况。</p>
      </div>
      {msg && <div className="alert info">{msg}</div>}

      {/* 关系图谱（列表式 + 倾向标注，非 Feed） */}
      <RelationsPanel profile={profile} />

      {/* 伙伴关系 */}
      <FriendsPanel friends={friends} friendName={friendName} />

      {/* 互动历史 */}
      <div data-testid="pli.social.interactions">
        <InteractionsPanel events={events} friendName={friendName} />
      </div>

      {/* 记录互动 */}
      <div data-testid="pli.social.action">
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
      </div>

      <div className="row" style={{ marginTop: 8 }}>
        <Link href="/" className="btn">
          回到今日
        </Link>
      </div>
    </main>
  );
}
