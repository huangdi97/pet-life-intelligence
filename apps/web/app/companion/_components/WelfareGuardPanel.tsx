"use client";

import { t } from "../../../lib/i18n";

const GUARD_ITEMS = [
  "刚结束休息，可短时互动",
  "互动间隔 ≥30 分钟",
  "每日零食上限 3 次",
  "单次 ≤15 分钟",
  "音量已限制",
  "夜间静默模式（22:00-07:00）",
];

interface WelfareGuardPanelProps {
  nightQuiet: boolean;
}

/** OWN-014 Companion — Interaction Welfare Guard：频率/时长/零食/休息边界。 */
export function WelfareGuardPanel({ nightQuiet }: WelfareGuardPanelProps) {
  return (
    <div className="card">
      <h2>{t("companion.welfareGuard")}</h2>
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        {GUARD_ITEMS.map((g) => (
          <span key={g} className="badge">
            {g}
          </span>
        ))}
      </div>
      <p className="sub" style={{ marginTop: 8 }}>
        {t("companion.suggestion")}：
        {nightQuiet ? "夜间静默模式中，仅观察" : "刚结束休息，可短时互动"}
      </p>
    </div>
  );
}
