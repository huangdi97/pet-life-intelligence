"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type LifeEvent, type Pet } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage, t } from "../../lib/i18n";
import { InteractionCard, PersonChip } from "@pli/ui-kit";
import { State } from "../../components/ui";

interface SocialProfile {
  pet_id: string;
  profile?: {
    good_with_dogs?: string;
    good_with_cats?: string;
    good_with_kids?: string;
    good_with_strangers?: string;
    notes?: string;
  } | null;
}

interface PetFriend {
  request_id: string;
  friend_pet_id: string;
  status: string;
}

const QUALITY_LABELS: Record<string, string> = {
  UNKNOWN: "未知",
  GOOD: "顺利",
  NEUTRAL: "平静",
  TENSE: "紧张",
  BAD: "冲突",
};

const FAMILIAR_LABELS: Record<string, string> = {
  UNKNOWN: "未知",
  GOOD: "很好",
  OK: "可以",
  CAUTION: "需注意",
  NO: "不行",
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

  const prof = profile.data?.profile;

  return (
    <main>
      <h1>{t("social.title")}</h1>
      <p className="sub">{t("social.sub")}</p>
      {msg && <div className="alert info">{msg}</div>}

      {/* 关系图谱（列表式 + 倾向标注，非 Feed） */}
      <div className="card">
        <h2>{t("social.relations")}</h2>
        <State
          state={profile.state}
          error={profile.error ? mapErrorMessage(profile.error) : null}
          onRetry={profile.reload}
          empty={t("social.noData")}
        >
          {prof ? (
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              <span className="badge">对狗：{FAMILIAR_LABELS[prof.good_with_dogs ?? "UNKNOWN"] ?? "未知"}</span>
              <span className="badge">对猫：{FAMILIAR_LABELS[prof.good_with_cats ?? "UNKNOWN"] ?? "未知"}</span>
              <span className="badge">对孩子：{FAMILIAR_LABELS[prof.good_with_kids ?? "UNKNOWN"] ?? "未知"}</span>
              <span className="badge">对陌生人：{FAMILIAR_LABELS[prof.good_with_strangers ?? "UNKNOWN"] ?? "未知"}</span>
            </div>
          ) : (
            <p className="sub" style={{ margin: 0 }}>
              {t("social.noData")}
            </p>
          )}
        </State>
      </div>

      {/* 伙伴关系 */}
      <div className="card">
        <h2>宠物朋友</h2>
        <State
          state={friends.state}
          error={friends.error ? mapErrorMessage(friends.error) : null}
          onRetry={friends.reload}
          empty="还没有伙伴关系。"
        >
            {friends.data?.map((f) => (
              <li key={f.request_id}>
                <PersonChip
                  name={friendName(f.friend_pet_id)}
                  role={f.status === "ACTIVE" ? t("social.familiar") : f.status}
                />
              </li>
            ))}
        </State>
      </div>

      {/* 互动历史 */}
      <div className="card">
        <h2>{t("social.interactions")}</h2>
        <State
          state={events.state}
          error={events.error ? mapErrorMessage(events.error) : null}
          onRetry={events.reload}
          empty={t("social.noData")}
        >
          <div className="tl">
            {events.data?.events.slice(0, 8).map((e) => {
              const friendId = typeof e.payload["friend_pet_id"] === "string" ? String(e.payload["friend_pet_id"]) : "";
              const q = typeof e.payload["quality"] === "string" ? String(e.payload["quality"]) : "";
              const dur = e.payload["duration_minutes"];
              return (
                <InteractionCard
                  key={e.event_id}
                  title={
                    e.event_type === "social.interaction_logged"
                      ? `互动 · ${friendId ? friendName(friendId) : ""}`
                      : e.event_type === "social.friend_requested"
                        ? `认识新朋友 · ${friendId ? friendName(friendId) : ""}`
                        : t("social.block")
                  }
                  time={fmtTime(e.occurred_at)}
                  participants={friendId ? [friendName(friendId)] : undefined}
                  notes={dur ? `共同玩耍：${String(dur)} min` : undefined}
                  feedback={
                    q === "BAD"
                      ? `${t("social.conflict")}：有`
                      : q
                        ? `${t("social.conflict")}：${t("social.noConflict")}`
                        : undefined
                  }
                />
              );
            })}
          </div>
        </State>
      </div>

      {/* 记录互动 */}
      <div className="card">
        <h2>记录互动</h2>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <select value={friendPetId} onChange={(e) => setFriendPetId(e.target.value)} aria-label="伙伴宠物" style={{ maxWidth: 200 }}>
            <option value="">选择伙伴…</option>
            {pets.data
              ?.filter((p) => p.id !== petId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <select value={quality} onChange={(e) => setQuality(e.target.value)} aria-label="互动质量" style={{ maxWidth: 140 }}>
            <option value="GOOD">顺利</option>
            <option value="NEUTRAL">平静</option>
            <option value="TENSE">紧张</option>
            <option value="BAD">冲突</option>
            <option value="UNKNOWN">未知</option>
          </select>
          <input
            type="number"
            min={0}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            aria-label="时长（分钟）"
            style={{ width: 110 }}
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="备注（可选）"
            aria-label="备注"
            style={{ flex: 1, minWidth: 160 }}
          />
          <button className="btn primary" disabled={busy || !friendPetId} onClick={recordInteraction}>
            记录互动
          </button>
        </div>
        <p className="muted">安全：出现冲突或紧张时，双方 Owner 都会看到反馈；不会公开展示。</p>
      </div>

      <div className="row" style={{ marginTop: 8 }}>
        <Link href="/" className="btn">
          回到今日
        </Link>
      </div>
    </main>
  );
}
