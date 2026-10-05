"use client";

import { fmtTime, type Async } from "../../../lib/hooks";
import type { PetDevice } from "./types";

interface DevicesPanelProps {
  devices: Async<PetDevice[]>;
}

function statusText(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "CONNECTED" || normalized === "ONLINE") return "在线";
  if (normalized === "OFFLINE") return "离线";
  if (normalized === "DEGRADED") return "连接不稳定";
  if (normalized === "PERMISSION_REQUIRED") return "需要授权";
  return "状态待确认";
}

/** OWN-013 Monitoring — 设备状态只说用户能理解且有事实依据的话。 */
export function DevicesPanel({ devices }: DevicesPanelProps) {
  const deviceList = devices.data ?? [];

  return (
    <section className="v5-utility-surface" data-testid="pli.monitoring.devices">
      <div className="v4-sec-head">
        <div>
          <h2>设备</h2>
          <p className="v4-sec-sub">这里只展示真实连接结果；没有设备或状态未知时不会伪装在线。</p>
        </div>
      </div>

      {devices.state === "loading" ? (
        <div className="v4-loading">正在读取设备状态…</div>
      ) : devices.state === "denied" ? (
        <div className="v4-calm">
          <div>
            <p className="v4-calm-title">没有读取设备状态的权限</p>
            <p className="v4-calm-body">获得相应权限后才能查看；这里不会把未知状态显示成未连接。</p>
          </div>
        </div>
      ) : devices.state === "error" ? (
        <div className="v4-calm">
          <div>
            <p className="v4-calm-title">暂时无法读取设备状态</p>
            <p className="v4-calm-body">可以稍后刷新；这不会影响手动记录和其他生活功能。</p>
          </div>
        </div>
      ) : deviceList.length === 0 ? (
        <div className="v4-calm">
          <div>
            <p className="v4-calm-title">还没有连接设备</p>
            <p className="v4-calm-body">连接支持的设备后，真实同步状态会显示在这里。没有设备时 PLI 仍可正常记录生活。</p>
          </div>
        </div>
      ) : (
        <div className="v5-device-list">
          {deviceList.map((device) => (
            <div className="v5-device-row" key={device.device_id}>
              <div className="v5-device-main">
                <strong>{device.display_name || "设备"}</strong>
                <span>
                  {device.last_sync ? `最近同步 ${fmtTime(device.last_sync)}` : "还没有可确认的同步时间"}
                </span>
              </div>
              <span className="v5-device-state">{statusText(device.status)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
