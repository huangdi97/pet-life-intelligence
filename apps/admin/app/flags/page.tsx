"use client";

import { useState } from "react";
import { api } from "@pli/api-client";
import { State } from "../../components/State";
import { useAsync } from "../../lib/useAsync";

interface Flag {
  key: string;
  enabled: boolean;
  note: string;
}

const PRESETS = [
  { key: "ai", note: "AI 能力总开关" },
  { key: "agent", note: "宠物助手" },
  { key: "device.fake", note: "设备（沙箱）" },
  { key: "feature.vet_booking", note: "外部预约（未接入）" },
  { key: "feature.insurance", note: "保险（未接入）" },
];

export default function FlagsPage() {
  const flags = useAsync<Flag[]>(() => api.get<Flag[]>("/ops/feature-flags"), []);
  const [flash, setFlash] = useState<string | null>(null);

  async function toggle(f: Flag) {
    try {
      await api.post("/ops/feature-flags", { key: f.key, enabled: !f.enabled, note: f.note });
      setFlash(`已更新 ${f.key}`);
      flags.reload();
      setTimeout(() => setFlash(null), 2000);
    } catch (e) {
      setFlash(`失败：${e instanceof Error ? e.message : "未知"}`);
      setTimeout(() => setFlash(null), 2000);
    }
  }

  const known = new Map((flags.data ?? []).map((f) => [f.key, f]));

  return (
    <main>
      <h1>Feature Flags</h1>
      <p className="sub">按环境控制能力开关；生产默认 safe by default</p>
      {flash && <div className="card" style={{ background: "#e8f1f2", color: "#3e7c83" }}>{flash}</div>}

      <div className="card">
        <h2>已知能力开关</h2>
        <State state={flags.state} error={flags.error} onRetry={flags.reload} empty="暂无任何 flag">
          <table>
            <thead>
              <tr><th>Key</th><th>状态</th><th>备注</th><th>操作</th></tr>
            </thead>
            <tbody>
              {PRESETS.map((p) => {
                const cur = known.get(p.key);
                const enabled = cur?.enabled ?? false;
                return (
                  <tr key={p.key}>
                    <td className="mono">{p.key}</td>
                    <td><span className={`badge ${enabled ? "on" : "off"}`}>{enabled ? "开启" : "关闭"}</span></td>
                    <td className="muted">{cur?.note || p.note}</td>
                    <td>
                      <button className="btn" onClick={() => toggle({ key: p.key, enabled, note: cur?.note ?? p.note })}>
                        切换
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </State>
      </div>

      <div className="card">
        <h2>已注册的其他 flag</h2>
        <State state={flags.state} error={flags.error} onRetry={flags.reload} empty="无">
          <table>
            <thead><tr><th>Key</th><th>状态</th><th>备注</th><th>操作</th></tr></thead>
            <tbody>
              {flags.data
                ?.filter((f) => !PRESETS.some((p) => p.key === f.key))
                .map((f) => (
                  <tr key={f.key}>
                    <td className="mono">{f.key}</td>
                    <td><span className={`badge ${f.enabled ? "on" : "off"}`}>{f.enabled ? "开启" : "关闭"}</span></td>
                    <td className="muted">{f.note}</td>
                    <td><button className="btn" onClick={() => toggle(f)}>切换</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </State>
      </div>
    </main>
  );
}