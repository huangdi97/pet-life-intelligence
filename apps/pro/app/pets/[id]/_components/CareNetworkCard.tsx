"use client";

import type { Grant } from "@pli/api-client";
import { fmtDate, type Async } from "../../../../lib/hooks";
import { mapErrorMessage } from "../../../../lib/errors";
import { State } from "../../../../components/ui";

export function CareNetworkCard({ grants }: { grants: Async<Grant[]> }) {
  return (
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
  );
}
