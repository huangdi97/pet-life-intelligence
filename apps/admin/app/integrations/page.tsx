"use client";

import { api } from "@pli/api-client";
import { State } from "../../components/State";
import { useAsync } from "../../lib/useAsync";

/** ADM（Stage H IA）Integrations — 外部集成能力与其运行模式（/capabilities，真实接口）。 */
interface Capability {
  capability: string;
  provider: string;
  mode: string;
  status: string;
  feature_flag: string;
}

export default function IntegrationsPage() {
  const caps = useAsync<Capability[]>(() => api.get<Capability[]>("/capabilities"), []);

  return (
    <main>
      <h1>集成</h1>
      <p className="sub">外部集成能力与其运行模式（沙箱 / 真实 / 禁用）</p>

      <div className="card">
        <h2>集成能力注册表</h2>
        <State state={caps.state} error={caps.error} onRetry={caps.reload} empty="暂无能力注册">
          <table>
            <thead>
              <tr>
                <th>能力</th>
                <th>Provider</th>
                <th>模式</th>
                <th>状态</th>
                <th>关联开关</th>
              </tr>
            </thead>
            <tbody>
              {caps.data?.map((c) => (
                <tr key={`${c.capability}-${c.provider}`}>
                  <td className="mono">{c.capability}</td>
                  <td className="mono">{c.provider}</td>
                  <td>{c.mode}</td>
                  <td>
                    <span className={`badge ${c.status === "ACTIVE" || c.status === "SANDBOX_READY" ? "on" : "off"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="mono">{c.feature_flag || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </State>
      </div>

      <div className="card">
        <h2>说明</h2>
        <p className="muted">
          SANDBOX = 沙箱可用（受 Feature Flag 控制）；DISABLED / EXTERNAL_BLOCKED = 未接入真实厂商。
          管理员只读查看；不在此处伪造“真实已接入”。同一注册表也收录在“功能开关”页。
        </p>
      </div>
    </main>
  );
}
