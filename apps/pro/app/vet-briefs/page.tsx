"use client";

import Link from "next/link";
import { api, type HealthEventDetail, type Pet } from "@pli/api-client";
import { fmtTime, useAsync, useCurrentPet } from "../../lib/hooks";
import { mapErrorMessage } from "../../lib/errors";
import { State, TriageBadge } from "../../components/ui";

interface HealthEventRow {
  health_event_id: string;
  status: string;
  chief_complaint: string;
  latest_triage_level: string | null;
  opened_at: string;
  closed_at: string | null;
}

const NO_PET = "NO_PET_SELECTED";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "进行中",
  MONITORING: "观察中",
  CLOSED: "已关闭",
};

/** PRO-003 就诊摘要 Vet Brief 列表：
 *  API 限制——没有按 brief id 读取内容的已认证端点（/vet-briefs/shared/{token} 需要一次性
 *  分享 token），因此这里列出健康事件 + 各自的 brief 数量（来自 /health-events/{id} 详情），
 *  详情页按健康事件渲染摘要视图。 */
export default function VetBriefsPage() {
  const { petId } = useCurrentPet();
  const pet = useAsync<Pet | null>(
    () =>
      petId
        ? api.get<Pet>(`/pets/${petId}`)
        : Promise.reject(new Error(NO_PET)),
    [petId],
  );
  const healthEvents = useAsync<HealthEventRow[]>(
    () =>
      petId
        ? api.get<HealthEventRow[]>(`/pets/${petId}/health-events`)
        : Promise.reject(new Error(NO_PET)),
    [petId],
  );

  /** brief 数量：对最近 10 个健康事件取详情（vet_briefs: brief id 列表）。 */
  const details = useAsync<HealthEventDetail[]>(
    () =>
      healthEvents.data && healthEvents.data.length
        ? Promise.all(
            healthEvents.data
              .slice(0, 10)
              .map((h) => api.get<HealthEventDetail>(`/health-events/${h.health_event_id}`)),
          )
        : Promise.resolve([]),
    [healthEvents.data],
  );

  const briefCount = (healthEventId: string): number => {
    if (details.state !== "ready") return -1; // 尚未加载
    const d = (details.data ?? []).find((x) => x.health_event_id === healthEventId);
    return d ? d.vet_briefs.length : 0;
  };

  return (
    <main>
      <h1>就诊摘要 · Vet Brief</h1>
      <p className="sub">
        {pet.data ? `${pet.data.name} · ` : ""}按健康事件整理的就诊摘要；摘要为信息整理，不是兽医诊断。
      </p>

      <State
        state={healthEvents.state}
        error={healthEvents.error ? mapErrorMessage(healthEvents.error) : null}
        onRetry={healthEvents.reload}
        empty="暂无健康事件，也就暂无就诊摘要。"
      >
        <table className="pli-table">
          <thead>
            <tr>
              <th>主诉</th>
              <th>状态</th>
              <th>风险分级</th>
              <th>打开时间</th>
              <th>Vet Brief</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(healthEvents.data ?? []).map((h) => {
              const n = briefCount(h.health_event_id);
              return (
                <tr key={h.health_event_id}>
                  <td>{h.chief_complaint}</td>
                  <td><span className={`badge status-${h.status}`}>{STATUS_LABELS[h.status] ?? h.status}</span></td>
                  <td><TriageBadge level={h.latest_triage_level} /></td>
                  <td>{fmtTime(h.opened_at)}</td>
                  <td>
                    {n < 0 ? <span className="muted">…</span> : n > 0 ? <span className="badge">{n} 份</span> : <span className="muted">未生成</span>}
                  </td>
                  <td>
                    <Link href={`/vet-briefs/${h.health_event_id}`} className="btn" style={{ minHeight: 32, fontSize: 13 }}>
                      查看摘要视图
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </State>

      <p className="muted">
        说明：共享查看链接（仅 web 端）需要生成一次性分享 token；此页展示按健康事件整理的摘要视图。
      </p>
    </main>
  );
}
