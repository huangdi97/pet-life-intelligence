"use client";

import type { Pet } from "@pli/api-client";

interface RecordInteractionPanelProps {
  pets: Pet[] | null;
  petId: string | null;
  friendPetId: string;
  onFriendChange: (v: string) => void;
  quality: string;
  onQualityChange: (v: string) => void;
  duration: string;
  onDurationChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  busy: boolean;
  onRecord: () => void;
}

/** OWN-012 Social — 记录互动表单（质量/时长/备注 + 安全说明）。 */
export function RecordInteractionPanel({
  pets,
  petId,
  friendPetId,
  onFriendChange,
  quality,
  onQualityChange,
  duration,
  onDurationChange,
  notes,
  onNotesChange,
  busy,
  onRecord,
}: RecordInteractionPanelProps) {
  return (
    <section className="v5-form-surface">
      <h2>补充一次互动</h2>
      <p className="v4-note" style={{ marginTop: -4 }}>已有关系与互动历史优先展示；需要时再补充这次真实发生的互动。</p>
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        <select
          value={friendPetId}
          onChange={(e) => onFriendChange(e.target.value)}
          aria-label="伙伴宠物"
          style={{ maxWidth: 200 }}
        >
          <option value="">选择伙伴…</option>
          {pets
            ?.filter((p) => p.id !== petId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <select value={quality} onChange={(e) => onQualityChange(e.target.value)} aria-label="互动质量" style={{ maxWidth: 140 }}>
          <option value="GOOD">顺利</option>
          <option value="NEUTRAL">平静</option>
          <option value="TENSE">紧张</option>
          <option value="BAD">冲突</option>
          <option value="UNKNOWN">未知</option>
        </select>
        <input
          type="number"
          min={0}
          value={duration}
          onChange={(e) => onDurationChange(e.target.value)}
          aria-label="时长（分钟）"
          style={{ width: 110 }}
        />
        <input
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="发生了什么（可选）"
          aria-label="备注"
          style={{ flex: 1, minWidth: 160 }}
        />
        <button className="btn primary" disabled={busy || !friendPetId} onClick={onRecord}>
          记录互动
        </button>
      </div>
      <p className="muted">如果记录为紧张或冲突，只会用于双方宠物的照护与安全回顾，不会公开展示。</p>
    </section>
  );
}
