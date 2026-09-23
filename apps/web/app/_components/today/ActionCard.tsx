"use client";

import type { QuickLogItem } from "./constants";

interface ActionCardProps {
  quickTypes: QuickLogItem[];
  onQuickLog: (q: QuickLogItem) => void;
  onMore: () => void;
}

/** OWN-001 Action — 下一步能做什么（直接快速记录按钮保留 E2E 契约）。 */
export function ActionCard({ quickTypes, onQuickLog, onMore }: ActionCardProps) {
  return (
    <div className="card">
      <h2>下一步</h2>
      <div className="quickgrid">
        {quickTypes.map((q) => (
          <button key={q.type} className="btn" onClick={() => onQuickLog(q)}>
            {q.label}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn" onClick={onMore} aria-haspopup="dialog">
          更多记录类型 ▾
        </button>
      </div>
      <p className="muted">所有记录都会带来源（provenance）与记录人（actor）进入事件图。</p>
    </div>
  );
}
