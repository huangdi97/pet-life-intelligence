"use client";

import type { VetBriefContent } from "@pli/api-client";
import { fmtTime } from "../../../lib/hooks";

interface VetBriefCardProps {
  brief: { id: string; content: VetBriefContent } | null;
  share: { token: string; expires_at: string } | null;
  briefCount: number;
  hasBriefs: boolean;
  onMakeBrief: () => void;
  onShareBrief: (briefId: string) => void;
}

/** OWN-005 Vet Brief（就诊前摘要）：信息整理，不是兽医诊断；只读分享链接 72 小时可撤销。 */
export function VetBriefCard({
  brief,
  share,
  briefCount,
  hasBriefs,
  onMakeBrief,
  onShareBrief,
}: VetBriefCardProps) {
  return (
    <div className="card">
      <h2>Vet Brief（就诊前摘要）</h2>
      <p className="muted">信息整理，不是兽医诊断。可生成只读分享链接（72 小时有效，可撤销，访问留审计）。</p>
      <button className="btn primary" onClick={onMakeBrief}>
        生成 Vet Brief
      </button>
      {hasBriefs && (
        <p className="muted">已有 {briefCount} 份摘要。</p>
      )}
      {brief && (
        <div style={{ marginTop: 10 }}>
          <h3>摘要预览</h3>
          <p>{brief.content.ai_narrative_draft}</p>
          <p className="muted">
            引擎：规则 {brief.content.engine_versions.rule_engine || "—"} · AI{" "}
            {brief.content.engine_versions.ai_model}
          </p>
          <div className="notice-ai">{brief.content.ai_disclaimer}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn" onClick={() => onShareBrief(brief.id)}>
              生成分享链接
            </button>
          </div>
          {share && (
            <div className="alert info">
              分享链接：{`/api/v1/vet-briefs/shared/${share.token}`}（至 {fmtTime(share.expires_at)}）
            </div>
          )}
        </div>
      )}
    </div>
  );
}
