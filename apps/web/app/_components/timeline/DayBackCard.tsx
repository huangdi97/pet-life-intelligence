"use client";

import { Icon } from "../../../components/icons";
import type { VisualModelRow } from "./constants";

interface DayBackCardProps {
  day: string;
  models: VisualModelRow[];
}

/** OWN-003 回到那一天：只展示当日真实记录，绝不用当前 3D 形象/照片冒充历史外观。 */
export function DayBackCard({ day, models }: DayBackCardProps) {
  const dayStart = new Date(`${day}T00:00:00+08:00`).getTime();
  const dayEnd = new Date(`${day}T23:59:59.999+08:00`).getTime();
  const onDay = models
    .filter((m) => {
      if (!m.activated_at) return false;
      const activated = new Date(m.activated_at).getTime();
      const retired = m.retired_at ? new Date(m.retired_at).getTime() : Number.POSITIVE_INFINITY;
      return Number.isFinite(activated) && activated <= dayEnd && retired >= dayStart;
    })
    .sort((a, b) => (b.activated_at ?? "").localeCompare(a.activated_at ?? ""));
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
      {onDay.length > 0 ? (
        <p className="v4-note" style={{ marginTop: 8 }} data-testid="pli.timeline.dayback-model">
          当天有效的 3D 形象：第 {onDay[0].version} 版 · 激活于 {new Date(onDay[0].activated_at as string).toLocaleDateString("zh-CN")}。
          {onDay.length > 1 ? ` 当天存在 ${onDay.length} 个有效区间交叠版本，按最近激活版本展示。` : ""}
        </p>
      ) : (
        <p className="v4-note" style={{ marginTop: 8 }} data-testid="pli.timeline.dayback-model">
          当天没有可确认的 3D 版本；不会用现在的 3D 形象补画过去。
        </p>
      )}
    </div>
  );
}
