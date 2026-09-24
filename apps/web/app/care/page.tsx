"use client";

import { api, API_URL, type Grant, type HouseholdMemberRow } from "@pli/api-client";
import { useState } from "react";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { ErrorNote, State } from "../../components/ui";

interface Handoff {
  handoff_id: string;
  caregiver_user_id: string;
  scope: string[];
  start_at: string;
  end_at: string | null;
  status: string;
  notes: string;
}

/** Surfaces 5 + 7: Care Network / Handoff / Care Card (PLI-035..038, PLI-010/011). */
export default function CarePage() {
  const { petId } = useCurrentPet();
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
  const [card, setCard] = useState<{ token: string; expires_at: string } | null>(null);

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

  async function issueCard() {
    if (!petId) return;
    setError(null);
    try {
      const r = await api.post<{ token: string; expires_at: string }>(
        `/pets/${petId}/care-cards`,
        { expires_in_hours: 72 },
      );
      setCard(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <main>
      <h1>照护网络</h1>
      <p className="sub">家庭成员、临时交接与 Care Card（PLI-035/036/037/038）。</p>
      <ErrorNote message={error} />

      <div className="card">
        <h2>发起照护交接 Care Handoff</h2>
        <p className="muted">
          仅 Owner/Co-owner 可操作；被交接人获得限时、限定范围的权限，到期自动失效，manage 权限不可授予。
        </p>
        <div className="grid2">
          <label className="field">
            临时照护人 User ID
            <input value={caregiver} onChange={(e) => setCaregiver(e.target.value)} placeholder="uuid" />
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
                {s}
              </label>
            ))}
          </div>
        </fieldset>
        <button className="btn primary" onClick={createHandoff} disabled={!petId}>
          创建交接
        </button>
      </div>

      <div className="card">
        <h2>交接记录</h2>
        <State state={handoffs.state} error={handoffs.error} onRetry={handoffs.reload} empty="暂无交接。">
          <ul className="tl">
            {handoffs.data?.map((h) => (
              <li key={h.handoff_id}>
                <div className="tl-head">
                  <span className="tl-type">→ {h.caregiver_user_id.slice(0, 8)}…</span>
                  <span className="badge">{h.status}</span>
                  <span className="badge">{h.scope.join(", ")}</span>
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
      </div>

      <div className="card">
        <h2>生成 Care Card</h2>
        <p className="muted">
          最小字段卡片：喂养/用药/行为禁忌/紧急联系人/首选医院（文字），不含完整医疗历史。
          链接可撤销、会过期、访问留审计。
        </p>
        <button className="btn primary" onClick={issueCard} disabled={!petId}>
          生成并获取链接
        </button>
        {card && (
          <div className="alert info" style={{ marginTop: 10 }}>
            分享链接（72h 有效）：<code>/care-card/{card.token}</code>
            <br />
            <span className="muted">在浏览器打开 {`${API_URL}/api/v1/care-card/${card.token}`} 查看效果</span>
          </div>
        )}
      </div>

      <div className="card">
        <h2>权限授予记录（Grants）</h2>
        <State state={grants.state} error={grants.error} onRetry={grants.reload} empty="暂无授权记录。">
          <ul className="tl">
            {grants.data?.map((g) => (
              <li key={g.grant_id}>
                <div className="tl-head">
                  <span className="tl-type">{g.user_id.slice(0, 8)}…</span>
                  <span className={`badge ${g.status === "ACTIVE" ? "MONITOR" : "EMERGENCY"}`}>{g.status}</span>
                  <span className="badge">{g.scopes.join(", ")}</span>
                  <span className="tl-time">{fmtTime(g.starts_at)} → {g.expires_at ? fmtTime(g.expires_at) : "无限期"}</span>
                </div>
              </li>
            ))}
          </ul>
        </State>
      </div>
    </main>
  );
}
