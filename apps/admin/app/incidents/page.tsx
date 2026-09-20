"use client";

import { api } from "@pli/api-client";
import { fmtTime } from "../../lib/format";
import { State } from "../../components/State";
import { useAsync } from "../../lib/useAsync";

/** ADM-009 Incidents — 事件 / 事故跟踪（/ops/incidents，真实接口）。 */
interface IncidentRow {
  incident_id: string;
  severity: string;
  title: string;
  status: string;
  created_at: string;
}

const SEVERITY_LABELS: Record<string, string> = {
  INFO: "提示",
  WARN: "警告",
  CRITICAL: "严重",
};

export default function IncidentsPage() {
  const incidents = useAsync<IncidentRow[]>(() => api.get<IncidentRow[]>("/ops/incidents"), []);

  return (
    <main>
      <h1>事件追踪</h1>
      <p className="sub">平台事件 / 事故跟踪（最近 50 条）</p>

      <div className="card">
        <h2>事故列表</h2>
        <State state={incidents.state} error={incidents.error} onRetry={incidents.reload} empty="暂无事故记录">
          <table>
            <thead>
              <tr>
                <th>严重度</th>
                <th>标题</th>
                <th>状态</th>
                <th>时间</th>
                <th>编号</th>
              </tr>
            </thead>
            <tbody>
              {incidents.data?.map((i) => (
                <tr key={i.incident_id}>
                  <td>
                    <span className={`badge ${i.severity === "CRITICAL" ? "CRITICAL" : i.severity === "WARN" ? "WARN" : "INFO"}`}>
                      {SEVERITY_LABELS[i.severity] ?? i.severity}
                    </span>
                  </td>
                  <td>{i.title}</td>
                  <td>
                    <span className={`badge ${i.status === "OPEN" ? "OPEN" : "CLOSED"}`}>{i.status}</span>
                  </td>
                  <td className="mono">{fmtTime(i.created_at)}</td>
                  <td className="mono">{i.incident_id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </State>
      </div>
    </main>
  );
}
