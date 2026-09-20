import { cx } from "../lib/cx";
import { formatDateTime } from "../lib/format";

export type DeviceState = "connected" | "offline" | "degraded" | "needs_review" | "unknown";

const DEVICE_META: Record<DeviceState, { label: string }> = {
  connected: { label: "已连接" },
  offline: { label: "离线" },
  degraded: { label: "数据降级" },
  needs_review: { label: "需人工确认" },
  unknown: { label: "状态未知" },
};

function stateMeta(state: DeviceState): { label: string } {
  return DEVICE_META[state] ?? DEVICE_META.unknown;
}

/** Device status row: state → Chinese label + dot color. Demo/prototype
 *  devices show a "DEMO" tag when flagged (isPrototype). */
export function DeviceStatus({
  name,
  state,
  last_sync,
  petName,
  dataQuality,
  isPrototype = false,
  className,
}: {
  name: string;
  state: DeviceState;
  last_sync?: string | null;
  petName?: string | null;
  dataQuality?: string | null;
  isPrototype?: boolean;
  className?: string;
}) {
  const meta = stateMeta(state);
  return (
    <div className={cx("pli-device", className)}>
      <span className={cx("pli-device-dot", `pli-device-dot--${state}`)} aria-hidden="true" />
      <div className="pli-device-body">
        <div className="pli-device-head">
          <span className="pli-device-name">{name}</span>
          <span className={cx("pli-device-state", `pli-device-state--${state}`)}>
            {meta.label}
          </span>
          {isPrototype ? <span className="pli-tag pli-tag--demo">DEMO</span> : null}
        </div>
        {petName || last_sync || dataQuality ? (
          <div className="pli-device-meta">
            {petName ? <span>关联宠物：{petName}</span> : null}
            {last_sync ? <span>最近同步：{formatDateTime(last_sync)}</span> : null}
            {dataQuality ? <span>数据质量：{dataQuality}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
