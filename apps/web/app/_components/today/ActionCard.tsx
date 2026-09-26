"use client";

import type { WebIconName } from "../../../components/icons";
import { Icon } from "../../../components/icons";
import type { QuickLogItem } from "./constants";

interface ActionCardProps {
  quickTypes: QuickLogItem[];
  onQuickLog: (q: QuickLogItem) => void;
  onMore: () => void;
}

const QUICK_ICONS: Record<string, WebIconName> = {
  "daily.meal": "food",
  "daily.drink": "water",
  "daily.elimination": "toilet",
  "daily.walk": "walk",
  "daily.play": "play",
  "daily.weight": "weight",
};

/** OWN-001 Action — 下一步能做什么（快速记录按钮保留 E2E 契约：喂食等）。 */
export function ActionCard({ quickTypes, onQuickLog, onMore }: ActionCardProps) {
  return (
    <div className="v4-sec">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title">快速记录</h2>
        <button type="button" className="v4-sec-link" onClick={onMore} aria-haspopup="dialog">
          更多记录类型
        </button>
      </div>
      <div className="v4-quick">
        {quickTypes.map((q) => (
          <button key={q.type} type="button" onClick={() => onQuickLog(q)}>
            <span className="v4-quick-icon">
              <Icon name={QUICK_ICONS[q.type] ?? "note"} size={22} />
            </span>
            {q.label}
          </button>
        ))}
      </div>
      <p className="v4-sec-foot">每条记录都会保存记录人与来源，方便之后追溯。</p>
    </div>
  );
}
