"use client";

import { useState } from "react";
import { api, type Pet } from "@pli/api-client";
import { State } from "../../components/State";
import { useAsync } from "../../lib/useAsync";

interface AuditEntry {
  id: string;
  occurred_at: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  detail: Record<string, unknown> | null;
}

export default function AuditPage() {
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), []);
  const [petId, setPetId] = useState<string | null>(null);
  const audit = useAsync<AuditEntry[]>(
    () => (petId ? api.get<AuditEntry[]>(`/pets/${petId}/audit`) : Promise.resolve([])),
    [petId],
  );

  return (
    <main>
      <h1>审计日志</h1>
      <p className="sub">谁在什么时候、对什么资源做了什么（不可篡改记录）</p>

      <div className="card">
        <h2>选择宠物</h2>
        <State state={pets.state} error={pets.error} onRetry={pets.reload} empty="暂无宠物">
          <div className="row">
            {pets.data?.map((p) => (
              <button key={p.id} className={`btn ${petId === p.id ? "primary" : ""}`} onClick={() => setPetId(p.id)}>
                {p.name}
              </button>
            ))}
          </div>
        </State>
      </div>

      {petId && (
        <div className="card">
          <h2>审计记录</h2>
          <State state={audit.state} error={audit.error} onRetry={audit.reload} empty="该宠物暂无审计记录">
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>动作</th>
                  <th>资源</th>
                  <th>操作者</th>
                  <th>详情</th>
                </tr>
              </thead>
              <tbody>
                {audit.data?.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{new Date(a.occurred_at).toLocaleString("zh-CN")}</td>
                    <td>{a.action}</td>
                    <td className="mono">
                      {a.resource_type}
                      <br />
                      <span className="muted">{a.resource_id}</span>
                    </td>
                    <td className="mono">{a.actor_user_id?.slice(0, 8) ?? "匿名"}</td>
                    <td className="mono">
                      {a.detail ? JSON.stringify(a.detail).slice(0, 120) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </State>
        </div>
      )}
    </main>
  );
}