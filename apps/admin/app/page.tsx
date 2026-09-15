"use client";

import { api } from "@pli/api-client";
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