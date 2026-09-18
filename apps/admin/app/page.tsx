"use client";

import { api, pilotApi } from "@pli/api-client";
import { State } from "../components/State";
import { useAsync } from "../lib/useAsync";

interface OpsStatus {
  service: string;
  time: string;
  counts: Record<string, number>;
  rule_engine?: { version?: string; rules?: number };
}

export default function AdminHome() {
  const status = useAsync<OpsStatus>(() => api.get<OpsStatus>("/ops/status"), []);
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
  const health = useAsync<Record<string, unknown>>(() => api.get("/ready"), []);

  return (
    <main>
      <h1>运营概览</h1>
      <p className="sub">系统状态、数据规模、规则引擎与能力状态</p>

      <div className="card">
        <h2>服务状态</h2>
        <State state={health.state} error={health.error} onRetry={health.reload}>
          <div className="row">
            <span className="badge on">API 可达</span>
            {status.data?.rule_engine && (
              <span className="badge">
                规则引擎 v{status.data.rule_engine.version ?? "?"} · {status.data.rule_engine.rules ?? "?"} 条规则
              </span>
            )}
          </div>
        </State>
      </div>

      <div className="card">
        <h2>数据规模</h2>
        <State state={status.state} error={status.error} onRetry={status.reload} empty="暂无数据">
          <table>
            <thead>
              <tr>
                <th>宠物档案</th>
                <th>生命事件</th>
                <th>未关闭事件</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{status.data?.counts.pets ?? "—"}</td>
                <td>{status.data?.counts.life_events ?? "—"}</td>
                <td>{status.data?.counts.open_incidents ?? "—"}</td>
              </tr>
            </tbody>
          </table>
          <p className="muted">更新时间：{status.data?.time ?? "—"}</p>
        </State>
      </div>

      <div className="card">
        <h2>试点 Pilot 状态</h2>
        <State state={pilot.state} error={pilot.error} onRetry={pilot.reload} empty="暂无数据">
          <div className="row">
            <span className={`badge ${pilot.data?.pilot_mode ? "MONITOR" : "EMERGENCY"}`}>
              {pilot.data?.pilot_mode ? "邀请制 PILOT_MODE 已开启" : "PILOT_MODE 未开启（公开注册）"}
            </span>
            <span className="muted">北极星：{pilot.data?.north_star ?? "—"}</span>
          </div>
          <table>
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
          <h3>试点机构</h3>
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
        </State>
      </div>

      <div className="card">
        <h2>管理权限边界</h2>
        <p className="muted">
          管理员可以：查看审计、管理 Feature Flags、查看能力注册表、查看授权的就诊摘要。
          <br />
          管理员不能：直接修改用户医疗事件、修改安全规则、篡改审计日志。
        </p>
      </div>
    </main>
  );
}