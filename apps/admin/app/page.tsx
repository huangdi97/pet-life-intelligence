"use client";

import Link from "next/link";
import { api, pilotApi } from "@pli/api-client";
import { State } from "../components/State";
import { useAsync } from "../lib/useAsync";

interface OpsStatus {
  service: string;
  time: string;
  counts: Record<string, number>;
  rule_engine?: { version?: string; rules?: number };
}

/** ADM-001 Overview — 平台总览（实时卡 + 试点摘要；完整试点页在 /pilot） */
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
  const health = useAsync<Record<string, unknown>>(() => api.get("/ready"), []);

  return (
    <main>
      <h1>运营概览</h1>
      <p className="sub">系统状态、数据规模与试点摘要（完整试点数据见试点页）</p>

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
        <h2>试点 Pilot 摘要</h2>
        <State state={pilot.state} error={pilot.error} onRetry={pilot.reload} empty="暂无试点数据">
          <div className="row">
            <span className={`badge ${pilot.data?.pilot_mode ? "MONITOR" : "EMERGENCY"}`}>
              {pilot.data?.pilot_mode ? "邀请制 PILOT_MODE 已开启" : "PILOT_MODE 未开启（公开注册）"}
            </span>
            <span className="muted">
              注册 {pilot.data?.registered ?? "—"} · 激活 Owner {pilot.data?.activated_owners ?? "—"} · 3 日活跃{" "}
              {pilot.data?.active_pets_3d ?? "—"} · 7 日活跃 {pilot.data?.active_pets_7d ?? "—"}
            </span>
          </div>
          <p className="muted">北极星：{pilot.data?.north_star ?? "—"}</p>
          <div className="row" style={{ marginTop: 10 }}>
            <Link className="btn primary" href="/pilot">
              查看完整试点数据
            </Link>
          </div>
        </State>
      </div>

      <div className="card">
        <h2>管理权限边界</h2>
        <p className="muted">
          管理员可以：查看审计、管理 Feature Flags、查看能力注册表、查看授权的就诊摘要。
          <br />
          管理员不能：直接修改用户医疗事件、修改安全规则、篡改审计日志。
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <Link className="btn" href="/vet-briefs">
            就诊摘要查看（专业向）
          </Link>
        </div>
      </div>
    </main>
  );
}
