"use client";

import type { Observation } from "@pli/api-client";
import { EvidenceList } from "@pli/ui-kit";

interface ObservationCardProps {
  obsText: string;
  setObsText: (v: string) => void;
  onAdd: () => void;
  observations: Observation[];
}

/** OWN-005 可观察事实（严格分来源）：主人陈述 → AI 提取可观察事实，标注“主人报告：”。 */
export function ObservationCard({ obsText, setObsText, onAdd, observations }: ObservationCardProps) {
  return (
    <div className="card">
      <h2>可观察事实（严格分来源）</h2>
      <div className="row">
        <input
          style={{ maxWidth: 420 }}
          value={obsText}
          onChange={(e) => setObsText(e.target.value)}
          placeholder="补充一段主人陈述，AI 会提取可观察事实"
        />
        <button className="btn" onClick={onAdd}>
          添加并提取
        </button>
      </div>
      <div style={{ marginTop: 10 }}>
        <EvidenceList
          items={observations.map((o) => ({
            id: o.id,
            kind: o.kind,
            text: o.text,
            created_at: o.created_at,
          }))}
          emptyText="还没有可观察事实。"
        />
      </div>
      <p className="notice-ai">
        AI 仅整理主人陈述并标注“主人报告：”，不做诊断、不生成结论；规则结论与兽医确认单独标记。
      </p>
    </div>
  );
}
