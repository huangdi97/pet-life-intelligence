"use client";

import Link from "next/link";
import { Icon } from "../../../components/icons";

export interface TodayAttentionState {
  kind: "danger" | "attention" | "calm" | "unknown";
  body: string;
  footer?: string;
}

/** OWN-001 Attention — one factual safety/attention state.
 * Baseline change belongs to ChangeCard; this block is reserved for health
 * evidence and deterministic risk handling so ordinary variance is never
 * presented with medical-warning semantics. */
export function AttentionCard({ state }: { state: TodayAttentionState }) {
  const isCalm = state.kind === "calm" || state.kind === "unknown";
  return (
    <section className="v4-sec" data-testid="pli.attention.panel" data-pli-type="section">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title">值得注意</h2>
      </div>
      {isCalm ? (
        <div className="v4-calm" data-testid="pli.today.health-summary">
          <span className="v4-calm-icon">
            <Icon name={state.kind === "calm" ? "check" : "clock"} size={18} />
          </span>
          <div>
            <p className="v4-calm-title">
              {state.kind === "calm" ? "当前没有健康事项被规则标记为需要立即关注" : "健康关注状态暂时无法确认"}
            </p>
            <p className="v4-calm-body" data-testid="pli.attention.evidence">{state.body}</p>
            {state.footer ? <p className="v4-calm-body" style={{ marginTop: 4 }}>{state.footer}</p> : null}
          </div>
        </div>
      ) : (
        <div className={`v4-attn${state.kind === "danger" ? " v4-attn--danger" : ""}`} data-testid="pli.today.health-summary">
          <span className="v4-attn-icon">
            <Icon name="alert" size={18} />
          </span>
          <div>
            <p className="v4-attn-title">
              {state.kind === "danger" ? "有一条健康记录需要尽快处理" : "有一条健康记录值得查看"}
            </p>
            <p className="v4-attn-body" data-testid="pli.attention.evidence">{state.body}</p>
            {state.footer ? <p className="v4-attn-body" style={{ marginTop: 4 }}>{state.footer}</p> : null}
            <div className="v4-attn-actions">
              <Link
                href="/health"
                className="v4-action v4-action--soft"
                style={{ minHeight: 32, padding: "6px 12px", fontSize: 13 }}
                data-testid="pli.attention.action"
              >
                查看健康记录
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
