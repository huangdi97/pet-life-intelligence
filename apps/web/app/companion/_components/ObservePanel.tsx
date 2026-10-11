"use client";

import type { LifeEvent } from "@pli/api-client";
import { State } from "../../../components/ui";
import { fmtTime, type Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";
import type { DeviceInfo } from "./types";

interface ObservePanelProps {
  recent: Async<{ events: LifeEvent[] }>;
  devices: Async<DeviceInfo[]>;
}

/** OWN-014 Companion — Observe 层：最近活动 + 设备接入状态；仅呈现可确认的事实。 */
export function ObservePanel({ recent, devices }: ObservePanelProps) {
  const lastSeen = recent.data?.events?.[0];
  return (
    <div className="card">
      {/* Observe 层：宠物什么都不用理解 */}
      <h2>{t("companion.layers.observe")}</h2>
      <State
        state={recent.state}
        error={recent.error ? mapErrorMessage(recent.error) : null}
        onRetry={recent.reload}
        empty="还没有最近活动。"
      >
        {lastSeen ? (
          <p className="sub" style={{ margin: 0 }}>
            {fmtTime(lastSeen.occurred_at)} · {lastSeen.event_type}
          </p>
        ) : (
          <p className="sub" style={{ margin: 0 }}>
            还没有最近活动。
          </p>
        )}
      </State>
      <div className="row" style={{ marginTop: 10, flexWrap: "wrap", gap: 8 }}>
        {devices.state === "loading" ? (
          <span className="badge">正在读取设备状态</span>
        ) : devices.state === "error" || devices.state === "denied" ? (
          <span className="badge">{devices.state === "denied" ? "没有读取设备状态的权限" : "设备状态暂时没有加载成功"}</span>
        ) : (devices.data ?? []).length === 0 ? (
          <span className="badge">尚未连接设备</span>
        ) : (
          (devices.data ?? []).map((d) => (
            <span key={d.device_id} className="badge">
              {d.display_name || "设备"}：{deviceStateLabel(d.status)}
            </span>
          ))
        )}
      </div>
      <div className="state" style={{ marginTop: 12 }} aria-label={t("companion.liveView")}>
        没有可确认的实时来源时，这里不会显示成实时画面。
      </div>
    </div>
  );
}


function deviceStateLabel(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === "CONNECTED" || normalized === "ONLINE") return "在线";
  if (normalized === "OFFLINE") return "离线";
  if (normalized === "DEGRADED") return "连接不稳定";
  if (normalized === "PERMISSION_REQUIRED") return "需要授权";
  return "状态待确认";
}
