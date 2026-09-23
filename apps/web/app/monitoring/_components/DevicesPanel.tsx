"use client";

import { DeviceStatus, type DeviceState } from "@pli/ui-kit";
import type { Async } from "../../../lib/hooks";
import { t } from "../../../lib/i18n";
import type { PetDevice } from "./types";

interface DevicesPanelProps {
  devices: Async<PetDevice[]>;
}

/** OWN-013 Monitoring — 设备状态卡片（未知即 PROTOTYPE，不伪装在线）。 */
export function DevicesPanel({ devices }: DevicesPanelProps) {
  const deviceList = devices.data ?? [];
  return (
    <div className="card">
      <h2>{t("monitoring.devices")}</h2>
      {deviceList.length === 0 ? (
        <div className="state">
          {t("monitoring.devicesOff")}
          <div style={{ marginTop: 8 }}>
            <span className="badge pli-tag--prototype">{t("monitoring.prototype")}</span>
          </div>
        </div>
      ) : (
        <ul className="tl">
          {deviceList.map((d) => (
            <li key={d.device_id}>
              <DeviceStatus
                name={d.display_name || d.provider}
                state={d.status as DeviceState}
                last_sync={d.last_sync ?? null}
                isPrototype={d.status === "unknown"}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
