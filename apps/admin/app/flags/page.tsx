"use client";

import { api } from "@pli/api-client";
import { State } from "../../components/State";
import { useAsync } from "../../lib/useAsync";

/**
 * ADM-010 Feature Flags — flags + capabilities（原 /capabilities 折叠至此）。
 * flag 列表来自 /ops/feature-flags（GET，真实接口）。后端暂未提供
 * flag 切换（POST）接口，因此本页只读并如实说明，不渲染会失败的切换按钮。
 */
interface Flag {
  key: string;
  enabled: boolean;
  note: string;
}

interface Capability {
  capability: string;
  provider: string;
  mode: string;
  status: string;
  feature_flag: string;
}

export default function FlagsPage() {
  const flags = useAsync<Flag[]>(() => api.get<Flag[]>("/ops/feature-flags"), []);
  const caps = useAsync<Capability[]>(() => api.get<Capability[]>("/capabilities"), []);

  return (
    <main>
      <h1>功能开关</h1>
      <p className="sub">按环境控制能力开关；生产默认 safe by default（含能力注册表）</p>

      <div className="card">
        <h2>已知能力开关</h2>
        <State state={flags.state} error={flags.error} onRetry={flags.reload} empty="暂无任何 flag">
          <table>
            <thead>
              <tr>
                <th>开关</th>
                <th>状态</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {flags.data?.map((f) => (
                <tr key={f.key}>
                  <td className="mono">{f.key}</td>
                  <td>
                    <span className={`badge ${f.enabled ? "on" : "off"}`}>{f.enabled ? "开启" : "关闭"}</span>
                  </td>
                  <td className="muted">{f.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            切换能力未开放：后端暂未提供 flag 切换接口，当前只读展示，不伪造开关状态。
          </p>
        </State>
      </div>

      <div className="card">
        <h2>能力注册表（Capabilities）</h2>
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
          <p className="muted">
            SANDBOX = 沙箱可用；DISABLED / EXTERNAL_BLOCKED = 未接入真实厂商。管理员只读查看。
          </p>
        </State>
      </div>
    </main>
  );
}
