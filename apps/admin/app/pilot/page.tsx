"use client";

import { api, pilotApi } from "@pli/api-client";
import { State } from "../../components/State";
import { useAsync } from "../../lib/useAsync";

/** ADM-002 Pilot — 试点状态 / invited / registered / activated + orgs（/pilot/status · /pilot/orgs） */
export default function PilotPage() {
  const pilot = useAsync<{
    pilot_mode: boolean;
    pets_total: number;
    active_pets_3d: number;
    active_pets_7d: number;
    feedback_count: number;
    invited: number;
    registered: number;
    activated_owners: number;
    north_star: string;
    excludes: string[];
  }>(() => pilotApi.status(), []);
  const orgs = useAsync<
    Array<{ pilot_org_id: string; name: string; type: string; status: string }>
  >(() => api.get("/pilot/orgs"), []);

  return (
    <main>
      <h1>试点 Pilot</h1>
      <p className="sub">试点状态、注册 / 激活代理口径与试点机构</p>

      <div className="card">
        <h2>试点状态</h2>
        <State state={pilot.state} error={pilot.error} onRetry={pilot.reload} empty="暂无试点数据">
          <div className="row">
            <span className={`badge ${pilot.data?.pilot_mode ? "MONITOR" : "EMERGENCY"}`}>
              {pilot.data?.pilot_mode ? "邀请制 PILOT_MODE 已开启" : "PILOT_MODE 未开启（公开注册）"}
            </span>
            <span className="muted">北极星：{pilot.data?.north_star ?? "—"}</span>
          </div>
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>邀请码</th>
                <th>注册用户</th>
                <th>激活 Owner</th>
                <th>宠物总数(真实)</th>
                <th>3 日活跃</th>
                <th>7 日活跃</th>
                <th>反馈数</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{pilot.data?.invited ?? "—"}</td>
                <td>{pilot.data?.registered ?? "—"}</td>
                <td>{pilot.data?.activated_owners ?? "—"}</td>
                <td>{pilot.data?.pets_total ?? "—"}</td>
                <td>{pilot.data?.active_pets_3d ?? "—"}</td>
                <td>{pilot.data?.active_pets_7d ?? "—"}</td>
                <td>{pilot.data?.feedback_count ?? "—"}</td>
              </tr>
            </tbody>
          </table>
          <p className="muted">
            口径：/pilot/status。已排除 demo / internal 数据（exclude_demo=true / exclude_internal=true）；
            激活 Owner 为代理口径（真实宠物自建档起 ≥3 条有效事件）。
          </p>
        </State>
      </div>

      <div className="card">
        <h2>试点机构</h2>
        <State state={orgs.state} error={orgs.error} onRetry={orgs.reload} empty="暂无机构（W0 模板见 reports/pilot/W0_ORG_TEMPLATES.md）">
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {orgs.data?.map((o) => (
                <tr key={o.pilot_org_id}>
                  <td>{o.name}</td>
                  <td>{o.type}</td>
                  <td>{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </State>
      </div>
    </main>
  );
}
