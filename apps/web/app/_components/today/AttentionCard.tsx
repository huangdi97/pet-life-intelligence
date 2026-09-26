"use client";

import Link from "next/link";
import { Icon } from "../../../components/icons";

interface AttentionCardProps {
  hints: Array<Record<string, string>>;
}

/** OWN-001 Attention — 一屏一个 Attention 或 Calm 状态（Stage R.2 §24）。
 *  普通数据不用红色；只有 deterministic safety rule 才使用强 danger 视觉。 */
export function AttentionCard({ hints }: AttentionCardProps) {
  const visible = hints.slice(0, 2);
  return (
    <div className="v4-sec">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title">值得注意</h2>
      </div>
      {visible.length > 0 ? (
        visible.map((h, i) => {
          const msg = h.message || h.hint || h.detail || "今天有 1 件事值得关注";
          return (
            <div key={i} className="v4-attn" style={i > 0 ? { marginTop: 10 } : undefined}>
              <span className="v4-attn-icon">
                <Icon name="alert" size={18} />
              </span>
              <div>
                <p className="v4-attn-title">今天有值得关注的变化</p>
                <p className="v4-attn-body">{msg}</p>
                <div className="v4-attn-actions">
                  <Link
                    href={`/agent?tab=explain&ctx=${encodeURIComponent("今日值得关注的事项")}`}
                    className="v4-action v4-action--soft"
                    style={{ minHeight: 32, padding: "6px 12px", fontSize: 13 }}
                  >
                    查看依据
                  </Link>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="v4-calm">
          <span className="v4-calm-icon">
            <Icon name="check" size={18} />
          </span>
          <div>
            <p className="v4-calm-title">目前没有需要特别关注的变化</p>
            <p className="v4-calm-body">有新记录或变化时会在这里提醒你。</p>
          </div>
        </div>
      )}
    </div>
  );
}
