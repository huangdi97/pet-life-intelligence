"use client";

import type { VisualModelRow } from "./constants";

interface DayBackCardProps {
  day: string;
  models: VisualModelRow[];
}

/** OWN-003 回到那一天：只展示当日真实记录，不用当前 3D 形象伪装过去的真实外观。 */
export function DayBackCard({ day, models }: DayBackCardProps) {
  return (
    <div className="card">
      <h2>回到那一天 · {day}</h2>
      <p className="sub" style={{ margin: 0 }}>
        这里只展示 {day} 的真实照片/视频/事件/观察；不会用当前 3D 形象伪装过去的真实外观。
      </p>
      {(() => {
        const onDay = models.filter((m) => m.activated_at && m.activated_at.slice(0, 10) === day);
        return onDay.length > 0 ? (
          <p className="muted" style={{ marginTop: 6 }}>
            当日激活的 3D 形象版本：{onDay.map((m) => `v${m.version}（${m.provenance_kind}）`).join("、")}
          </p>
        ) : (
          <p className="muted" style={{ marginTop: 6 }}>
            当天没有激活的 3D 形象版本。
          </p>
        );
      })()}
    </div>
  );
}
