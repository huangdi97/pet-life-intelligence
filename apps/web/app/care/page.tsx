"use client";

import Link from "next/link";
import { api, type Grant } from "@pli/api-client";
import { useState } from "react";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State } from "../../components/ui";

interface Handoff {
  handoff_id: string;
  caregiver_user_id: string;
  caregiver_label?: string;
  scope: string[];
  start_at: string;
  end_at: string | null;
  status: string;
  notes: string;
}

interface PetCareContext {
  household_id: string;
}

interface HouseholdMember {
  user_id: string;
  display_name: string;
  email: string;
  role: string;
  status: string;
}

const SCOPE_LABELS: Record<string, string> = {
  "daily:read": "查看日常记录",
  "daily:write": "记录日常照护",
  "medical:read": "查看健康记录",
  "medical:write": "记录健康信息",
  "card:read": "查看照护卡",
};

function careStatusLabel(status: string): string {
  if (status === "ACTIVE") return "生效中";
  if (status === "EXPIRED") return "已到期";
  if (status === "ENDED" || status === "REVOKED") return "已结束";
  if (status === "PENDING") return "待确认";
  return "已记录";
}

function memberRoleLabel(role: string): string {
  if (role === "OWNER") return "主人";
  if (role === "CO_OWNER") return "共同主人";
  if (role === "FAMILY") return "家庭成员";
  if (role === "CAREGIVER") return "照护人";
  return "成员";
}

/** Surfaces 5 + 7: Care Network / Handoff / Care Card (PLI-035..038, PLI-010/011). */
export default function CarePage() {
  const { petId } = useCurrentPet();
  const petContext = useAsync<PetCareContext>(
    () => (petId ? api.get<PetCareContext>(`/pets/${petId}`) : Promise.reject(new Error("no pet"))),
    [petId],
  );
  const householdId = petContext.data?.household_id ?? "";
  const members = useAsync<HouseholdMember[]>(
    () =>
      householdId
        ? api.get<HouseholdMember[]>(`/households/${householdId}/members`)
        : Promise.reject(new Error("no household")),
    [householdId],
  );
  const grants = useAsync<Grant[]>(
    () => (petId ? api.get<Grant[]>(`/pets/${petId}/grants`) : Promise.reject(new Error("no pet"))),
    [petId],
  );
  const handoffs = useAsync<Handoff[]>(
    () =>
      petId
        ? api.get<Handoff[]>(`/pets/${petId}/handoffs`)
        : Promise.reject(new Error("no pet")),
    [petId],
  );
  const [caregiver, setCaregiver] = useState("");
  const [hours, setHours] = useState("48");
  const [scopes, setScopes] = useState<string[]>(["daily:read", "daily:write"]);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<{ token_id: string; token: string; expires_at: string } | null>(null);

  const ALL_SCOPES = ["daily:read", "daily:write", "medical:read", "medical:write", "card:read"];

  async function createHandoff() {
    if (!petId || !caregiver.trim()) return;
    setError(null);
    try {
      await api.post(`/pets/${petId}/handoffs`, {
        caregiver_user_id: caregiver.trim(),
        scopes,
        end_at: new Date(Date.now() + Number(hours) * 3600_000).toISOString(),
        reason: "care handoff",
      });
      setCaregiver("");
      handoffs.reload();
      grants.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function endHandoff(id: string) {
    await api.post(`/handoffs/${id}/end`, {});
    handoffs.reload();
    grants.reload();
  }

  async function revokeGrant(id: string) {
    setError(null);
    try {
      await api.del(`/grants/${id}`);
      grants.reload();
      handoffs.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function issueCard() {
    if (!petId) return;
    setError(null);
    try {
      const r = await api.post<{ token_id: string; token: string; expires_at: string }>(
        `/pets/${petId}/care-cards`,
        { expires_in_hours: 72 },
      );
      setCard(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function revokeCard() {
    if (!card?.token_id) return;
    setError(null);
    try {
      await api.del(`/share-tokens/${card.token_id}`);
      setCard(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main className="v4-main v5-domain-page v5-utility-page">
      <div className="v4-topline v5-page-lede">
        <h1>照护网络</h1>
        <p className="sub">家庭成员、临时交接与照护卡。权限按人、用途与时间清楚管理。</p>
      </div>
      <ErrorNote message={error} />

      <section className="v5-utility-surface v5-utility-surface--soft">
        <h2>发起照护交接</h2>
        <p className="muted">
          仅主人或共同主人可操作；临时照护人只获得限时、限定范围的权限，到期自动失效，无法转授管理权限。
        </p>
        <div className="grid2">
          <label className="field">
            临时照护人
            <select value={caregiver} onChange={(e) => setCaregiver(e.target.value)}>
              <option value="">选择家庭成员</option>
              {(members.data ?? [])
                .filter((member) => member.status === "ACTIVE")
                .map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.display_name || member.email || "家庭成员"} · {memberRoleLabel(member.role)}
                  </option>
                ))}
            </select>
            {members.state === "error" ? <span className="v4-note">家庭成员暂时无法读取，请稍后重试。</span> : null}
          </label>
          <label className="field">
            有效时长（小时）
            <input type="number" min={1} value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
        </div>
        <fieldset style={{ border: "none", padding: 0 }}>
          <legend className="muted">授权范围：</legend>
          <div className="row">
            {ALL_SCOPES.map((s) => (
              <label key={s} className="muted" style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  type="checkbox"
                  style={{ width: "auto" }}
                  checked={scopes.includes(s)}
                  onChange={(e) =>
                    setScopes((old) =>
                      e.target.checked ? [...old, s] : old.filter((x) => x !== s),
                    )
                  }
                />
                {SCOPE_LABELS[s] ?? "限定权限"}
              </label>
            ))}
          </div>
        </fieldset>
        <button className="btn primary" onClick={createHandoff} disabled={!petId || !caregiver || scopes.length === 0}>
          创建交接
        </button>
      </section>

      <section className="v5-utility-surface">
        <h2>交接记录</h2>
        <State state={handoffs.state} error={handoffs.error} onRetry={handoffs.reload} empty="暂无交接。">
          <ul className="tl">
            {handoffs.data?.map((h) => (
              <li key={h.handoff_id}>
                <div className="tl-head">
                  <span className="tl-type">{h.caregiver_label || "临时照护人"}</span>
                  <span className="badge">{careStatusLabel(h.status)}</span>
                  <span className="badge">{h.scope.map((scope) => SCOPE_LABELS[scope] ?? "限定权限").join(" · ")}</span>
                  <span className="tl-time">至 {fmtTime(h.end_at)}</span>
                </div>
                {h.status === "ACTIVE" && (
                  <button className="btn danger" onClick={() => endHandoff(h.handoff_id)}>
                    提前结束
                  </button>
                )}
              </li>
            ))}
          </ul>
        </State>
      </section>

      <section className="v5-utility-surface v5-utility-surface--soft">
        <h2>生成照护卡</h2>
        <p className="muted">
          最小字段卡片：喂养/用药/行为禁忌/紧急联系人/首选医院（文字），不含完整医疗历史。
          链接可撤销、会过期、访问留审计。
        </p>
        <button className="btn primary" onClick={issueCard} disabled={!petId}>
          生成并获取链接
        </button>
        {card && (
          <div className="v4-calm" style={{ marginTop: 12 }}>
            <div>
              <p className="v4-calm-title">照护卡已生成 · 72 小时有效</p>
              <p className="v4-calm-body">
                分享给临时照护人即可查看最小必要信息；不会暴露完整医疗历史。
              </p>
              <div className="v4-linkrow">
                <Link
                  className="v4-action v4-action--primary"
                  href={`/share/care-card/${card.token}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  打开照护卡
                </Link>
                <button type="button" className="btn danger" onClick={revokeCard}>
                  撤销这个分享链接
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="v5-utility-surface">
        <h2>权限授予记录</h2>
        <State state={grants.state} error={grants.error} onRetry={grants.reload} empty="暂无授权记录。">
          <ul className="tl">
            {grants.data?.map((g) => (
              <li key={g.grant_id}>
                <div className="tl-head">
                  <span className="tl-type">{g.user_label || "已授权成员"}</span>
                  <span className={`badge ${g.status === "ACTIVE" ? "MONITOR" : "EMERGENCY"}`}>{careStatusLabel(g.status)}</span>
                  <span className="badge">{g.scopes.map((scope) => SCOPE_LABELS[scope] ?? "限定权限").join(" · ")}</span>
                  <span className="tl-time">{fmtTime(g.starts_at)} → {g.expires_at ? fmtTime(g.expires_at) : "无限期"}</span>
                </div>
                {g.status === "ACTIVE" && g.grant_id ? (
                  <button type="button" className="btn danger" onClick={() => revokeGrant(g.grant_id)}>
                    撤销权限
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </State>
      </section>
    </main>
  );
}
