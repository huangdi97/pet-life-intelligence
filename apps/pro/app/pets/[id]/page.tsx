"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type BehaviorEvent, type Grant, type LifeEvent, type Pet } from "@pli/api-client";
import { fmtDate, fmtTime, useAsync } from "../../../lib/hooks";
import { mapErrorMessage } from "../../../lib/errors";
import { ProvenanceBadge, State, TriageBadge } from "../../../components/ui";

interface HealthEventRow {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
  opened_at: string;
  closed_at: string | null;
}

interface TodayResp {
  pet: { id: string; name: string; species: string };
  date: string;
  event_counts: Record<string, number>;
  events: LifeEvent[];
}

const NO_PET = "NO_PET_SELECTED";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "进行中",
  MONITORING: "观察中",
  CLOSED: "已关闭",
};

/** PRO-002 Pet Brief（专业版档案）：不是字段表——
 *  Identity / Health Overview / Behavior Overview / Care Network / Baseline /
 *  Evidence 预览 / Timeline 预览 分区组织；风险只来自后端分级，不产生诊断。 */
export default function PetBriefPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const reject = () => Promise.reject(new Error(NO_PET));

  const pet = useAsync<Pet>(() => (id ? api.get<Pet>(`/pets/${id}`) : reject()), [id]);
  const today = useAsync<TodayResp>(() => (id ? api.get<TodayResp>(`/pets/${id}/today`) : reject()), [id]);
  const healthEvents = useAsync<HealthEventRow[]>(
    () => (id ? api.get<HealthEventRow[]>(`/pets/${id}/health-events`) : reject()),
    [id],
  );
  const behaviorEvents = useAsync<BehaviorEvent[]>(
    () => (id ? api.get<BehaviorEvent[]>(`/pets/${id}/behavior-events`) : reject()),
    [id],
  );
  const grants = useAsync<Grant[]>(
    () => (id ? api.get<Grant[]>(`/pets/${id}/grants`) : reject()),
    [id],
  );

  if (!id || pet.state === "denied") {
    return (
      <main>
        <h1>患者档案 · Pet Brief</h1>
        <div className="state denied">没有查看此内容的权限。如需访问，请联系宠物主人授权。</div>
      </main>
    );
  }

  const p = pet.data;
  const heRows = healthEvents.data ?? [];
  const beRows = behaviorEvents.data ?? [];
  const todayEvents = today.data?.events ?? [];
  const evidenceCount =
    beRows.reduce((n, b) => n + (b.artifact_ids ?? []).length, 0) +
    todayEvents.reduce((n, e) => n + (e.artifact_ids ?? []).length, 0);

  return (
    <main>
      <h1>{p?.name ?? "患者档案 · Pet Brief"}</h1>
      <p className="sub">
        {p ? `${p.breed || p.species} · ${p.birth_date ? `出生 ${fmtDate(p.birth_date)}` : "出生日期未填写"}` : "专业版患者档案"}
      </p>

      <div className="card">
        <h2>基本信息 · Identity</h2>
        <State state={pet.state} error={pet.error ? mapErrorMessage(pet.error) : null} onRetry={pet.reload} empty="—">
          <div className="row" style={{ gap: 6 }}>
            <span className="badge">种类：{p?.species}</span>
            <span className="badge">品种：{p?.breed || "—"}</span>
            <span className="badge">性别：{p?.sex}</span>
            <span className="badge">绝育：{p?.neutered == null ? "—" : p.neutered ? "是" : "否"}</span>
            <span className="badge">时区：{p?.timezone}</span>
          </div>
        </State>
      </div>

      <div className="card">
        <h2>健康概览 · Health Overview</h2>
        <p className="sub" style={{ margin: "0 0 8px" }}>
          今日（{today.data?.date ?? "—"}）：
          {Object.entries(today.data?.event_counts ?? {}).map(([k, n]) => `${k} × ${n}`).join(" · ") || "今天还没有记录"}
        </p>
        <State
          state={healthEvents.state}
          error={healthEvents.error ? mapErrorMessage(healthEvents.error) : null}
          onRetry={healthEvents.reload}
          empty="暂无健康事件。"
        >
          <table className="pli-table">
            <thead>
              <tr>
                <th>主诉</th>
                <th>状态</th>
                <th>风险分级</th>
                <th>打开时间</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {heRows.slice(0, 8).map((h) => (
                <tr key={h.health_event_id}>
                  <td>{h.chief_complaint}</td>
                  <td><span className={`badge status-${h.status}`}>{STATUS_LABELS[h.status] ?? h.status}</span></td>
                  <td><TriageBadge level={h.latest_triage_level} /></td>
                  <td>{fmtTime(h.opened_at)}</td>
                  <td>
                    <Link href={`/vet-briefs/${h.health_event_id}`} className="btn" style={{ minHeight: 32, fontSize: 13 }}>
                      就诊摘要
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </State>
        <div className="row" style={{ marginTop: 10 }}>
          <Link href={`/pets/${id}/outcome`} className="btn primary">
            记录结局 · Outcome
          </Link>
          <Link href={`/pets/${id}/timeline`} className="btn">
            完整时间线
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>行为概览 · Behavior Overview</h2>
        <State
          state={behaviorEvents.state}
          error={behaviorEvents.error ? mapErrorMessage(behaviorEvents.error) : null}
          onRetry={behaviorEvents.reload}
          empty="暂无行为记录。"
        >
          {beRows.slice(0, 3).map((b) => (
            <div key={b.behavior_event_id} style={{ marginBottom: 10 }}>
              <div className="row" style={{ gap: 6 }}>
                <span className="badge">{fmtTime(b.occurred_at)}</span>
                {b.intensity && <span className="badge">强度 {b.intensity}</span>}
              </div>
              <div className="abc">
                <div className="abc-col">
                  <div className="abc-head">发生前 Antecedent</div>
                  <div>{b.antecedent || "—"}</div>
                </div>
                <div className="abc-col">
                  <div className="abc-head">行为 Behavior</div>
                  <div>{b.behavior}</div>
                </div>
                <div className="abc-col">
                  <div className="abc-head">之后 Consequence</div>
                  <div>{b.consequence || "—"}</div>
                </div>
              </div>
            </div>
          ))}
          <div className="row" style={{ marginTop: 8 }}>
            <Link href={`/pets/${id}/timeline`} className="btn">
              查看全部行为时间线
            </Link>
          </div>
        </State>
      </div>

      <div className="card">
        <h2>照护网络 · Care Network</h2>
        <p className="sub" style={{ margin: "0 0 8px" }}>
          主人对其他用户 / 专业用户的授权记录（来源 / 范围 / 状态）。
        </p>
        <State
          state={grants.state}
          error={grants.error ? mapErrorMessage(grants.error) : null}
          onRetry={grants.reload}
          empty="暂无授权记录。"
        >
          <table className="pli-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>范围 scopes</th>
                <th>原因</th>
                <th>来源</th>
                <th>状态</th>
                <th>到期</th>
              </tr>
            </thead>
            <tbody>
              {(grants.data ?? []).map((g) => (
                <tr key={g.grant_id}>
                  <td>{g.user_id.slice(0, 8)}…</td>
                  <td>{g.scopes.join("、") || "—"}</td>
                  <td>{g.reason || "—"}</td>
                  <td><span className="badge">{g.source}</span></td>
                  <td><span className={`badge status-${g.status}`}>{g.status}</span></td>
                  <td>{g.expires_at ? fmtDate(g.expires_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </State>
      </div>

      <div className="card">
        <h2>基线 · Baseline</h2>
        {p?.weight_note ? (
          <div className="row" style={{ gap: 6 }}>
            <span className="badge">体重备注：{p.weight_note}</span>
          </div>
        ) : (
          <p className="muted">暂无基线记录（基线能力未开放，仅显示体重备注）。</p>
        )}
      </div>

      <div className="card">
        <h2>证据 · Evidence 预览</h2>
        {evidenceCount > 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            证据：{evidenceCount} 个附件（媒体 / 观察）。完整证据在时间线中按条目查看。
          </p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>暂无证据附件。</p>
        )}
      </div>

      <div className="card">
        <h2>时间线 · Timeline 预览</h2>
        <State
          state={today.state}
          error={today.error ? mapErrorMessage(today.error) : null}
          onRetry={today.reload}
          empty="今天还没有记录。"
        >
          <ul className="tl">
            {todayEvents.slice(0, 8).map((e) => (
              <li key={e.event_id} className={e.provenance_level.startsWith("AI") ? "tl-ai" : ""}>
                <div className="tl-head">
                  <span className="tl-type">{e.event_type}</span>
                  <ProvenanceBadge level={e.provenance_level} />
                  <span className="tl-time">{fmtTime(e.occurred_at)}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="row" style={{ marginTop: 8 }}>
            <Link href={`/pets/${id}/timeline`} className="btn">
              查看完整时间线
            </Link>
          </div>
        </State>
      </div>
    </main>
  );
}
