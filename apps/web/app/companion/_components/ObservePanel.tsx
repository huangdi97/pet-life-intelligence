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

/** OWN-014 Companion — Observe 层：最近活动 + 设备接入状态 + 原型 Live View。 */
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
        {(devices.data ?? []).length === 0 ? (
          <span className="badge pli-tag--prototype">设备接入暂未开放</span>
        ) : (
          (devices.data ?? []).map((d) => (
            <span key={d.device_id} className="badge">
              {d.display_name || d.provider}：{d.status}
            </span>
          ))
        )}
      </div>
      <div
        className="state"
        style={{ marginTop: 12, minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center" }}
        role="img"
        aria-label={t("companion.liveView")}
      >
        [ {t("companion.liveView")} · PROTOTYPE ]
      </div>
    </div>
  );
}
