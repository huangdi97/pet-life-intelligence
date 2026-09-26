"use client";

import { Icon } from "../../../components/icons";
import type { VisualModelRow } from "./constants";

interface DayBackCardProps {
  day: string;
  models: VisualModelRow[];
}

/** OWN-003 回到那一天：只展示当日真实记录，绝不用当前 3D 形象/照片冒充历史外观。 */
export function DayBackCard({ day, models }: DayBackCardProps) {
  const onDay = models.filter((m) => m.activated_at && m.activated_at.slice(0, 10) === day);
  return (
    <div className="v4-sec">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title">
          回到那一天 · {day}
        </h2>
        <span className="v4-chip">
          <span className="v4-chip-icon">
            <Icon name="calendar" size={13} />
          </span>
          只展示当日记录
        </span>
      </div>
      <p className="v4-sec-sub">这里只展示 {day} 的真实照片、视频、事件与观察；不会用现在的样子冒充过去的它。</p>
      {onDay.length > 0 && (
        <p className="v4-note" style={{ marginTop: 8 }}>
          当天有 {onDay.length} 个已确认的 3D 形象版本。
        </p>
      )}
    </div>
  );
}
