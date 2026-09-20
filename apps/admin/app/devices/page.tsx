"use client";

import { useState } from "react";
import { api, type Pet } from "@pli/api-client";
import { State } from "../../components/State";
import { useAsync } from "../../lib/useAsync";

/**
 * ADM-007 Devices — 设备 registry / 数据质量 / source 审计（Admin 视角）。
 * 管理端全局设备接口尚未接入；按宠物查看走真实接口
 * /pets/{id}/devices 与 /pets/{id}/data-quality。
 */
interface PetDeviceRow {
  device_id: string;
  provider: string;
  display_name: string;
  status: string;
}

interface DataQuality {
  pet_id: string;
  score: number;
  checks: Record<string, boolean>;
  event_count: number;
}

const CHECK_LABELS: Record<string, string> = {
  birth_date: "出生日期",
  breed: "品种",
  weight_note: "体重备注",
  avatar: "头像",
};

export default function AdminDevicesPage() {
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), []);
  const [petId, setPetId] = useState<string | null>(null);
  const devices = useAsync<PetDeviceRow[]>(
    () => (petId ? api.get<PetDeviceRow[]>(`/pets/${petId}/devices`) : Promise.resolve([])),
    [petId],
  );
  const quality = useAsync<DataQuality>(
    () =>
      petId
        ? api.get<DataQuality>(`/pets/${petId}/data-quality`)
        : Promise.reject(new Error("no pet selected")),
    [petId],
  );

  return (
    <main>
      <h1>设备</h1>
      <p className="sub">设备 registry 与数据质量（管理视角；全局设备列表接口尚未接入）</p>

      <div className="card">
        <h2>选择宠物</h2>
        <State state={pets.state} error={pets.error} onRetry={pets.reload} empty="暂无可访问的宠物档案">
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
        <>
          <div className="card">
            <h2>设备 registry</h2>
            <State state={devices.state} error={devices.error} onRetry={devices.reload} empty="该宠物暂无绑定设备">
              <table>
                <thead>
                  <tr>
                    <th>名称</th>
                    <th>Provider</th>
                    <th>状态</th>
                    <th>编号</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.data?.map((d) => (
                    <tr key={d.device_id}>
                      <td>{d.display_name}</td>
                      <td className="mono">{d.provider}</td>
                      <td>{d.status}</td>
                      <td className="mono">{d.device_id.slice(0, 8)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </State>
          </div>

          <div className="card">
            <h2>数据质量</h2>
            <State state={quality.state} error={quality.error} onRetry={quality.reload} empty="暂无数据质量结果">
              <div className="row">
                <span className="badge">
                  完整度 {quality.data ? Math.round(quality.data.score * 100) : "—"}%
                </span>
                <span className="muted">生命事件数：{quality.data?.event_count ?? "—"}</span>
              </div>
              <table style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>检查项</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(quality.data?.checks ?? {}).map(([k, v]) => (
                    <tr key={k}>
                      <td>{CHECK_LABELS[k] ?? k}</td>
                      <td>
                        <span className={`badge ${v ? "on" : "off"}`}>{v ? "齐全" : "缺失"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </State>
          </div>
        </>
      )}

      <div className="card">
        <h2>全局设备 registry</h2>
        <div className="state">
          能力未开放
          <br />
          <span className="muted">跨宠物的全局设备与 source 审计接口尚未接入，此页暂不展示数据。</span>
        </div>
      </div>
    </main>
  );
}
